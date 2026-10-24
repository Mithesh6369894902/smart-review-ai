import { Capacitor } from '@capacitor/core';
import * as offline from './offlineEngine';
import { CLOUD_API_URL, SERVER_TIMEOUT_MS } from './appConfig';

export const BUILTIN_HOST = 'builtin://offline';
const DEV_HOSTS = ['localhost', '127.0.0.1'];

let serverReachable = null; // null = unknown, true = online, false = offline
let lastHealthCheckTime = 0;
const HEALTH_CACHE_TTL = 15000; // 15s cache for health status to prevent delay on every click

// ?api=https://your-backend.onrender.com → saved automatically (easy phone setup)
function queryOverride() {
  try {
    const u = new URL(window.location.href);
    const api = (u.searchParams.get('api') || '').trim().replace(/\/$/, '');
    if (api && /^https?:\/\//.test(api)) {
      localStorage.setItem('api_host', api);
      u.searchParams.delete('api');
      window.history.replaceState(null, '', u.toString());
      return api;
    }
  } catch { /* ignore */ }
  return null;
}

export function getEngineMode() {
  const stored = localStorage.getItem('api_host');
  if (stored === BUILTIN_HOST || stored === 'offline' || stored === 'builtin') {
    return 'builtin';
  }
  return 'auto';
}

export function setEngineMode(mode) {
  if (mode === 'builtin') {
    localStorage.setItem('api_host', BUILTIN_HOST);
    serverReachable = false;
  } else {
    localStorage.removeItem('api_host');
    serverReachable = null;
    lastHealthCheckTime = 0;
  }
}

// Priority: ?api= override > Settings choice > cloud default (or localhost backend on dev PCs)
export function getApiHost() {
  const override = queryOverride();
  if (override) return override;
  const stored = localStorage.getItem('api_host');
  if (stored) {
    if (stored === BUILTIN_HOST || stored === 'offline' || stored === 'builtin') return null;
    if (/localhost|127\.0\.0\.1/.test(stored) && Capacitor.isNativePlatform()) {
      return CLOUD_API_URL.replace(/\/$/, '');
    }
    return stored.replace(/\/$/, '');
  }
  const onDevPage = typeof window !== 'undefined' && DEV_HOSTS.includes(window.location.hostname);
  if (onDevPage) return 'http://localhost:8000';
  return CLOUD_API_URL.replace(/\/$/, '');
}

export function isOfflineMode() {
  return getApiHost() === null;
}

export function resetToDefault() {
  localStorage.removeItem('api_host');
  serverReachable = null;
  lastHealthCheckTime = 0;
}

export function defaultServerUrlForSettings() {
  return localStorage.getItem('api_host') || CLOUD_API_URL;
}

async function fetchTimeout(url, options = {}, ms = 2000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function checkHealth(force = false) {
  const host = getApiHost();
  if (!host) {
    serverReachable = false;
    return { ok: true, offline: true, data: { status: 'healthy', version: '2.0', engine: 'Built-in On-Device Engine', mode: 'builtin' } };
  }

  const now = Date.now();
  if (!force && serverReachable !== null && (now - lastHealthCheckTime < HEALTH_CACHE_TTL)) {
    return { ok: serverReachable, offline: !serverReachable, cached: true };
  }

  const start = performance.now();
  try {
    const res = await fetchTimeout(`${host}/health`, {}, 2000);
    const latency = Math.round(performance.now() - start);
    if (!res.ok) {
      serverReachable = false;
      lastHealthCheckTime = now;
      return { ok: false, offline: true, latency };
    }
    const data = await res.json();
    serverReachable = true;
    lastHealthCheckTime = now;
    return { ok: true, offline: false, latency, data };
  } catch {
    serverReachable = false;
    lastHealthCheckTime = now;
    return { ok: false, offline: true };
  }
}

async function remoteJson(path, options, timeoutMs = 3000) {
  const host = getApiHost();
  const res = await fetchTimeout(`${host}${path}`, options, timeoutMs);
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      detail = err.detail || JSON.stringify(err);
    } catch { /* keep default */ }
    const e = new Error(detail);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

// Wraps a remote call with fast fallback.
// If server is known to be offline or unreachable, immediately executes offline without freezing!
async function withFallback(remoteFn, offlineFn) {
  const host = getApiHost();
  if (!host) {
    return offlineFn();
  }

  // If recently known to be offline, fallback immediately without waiting
  const now = Date.now();
  if (serverReachable === false && (now - lastHealthCheckTime < HEALTH_CACHE_TTL)) {
    const fb = offlineFn();
    return { ...fb, fallback: true, offlineEngine: true };
  }

  try {
    const result = await remoteFn(host);
    serverReachable = true;
    lastHealthCheckTime = now;
    return result;
  } catch (e) {
    serverReachable = false;
    lastHealthCheckTime = now;
    const isNetworkOrServerDown = !e || e.name === 'AbortError' || e.status === undefined ||
      e.status === 404 || e.status >= 500 ||
      (typeof e.message === 'string' && (e.message.includes('fetch') || e.message.includes('NetworkError') || e.message.includes('Failed')));
    if (isNetworkOrServerDown) {
      const fb = offlineFn();
      return { ...fb, fallback: true, offlineEngine: true };
    }
    throw e;
  }
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toCsv(rows) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['id', 'text', 'product_name', 'sentiment', 'confidence', 'polarity', 'rating', 'stars', 'tier', 'emotion', 'grade', 'score', 'priority', 'timestamp'];
  const lines = [header.join(',')];
  rows.forEach(r => lines.push([
    r.id, r.text, r.product_name,
    r.sentiment?.sentiment, r.sentiment?.confidence, r.sentiment?.polarity,
    r.rating?.rating, r.rating?.stars, r.rating?.tier,
    r.emotion?.primary_emotion, r.overall_score?.grade, r.overall_score?.score,
    r.suggestions?.priority,
    r.timestamp || r.created_at,
  ].map(esc).join(',')));
  return lines.join('\n');
}

export async function analyzeReview(body) {
  return withFallback(
    () => remoteJson('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, 4000),
    () => ({ status: 'success', data: offline.analyzeOne(body.text, body.product_name) }),
  );
}

export async function analyzeBatch(body) {
  return withFallback(
    () => remoteJson('/api/analyze/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, 6000),
    () => ({ status: 'success', data: offline.analyzeBatch(body.reviews, body.product_name) }),
  );
}

export async function fetchHistory(limit = 50) {
  return withFallback(
    () => remoteJson(`/api/history?limit=${limit}`, {}, 2000),
    () => ({ status: 'success', data: offline.getHistory(limit) }),
  );
}

export async function fetchStats() {
  return withFallback(
    () => remoteJson('/api/stats', {}, 2000),
    () => ({ status: 'success', data: offline.getStats() }),
  );
}

export async function deleteHistory() {
  const host = getApiHost();
  offline.clearHistoryStore();
  if (!host) {
    return { status: 'success' };
  }
  try {
    return await remoteJson('/api/history', { method: 'DELETE' }, 2000);
  } catch {
    return { status: 'success', fallback: true };
  }
}

export async function exportData(format = 'csv') {
  const exportOffline = () => {
    const rows = offline.getHistory(200);
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      downloadFile(`smartreview-analyses-${stamp}.csv`, toCsv(rows), 'text/csv');
    } else if (format === 'json') {
      downloadFile(`smartreview-analyses-${stamp}.json`, JSON.stringify({ export_date: new Date().toISOString(), total_analyses: rows.length, analyses: rows }, null, 2), 'application/json');
    } else {
      const lines = [
        '============================================================',
        'SMARTREVIEW AI - CUSTOMER INTELLIGENCE REPORT',
        '============================================================',
        `Generated: ${new Date().toUTCString()}`,
        `Total Reviews: ${rows.length}`,
        '',
        'ANALYSES BREAKDOWN',
        '------------------------------------------------------------'
      ];
      rows.forEach((r, i) => {
        lines.push(`\n${i + 1}. [${(r.sentiment?.sentiment || 'N/A').toUpperCase()} - ${r.sentiment?.polarity || ''}]`);
        lines.push(`   Review: "${String(r.text)}"`);
        if (r.product_name) lines.push(`   Product: ${r.product_name}`);
        lines.push(`   Rating: ${r.rating?.stars ? '★'.repeat(r.rating.stars) : ''} (${r.rating?.rating ?? 'N/A'}/5.0 - ${r.rating?.tier || ''})`);
        lines.push(`   Confidence: ${r.sentiment?.confidence ?? 'N/A'}% | Emotion: ${r.emotion?.primary_emotion ?? 'N/A'} | Grade: ${r.overall_score?.grade ?? '—'} (${r.overall_score?.score ?? '—'}/100)`);
        if (r.summary?.summary) lines.push(`   Summary: ${r.summary.summary}`);
        if (r.suggestions?.suggestions?.length) {
          lines.push(`   Priority: ${r.suggestions.priority || 'Medium'} | Recommendations:`);
          r.suggestions.suggestions.slice(0, 3).forEach(s => lines.push(`     • ${s}`));
        }
      });
      lines.push('\n============================================================\nEND OF REPORT\n');
      downloadFile(`smartreview-report-${stamp}.txt`, lines.join('\n'), 'text/plain');
    }
    return { status: 'success', offline: true };
  };

  const host = getApiHost();
  if (!host) return exportOffline();

  try {
    const res = await fetchTimeout(`${host}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, limit: 200 }),
    }, 3000);
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = format === 'json' ? 'json' : format === 'report' ? 'txt' : 'csv';
    a.download = `smartreview-export.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { status: 'success', offline: false };
  } catch {
    return exportOffline();
  }
}
