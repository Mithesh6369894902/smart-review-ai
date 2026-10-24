// On-device AI engine — TypeScript port of web/src/offlineEngine.js
// Used automatically when the cloud server is unreachable, and when
// the user selects on-device mode. Same behaviour as the web app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AnalysisResult, EmotionResult, RatingResult, Stats,
  SuggestionResult, SummaryResult,
} from '../types';

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them', 'their',
  'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'a', 'an', 'the', 'and', 'but', 'if', 'or',
  'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'to', 'from',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'don', 'should', 'now',
]);

const POSITIVE_WORDS = [
  'amazing', 'love', 'loved', 'excellent', 'perfect', 'great', 'outstanding', 'fantastic',
  'wonderful', 'recommend', 'recommended', 'satisfied', 'happy', 'impressed', 'best',
  'superb', 'brilliant', 'delighted', 'thrilled', 'awesome', 'incredible',
  'beautiful', 'premium', 'flawless', 'exceeded', 'worth', 'five', 'stars', 'gem',
  'masterpiece', 'pleased', 'stunning', 'winner', 'gold',
];

const NEGATIVE_WORDS = [
  'terrible', 'awful', 'hate', 'hated', 'worst', 'disappointed', 'broken', 'waste', 'scam',
  'horrible', 'garbage', 'junk', 'refund', 'poor', 'cheap', 'flimsy', 'defective', 'regret',
  'useless', 'disgusting', 'ripoff', 'nightmare', 'unacceptable', 'damaged', 'frustrated',
  'angry', 'livid', 'dreadful', 'abysmal', 'horrendous', 'embarrassment', 'cheated',
];

const NEUTRAL_WORDS = [
  'okay', 'average', 'mediocre', 'decent', 'fine', 'standard', 'acceptable', 'alright',
  'satisfactory', 'ordinary', 'passable', 'adequate', 'unremarkable', 'functional',
  'nothing', 'special', 'middle', 'neither',
];

const EMOTION_LEXICON: Record<string, { words: string[]; intensifiers: string[] }> = {
  happy: { words: ['happy', 'love', 'great', 'amazing', 'wonderful', 'fantastic', 'excellent', 'awesome', 'perfect', 'beautiful', 'delighted', 'pleased', 'thrilled', 'excited', 'grateful', 'satisfied', 'impressed', 'outstanding', 'brilliant', 'superb'], intensifiers: ['very', 'extremely', 'incredibly', 'absolutely', 'really'] },
  sad: { words: ['sad', 'unhappy', 'disappointed', 'depressed', 'upset', 'regret', 'miss', 'hurt', 'pain', 'suffering'], intensifiers: ['very', 'extremely', 'so', 'really', 'deeply'] },
  angry: { words: ['angry', 'furious', 'hate', 'disgusted', 'frustrated', 'annoyed', 'irritated', 'mad', 'livid', 'infuriated'], intensifiers: ['so', 'extremely', 'absolutely', 'totally'] },
  surprised: { words: ['surprised', 'shocked', 'amazed', 'astonished', 'stunned', 'unbelievable', 'incredible', 'wow', 'unreal', 'remarkable'], intensifiers: ['absolutely', 'completely', 'utterly'] },
  fearful: { words: ['afraid', 'scared', 'terrified', 'worried', 'anxious', 'nervous', 'panic', 'dread', 'frightened', 'concerned'], intensifiers: ['very', 'extremely', 'really'] },
  disgusted: { words: ['disgusting', 'gross', 'revolting', 'vile', 'nasty', 'horrible', 'awful', 'terrible', 'repulsive', 'sickening', 'junk', 'garbage', 'ripoff', 'scam', 'waste'], intensifiers: ['absolutely', 'completely', 'utterly', 'totally'] },
};

const TOPIC_KW: Record<string, string[]> = {
  quality: ['quality', 'material', 'build', 'durable', 'flimsy', 'cheap', 'premium'],
  price: ['price', 'cost', 'expensive', 'cheap', 'value', 'money', 'worth'],
  shipping: ['shipping', 'delivery', 'arrived', 'package', 'fast', 'slow', 'damaged'],
  service: ['service', 'support', 'customer', 'help', 'response'],
  design: ['design', 'look', 'style', 'beautiful', 'ugly'],
  feature: ['feature', 'function', 'works', 'easy', 'difficult', 'interface'],
};

const SUGGESTIONS: Record<string, Record<string, string[]>> = {
  quality: { negative: ['Use higher-grade materials', 'Implement stricter quality control', 'Offer warranty for confidence'], positive: ['Maintain current quality', 'Highlight quality in marketing'] },
  price: { negative: ['Review pricing strategy', 'Offer bundle deals', 'Improve perceived value'], positive: ['Price point is well-received'] },
  shipping: { negative: ['Partner with faster shipping providers', 'Improve packaging', 'Offer tracking updates'], positive: ['Maintain shipping standards'] },
  service: { negative: ['Train customer service team', 'Implement 24/7 chat support', 'Offer hassle-free returns'], positive: ['Maintain excellent service'] },
  design: { negative: ['Conduct user research for improvements', 'A/B test design variations'], positive: ['Design is well-received'] },
  feature: { negative: ['Prioritize most requested features', 'Improve user documentation'], positive: ['Feature set meets needs'] },
};

const SENT_W: Record<string, number> = { positive: 1.0, neutral: 0.5, negative: 0.0 };
const EMO_W: Record<string, number> = { happy: 1.0, surprised: 0.8, neutral: 0.5, sad: 0.2, angry: 0.0, fearful: 0.1, disgusted: 0.0 };

export const HISTORY_KEY = 'sra_history';

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) || [];
}

function preprocess(text: string): string {
  return tokenize(text).filter(w => w && !STOP_WORDS.has(w) && w.length > 2).join(' ');
}

function countWords(text: string, words: string[]): number {
  const tokens = new Set(tokenize(text));
  let count = 0;
  for (const w of words) if (tokens.has(w)) count += 1;
  return count;
}

const NEGATIONS = ['not', 'no', 'never', "don't", "doesn't", "didn't", "won't", "can't", "isn't", "aren't", "wasn't"];

function hasNegation(text: string): boolean {
  const tokens = tokenize(text);
  return tokens.some(n => NEGATIONS.includes(n));
}

export interface SentimentOut { sentiment: string; confidence: number; probabilities: Record<string, number>; model_accuracy: number }

export function predictSentiment(text: string): SentimentOut {
  const lower = text.toLowerCase();
  let pos = countWords(lower, POSITIVE_WORDS);
  let neg = countWords(lower, NEGATIVE_WORDS);
  const neu = countWords(lower, NEUTRAL_WORDS);
  if (hasNegation(text)) {
    const swap = Math.min(pos, 1);
    pos = Math.max(0, pos - swap);
    neg += swap * 0.5;
  }
  const total = pos + neg + neu || 1;
  let sentiment = 'neutral';
  if (pos > neg && pos >= neu) sentiment = 'positive';
  else if (neg > pos && neg >= neu) sentiment = 'negative';
  const probabilities = {
    positive: Math.round(((pos / total)) * 10000) / 100,
    negative: Math.round(((neg / total)) * 10000) / 100,
    neutral: Math.round(((neu / total)) * 10000) / 100,
  };
  const confidence = Math.round(Math.max(probabilities.positive, probabilities.negative, probabilities.neutral) * 100) / 100;
  return { sentiment, confidence: Math.min(99, Math.max(55, confidence)), probabilities, model_accuracy: 88.5 };
}

export function detectEmotion(text: string): EmotionResult {
  const textLower = text.toLowerCase();
  const tokens = new Set(tokenize(textLower));
  const scores: Record<string, number> = {};
  for (const [emo, data] of Object.entries(EMOTION_LEXICON)) {
    scores[emo] = 0;
    for (const w of data.words) {
      if (tokens.has(w)) {
        let base = w.length / 10;
        for (const intw of data.intensifiers) {
          if (textLower.includes(`${intw} ${w}`)) { base *= 1.5; break; }
        }
        scores[emo] += base;
      }
    }
  }
  const neg = hasNegation(text);
  if (!Object.values(scores).some(v => v > 0)) scores[neg ? 'sad' : 'happy'] = 0.3;
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const emotions: Record<string, number> = {};
  for (const [k, v] of sorted) emotions[k] = Math.round((v / total) * 10000) / 100;
  return { primary_emotion: sorted[0]?.[0] || 'neutral', emotions, has_negation: neg };
}

export function predictRating(text: string, sentiment: SentimentOut): RatingResult {
  const base = ({ positive: 4.3, neutral: 3.0, negative: 1.7 } as Record<string, number>)[sentiment.sentiment] ?? 3;
  const boost = (sentiment.probabilities.positive - sentiment.probabilities.negative) / 100;
  const exclamation = (text.match(/!/g) || []).length * 0.05;
  const rating = Math.max(1, Math.min(5, base + boost * 1.2 + exclamation));
  const stars = Math.round(rating);
  return { rating: Math.round(rating * 100) / 100, stars, star_display: '★'.repeat(stars) + '☆'.repeat(5 - stars) };
}

export function summarize(text: string, n = 3): SummaryResult {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  if (sentences.length <= n) {
    return { summary: text, original_length: text.length, summary_length: text.length, compression_ratio: 100, key_sentences: sentences };
  }
  const processed = sentences.map(preprocess);
  const df: Record<string, number> = {};
  processed.forEach(p => p.split(' ').forEach(w => { if (w) df[w] = (df[w] || 0) + 1; }));
  const scores = sentences.map((_, i) => {
    const words = processed[i].split(' ').filter(Boolean);
    const tfidf = words.reduce((acc, w) => acc + (words.length / (df[w] || 1)), 0);
    return tfidf * (1 - (i / sentences.length) * 0.5);
  });
  const topIdx = [...scores.keys()].sort((a, b) => scores[b] - scores[a]).slice(0, n).sort((a, b) => a - b);
  const key = topIdx.map(i => sentences[i]);
  const summary = `${key.join('. ')}.`;
  return {
    summary, original_length: text.length, summary_length: summary.length,
    compression_ratio: Math.round((summary.length / Math.max(text.length, 1)) * 10000) / 100,
    key_sentences: key,
  };
}

export function extractKeywords(text: string, topN = 8): string[] {
  const freq: Record<string, number> = {};
  preprocess(text).split(' ').filter(Boolean).forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([w]) => w);
}

export function getSuggestions(text: string, sentiment: string): SuggestionResult {
  const tokens = new Set(tokenize(text));
  const topics = Object.entries(TOPIC_KW).filter(([, kws]) => kws.some(k => tokens.has(k))).map(([t]) => t);
  let suggs: string[] = [];
  for (const t of new Set(topics)) suggs.push(...(SUGGESTIONS[t]?.[sentiment] || []).slice(0, 2));
  if (!suggs.length) {
    const fallback: Record<string, string[]> = {
      negative: ['Gather more customer feedback', 'Implement feedback loop', 'Consider product replacement'],
      positive: ['Encourage satisfied customers to leave reviews', 'Consider referral programs'],
      neutral: ['Gather more feedback', 'Consider product enhancements', 'Monitor review trends'],
    };
    suggs = (fallback[sentiment] || fallback.neutral).slice(0, 3);
  }
  return { suggestions: suggs.slice(0, 5), topics_detected: [...new Set(topics)], keywords: extractKeywords(text), sentiment };
}

export function overallScore(sentiment: SentimentOut, rating: RatingResult, emotion: EmotionResult) {
  const ss = SENT_W[sentiment.sentiment] ?? 0.5;
  const rs = rating.rating / 5;
  const es = EMO_W[emotion.primary_emotion] ?? 0.5;
  const cb = (sentiment.confidence / 100) * 0.1;
  const score = Math.min(100, Math.max(0, (ss * 0.4 + rs * 0.4 + es * 0.2 + cb) * 100));
  let grade = 'F';
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B+';
  else if (score >= 60) grade = 'B';
  else if (score >= 50) grade = 'C+';
  else if (score >= 40) grade = 'C';
  else if (score >= 30) grade = 'D';
  return {
    score: Math.round(score * 100) / 100, grade,
    breakdown: {
      sentiment: Math.round(ss * 10000) / 100, rating: Math.round(rs * 10000) / 100,
      emotion: Math.round(es * 10000) / 100, confidence_bonus: Math.round(cb * 10000) / 100,
    },
  };
}

// ---------- persistent history (AsyncStorage, memory fallback) ----------
let memHistory: AnalysisResult[] = [];
let memLoaded = false;

async function loadHistory(): Promise<AnalysisResult[]> {
  if (memLoaded) return memHistory;
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    memHistory = raw ? JSON.parse(raw) : [];
  } catch {
    memHistory = [];
  }
  memLoaded = true;
  return memHistory;
}

async function saveHistory(items: AnalysisResult[]): Promise<void> {
  memHistory = items;
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch { /* memory-only */ }
}

function buildResult(text: string, productName: string | undefined, id: number): AnalysisResult {
  const sent = predictSentiment(text);
  const emo = detectEmotion(text);
  const rat = predictRating(text, sent);
  const sugg = getSuggestions(text, sent.sentiment);
  const summ = summarize(text);
  const osc = overallScore(sent, rat, emo);
  return {
    id, text, product_name: productName,
    sentiment: {
      sentiment: sent.sentiment as 'positive' | 'negative' | 'neutral',
      confidence: sent.confidence,
      probabilities: {
        positive: sent.probabilities.positive ?? 0,
        neutral: sent.probabilities.neutral ?? 0,
        negative: sent.probabilities.negative ?? 0,
      },
    },
    emotion: emo, rating: rat, suggestions: sugg, summary: summ, overall_score: osc,
    timestamp: new Date().toISOString(),
  };
}

export async function analyzeOne(text: string, productName?: string): Promise<AnalysisResult> {
  const history = await loadHistory();
  const result = buildResult(text, productName, history.length + 1);
  history.push(result);
  await saveHistory(history);
  return result;
}

export interface BatchOut {
  results: AnalysisResult[];
  summary: { total: number; successful: number; failed: number; sentiment_distribution: { positive: number; neutral: number; negative: number }; average_rating: number };
}

export async function analyzeBatch(reviews: string[], productName?: string): Promise<BatchOut> {
  const history = await loadHistory();
  const results = reviews.map(text => {
    const item = buildResult(text, productName, history.length + 1);
    history.push(item);
    return item;
  });
  await saveHistory(history);
  const sentiments = results.map(r => r.sentiment.sentiment);
  const avgR = results.reduce((a, r) => a + r.rating.rating, 0) / Math.max(results.length, 1);
  return {
    results,
    summary: {
      total: results.length, successful: results.length, failed: 0,
      sentiment_distribution: {
        positive: sentiments.filter(s => s === 'positive').length,
        neutral: sentiments.filter(s => s === 'neutral').length,
        negative: sentiments.filter(s => s === 'negative').length,
      },
      average_rating: Math.round(avgR * 100) / 100,
    },
  };
}

export async function getHistory(limit = 50): Promise<AnalysisResult[]> {
  return (await loadHistory()).slice(-limit).reverse();
}

export async function clearHistoryStore(): Promise<void> {
  await saveHistory([]);
}

export async function getStats(): Promise<Stats> {
  const history = await loadHistory();
  if (!history.length) {
    return { total_reviews: 0, sentiment_distribution: { positive: 0, neutral: 0, negative: 0 }, average_rating: 0, average_confidence: 0, recent_trend: 'neutral' };
  }
  const sents = history.map(h => h.sentiment?.sentiment).filter(Boolean) as string[];
  const rats = history.map(h => h.rating?.rating).filter((v): v is number => v != null);
  const confs = history.map(h => h.sentiment?.confidence).filter((v): v is number => v != null);
  const recent = sents.slice(-5);
  const trend = recent.length ? [...new Set(recent)].sort((a, b) => recent.filter(v => v === b).length - recent.filter(v => v === a).length)[0] : 'neutral';
  return {
    total_reviews: history.length,
    sentiment_distribution: {
      positive: sents.filter(s => s === 'positive').length,
      neutral: sents.filter(s => s === 'neutral').length,
      negative: sents.filter(s => s === 'negative').length,
    },
    average_rating: Math.round((rats.reduce((a, b) => a + b, 0) / Math.max(rats.length, 1)) * 100) / 100,
    average_confidence: Math.round((confs.reduce((a, b) => a + b, 0) / Math.max(confs.length, 1)) * 100) / 100,
    recent_trend: trend,
  };
}
