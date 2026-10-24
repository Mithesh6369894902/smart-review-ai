import { AnalysisResult } from '../types';

// Safe accessors — tolerate backend, cloud, offline and legacy shapes.
export const tsOf = (a: any): string =>
  a?.timestamp || a?.created_at || new Date().toISOString();

export const sentOf = (a: any): string => a?.sentiment?.sentiment || 'neutral';

export const confOf = (a: any): number => Number(a?.sentiment?.confidence ?? 0);

export const starsOf = (a: any): string => {
  if (a?.rating?.star_display) return a.rating.star_display;
  const n = Math.round(Number(a?.rating?.stars ?? a?.rating?.rating ?? 0));
  const c = Math.max(0, Math.min(5, n));
  return '★'.repeat(c) + '☆'.repeat(5 - c);
};

export const ratingNum = (a: any): number => Number(a?.rating?.rating ?? 0);

export const emoOf = (a: any): string => a?.emotion?.primary_emotion || 'neutral';

export const gradeOf = (a: any): string => a?.overall_score?.grade || '—';

export const scoreOf = (a: any): number => Number(a?.overall_score?.score ?? 0);

export const fmtDate = (a: any): string => {
  try {
    return new Date(tsOf(a)).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export const sentColor = (s: string): string =>
  s === 'positive' ? '#00E676' : s === 'negative' ? '#FF5252' : '#FFD740';

export const EMOTION_META: Record<string, { emoji: string; color: string }> = {
  happy: { emoji: '😊', color: '#00E676' },
  sad: { emoji: '😢', color: '#42A5F5' },
  angry: { emoji: '😠', color: '#FF5252' },
  surprised: { emoji: '😲', color: '#FFD740' },
  fearful: { emoji: '😨', color: '#AB47BC' },
  disgusted: { emoji: '🤢', color: '#FF7043' },
  neutral: { emoji: '😐', color: '#78909C' },
};

export const isAnalysisResult = (a: any): a is AnalysisResult =>
  !!a && typeof a.text === 'string' && !!a.sentiment && !!a.rating;
