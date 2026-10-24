import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CLOUD_API_URL, SERVER_TIMEOUT_MS } from '../config';
import { AnalysisResult, BatchSummary, Stats } from '../types';
import * as offline from './offlineEngine';

export const BUILTIN_HOST = 'builtin://offline';
const API_HOST_KEY = 'api_host';

export interface ApiResponse<T> {
  status: string;
  data: T;
  fallback?: boolean;
  from_cache?: boolean;
}

export interface BatchData {
  results: AnalysisResult[];
  summary: BatchSummary;
}

// ---------- server URL (Settings can override; default = always-on cloud) ----------
export async function getApiHost(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(API_HOST_KEY);
  if (stored) {
    if (stored === BUILTIN_HOST || stored === 'offline' || stored === 'builtin') return null;
    return stored.replace(/\/$/, '');
  }
  return CLOUD_API_URL.replace(/\/$/, '');
}

export async function setApiHost(url: string | null): Promise<void> {
  if (!url) await AsyncStorage.removeItem(API_HOST_KEY);
  else await AsyncStorage.setItem(API_HOST_KEY, url.replace(/\/$/, ''));
}

export async function resetApiHost(): Promise<void> {
  await AsyncStorage.removeItem(API_HOST_KEY);
}

export async function getStoredHost(): Promise<string> {
  return (await AsyncStorage.getItem(API_HOST_KEY)) || CLOUD_API_URL;
}

export async function isOfflineMode(): Promise<boolean> {
  return (await getApiHost()) === null;
}

// ---------- fetch with timeout ----------
async function fetchTimeout(url: string, options: RequestInit = {}, ms = SERVER_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal } as RequestInit);
  } finally {
    clearTimeout(t);
  }
}

async function remoteJson<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const host = await getApiHost();
  if (!host) throw new Error('Offline mode');
  const res = await fetchTimeout(`${host}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Request failed (${res.status})` }));
    const e: any = new Error(err.detail || `Request failed (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

function isNetworkFailure(e: any): boolean {
  return !!e && (e.name === 'AbortError' || e.status === undefined || /network|fetch|aborted/i.test(e.message || ''));
}

// On NETWORK failure (server asleep / no internet) fall back to on-device
// AI so the app always works. Real API errors still surface.
async function withFallback<T>(remoteFn: () => Promise<ApiResponse<T>>, offlineFn: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
  if (await isOfflineMode()) return offlineFn();
  try {
    return await remoteFn();
  } catch (e: any) {
    if (isNetworkFailure(e)) return { ...(await offlineFn()), fallback: true };
    throw e;
  }
}

// ---------- health (NOTE: /health lives at server root, not /api) ----------
export async function checkHealth(): Promise<{ ok: boolean; offline: boolean; data?: any }> {
  const host = await getApiHost();
  if (!host) {
    return { ok: true, offline: true, data: { status: 'healthy', version: '2.0', mode: 'builtin' } };
  }
  try {
    const res = await fetchTimeout(`${host}/health`);
    if (!res.ok) return { ok: false, offline: false };
    return { ok: true, offline: false, data: await res.json() };
  } catch {
    return { ok: false, offline: false };
  }
}

// ---------- analysis ----------
export async function analyzeReview(text: string, productName?: string): Promise<ApiResponse<AnalysisResult>> {
  return withFallback(
    () => remoteJson<AnalysisResult>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ text, product_name: productName }),
    }),
    async () => ({ status: 'success', data: await offline.analyzeOne(text, productName) }),
  );
}

export async function analyzeBatch(reviews: string[], productName?: string): Promise<ApiResponse<BatchData>> {
  return withFallback(
    () => remoteJson<BatchData>('/api/analyze/batch', {
      method: 'POST',
      body: JSON.stringify({ reviews, product_name: productName }),
    }),
    async () => ({ status: 'success', data: await offline.analyzeBatch(reviews, productName) }),
  );
}

export async function getHistory(limit = 100): Promise<ApiResponse<AnalysisResult[]>> {
  return withFallback(
    () => remoteJson<AnalysisResult[]>(`/api/history?limit=${limit}`),
    async () => ({ status: 'success', data: await offline.getHistory(limit) }),
  );
}

export async function getStats(): Promise<ApiResponse<Stats>> {
  return withFallback(
    () => remoteJson<Stats>('/api/stats'),
    async () => ({ status: 'success', data: await offline.getStats() }),
  );
}

export async function clearHistory(): Promise<ApiResponse<{ message?: string }>> {
  if (await isOfflineMode()) {
    await offline.clearHistoryStore();
    return { status: 'success', data: {} };
  }
  try {
    await remoteJson('/api/history', { method: 'DELETE' });
    await offline.clearHistoryStore();
    return { status: 'success', data: {} };
  } catch (e: any) {
    if (isNetworkFailure(e)) {
      await offline.clearHistoryStore();
      return { status: 'success', data: {}, fallback: true };
    }
    throw e;
  }
}

// ---------- export (downloads / shares a real file) ----------
function toCsv(rows: AnalysisResult[]): string {
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = ['id,text,product_name,sentiment,confidence,rating,stars,emotion,grade,timestamp'];
  rows.forEach(r => lines.push([
    r.id, r.text, r.product_name, r.sentiment?.sentiment, r.sentiment?.confidence,
    r.rating?.rating, r.rating?.stars, r.emotion?.primary_emotion,
    r.overall_score?.grade, (r as any).timestamp || (r as any).created_at,
  ].map(esc).join(',')));
  return lines.join('\n');
}

function toReport(rows: AnalysisResult[]): string {
  const lines = ['SMARTREVIEW AI - ANALYSIS REPORT', `Generated: ${new Date().toUTCString()}`, `Total: ${rows.length}`, ''];
  rows.slice(0, 50).forEach((r, i) => {
    lines.push(`${i + 1}. [${(r.sentiment?.sentiment || 'N/A').toUpperCase()}] ${String(r.text).slice(0, 100)}`);
    lines.push(`   Rating: ${r.rating?.rating ?? 'N/A'}/5 | Confidence: ${r.sentiment?.confidence ?? 'N/A'}% | Emotion: ${r.emotion?.primary_emotion ?? 'N/A'}`);
  });
  return lines.join('\n');
}

export async function exportData(format: 'csv' | 'json' | 'report' = 'csv'): Promise<{ status: string; fileUri?: string; fallback?: boolean }> {
  const host = await getApiHost();
  const stamp = new Date().toISOString().slice(0, 10);
  const ext = format === 'json' ? 'json' : format === 'report' ? 'txt' : 'csv';
  const mime = format === 'json' ? 'application/json' : format === 'report' ? 'text/plain' : 'text/csv';

  let content: string;
  if (host) {
    try {
      const res = await fetchTimeout(`${host}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, limit: 200 }),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      content = await res.text();
    } catch (e: any) {
      if (!isNetworkFailure(e)) throw e;
      const rows = await offline.getHistory(200);
      content = format === 'csv' ? toCsv(rows) : format === 'json'
        ? JSON.stringify({ export_date: new Date().toISOString(), total_analyses: rows.length, analyses: rows }, null, 2)
        : toReport(rows);
    }
  } else {
    const rows = await offline.getHistory(200);
    content = format === 'csv' ? toCsv(rows) : format === 'json'
      ? JSON.stringify({ export_date: new Date().toISOString(), total_analyses: rows.length, analyses: rows }, null, 2)
      : toReport(rows);
  }

  const fileUri = `${FileSystem.documentDirectory}analyses-${stamp}.${ext}`;
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: mime, dialogTitle: `SmartReviewAI ${format.toUpperCase()}` });
  }
  return { status: 'success', fileUri };
}

// ---------- legacy class export (kept for existing imports) ----------
class ApiService {
  analyzeReview = (text: string, productName?: string) => analyzeReview(text, productName);
  analyzeBatch = (reviews: string[], productName?: string) => analyzeBatch(reviews, productName);
  getHistory = (limit = 100) => getHistory(limit);
  getStats = () => getStats();
  clearHistory = () => clearHistory();
  checkHealth = () => checkHealth();
  exportData = (format: 'csv' | 'json' | 'report' = 'csv') => exportData(format);
}

export const api = new ApiService();
