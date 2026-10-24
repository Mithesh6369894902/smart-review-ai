import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BUILTIN_HOST,
  checkHealth,
  analyzeReview,
  analyzeBatch,
  fetchHistory,
  fetchStats,
  deleteHistory,
  exportData,
  resetToDefault,
  defaultServerUrlForSettings,
  isOfflineMode,
  getEngineMode,
  setEngineMode,
} from './apiClient';
import { CLOUD_API_URL, APP_VERSION } from './appConfig';

// Emotion metadata dictionary
const EMOTIONS = {
  happy: { emoji: '😊', color: '#00E676', label: 'Happy' },
  sad: { emoji: '😢', color: '#42A5F5', label: 'Sad' },
  angry: { emoji: '😠', color: '#FF5252', label: 'Angry' },
  surprised: { emoji: '😲', color: '#FFD740', label: 'Surprised' },
  fearful: { emoji: '😨', color: '#AB47BC', label: 'Fearful' },
  disgusted: { emoji: '🤢', color: '#FF7043', label: 'Disgusted' },
  neutral: { emoji: '😐', color: '#90CAF9', label: 'Neutral' },
};

const sentColor = s => s === 'positive' ? '#00E676' : s === 'negative' ? '#FF5252' : '#FFD740';

// Safe accessors for all models (backend + offline + historical shapes)
const tsOf = a => a?.timestamp || a?.created_at || new Date().toISOString();
const sentOf = a => a?.sentiment?.sentiment || 'neutral';
const confOf = a => Number(a?.sentiment?.confidence ?? 0);
const polarityOf = a => a?.sentiment?.polarity || (sentOf(a) === 'positive' ? 'Positive Sentiment' : sentOf(a) === 'negative' ? 'Negative Sentiment' : 'Neutral / Balanced');
const starsOf = a => {
  if (a?.rating?.star_display) return a.rating.star_display;
  const n = Math.round(Number(a?.rating?.stars ?? a?.rating?.rating ?? 0));
  const c = Math.max(1, Math.min(5, n));
  return '★'.repeat(c) + '☆'.repeat(5 - c);
};
const ratingNum = a => Number(a?.rating?.rating ?? 0);
const tierOf = a => a?.rating?.tier || (ratingNum(a) >= 4.5 ? 'Outstanding' : ratingNum(a) >= 3.8 ? 'Good' : ratingNum(a) >= 2.8 ? 'Average' : 'Below Standard');
const satisfactionOf = a => a?.rating?.satisfaction || (ratingNum(a) >= 4.5 ? 'Delighted' : ratingNum(a) >= 3.8 ? 'Satisfied' : ratingNum(a) >= 2.8 ? 'Neutral' : 'Unsatisfied');
const emoOf = a => a?.emotion?.primary_emotion || 'neutral';
const emoDescOf = a => a?.emotion?.description || 'Balanced customer feedback.';
const gradeOf = a => a?.overall_score?.grade || '—';
const scoreOf = a => Number(a?.overall_score?.score ?? 0);
const priorityOf = a => a?.suggestions?.priority || (sentOf(a) === 'negative' ? 'High' : sentOf(a) === 'neutral' ? 'Medium' : 'Low');

const fmtDate = a => {
  try {
    return new Date(tsOf(a)).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '';
  }
};

function Toast({ msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3400);
    return () => clearTimeout(t);
  }, [onClose]);
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

// ============================================================
// DASHBOARD PAGE
// ============================================================
function Dashboard({ onNavigate, analyses, stats, onRefresh, notify }) {
  const [server, setServer] = useState({ status: 'checking', latency: null });
  const [refreshing, setRefreshing] = useState(false);

  const check = useCallback(async (force = false) => {
    const h = await checkHealth(force);
    if (h.offline && isOfflineMode()) {
      setServer({ status: 'builtin', latency: null });
    } else if (h.ok) {
      setServer({ status: 'online', latency: h.latency });
    } else {
      setServer({ status: 'offline', latency: null });
    }
  }, []);

  useEffect(() => { check(); }, [check, stats]);

  const total = stats?.total_reviews || analyses.length || 0;
  const dist = stats?.sentiment_distribution || {
    positive: analyses.filter(a => sentOf(a) === 'positive').length,
    neutral: analyses.filter(a => sentOf(a) === 'neutral').length,
    negative: analyses.filter(a => sentOf(a) === 'negative').length,
  };

  const refresh = async () => {
    setRefreshing(true);
    await onRefresh();
    await check(true);
    setRefreshing(false);
    notify('Dashboard updated');
  };

  const doExport = async (fmt) => {
    try {
      await exportData(fmt);
      notify(`Exported ${fmt.toUpperCase()} successfully`);
    } catch {
      notify('Export failed');
    }
  };

  return (
    <div className="fade-in">
      <div className="hero">
        <div>
          <h1>SmartReviewAI</h1>
          <div className="header-sub">
            Review Intelligence & NLP Platform
            <span
              className="pill"
              style={{
                color: server.status === 'online' ? '#00E676' : '#00D9FF',
                borderColor: server.status === 'online' ? 'rgba(0,230,118,0.4)' : 'rgba(0,217,255,0.4)',
                background: server.status === 'online' ? 'rgba(0,230,118,0.12)' : 'rgba(0,217,255,0.12)'
              }}
            >
              {server.status === 'online'
                ? `● Server AI ${server.latency ? `(${server.latency}ms)` : ''}`
                : '● Built-in AI (Instant)'}
            </span>
          </div>
        </div>
        <div className="header-right">
          <div
            className={`status-dot ${server.status === 'online' ? 'online' : server.status === 'offline' ? 'offline' : 'builtin'}`}
            title={server.status === 'online' ? 'Server Connected' : 'Running on Built-in On-Device AI'}
          />
          <button className="icon-btn" onClick={refresh} title="Refresh Dashboard">
            {refreshing ? '⟳' : '↻'}
          </button>
          <button className="icon-btn" id="settings-gear-btn" onClick={() => onNavigate('settings')} title="Settings">
            ⚙️
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="icon">📝</div>
          <div className="value">{total}</div>
          <div className="label">Total Reviews</div>
        </div>
        <div className="stat-card">
          <div className="icon">⭐</div>
          <div className="value">{Number(stats?.average_rating || 0).toFixed(1)}</div>
          <div className="label">Avg Rating</div>
        </div>
        <div className="stat-card positive">
          <div className="icon">😊</div>
          <div className="value">{dist.positive || 0}</div>
          <div className="label">Positive</div>
        </div>
        <div className="stat-card negative">
          <div className="icon">😞</div>
          <div className="value">{dist.negative || 0}</div>
          <div className="label">Negative</div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">Sentiment Distribution</div>
        {['positive', 'neutral', 'negative'].map(s => {
          const count = dist[s] || 0;
          const pct = total > 0 ? (count / total * 100) : 0;
          return (
            <div className="bar-row" key={s}>
              <div className="bar-label">{s.charAt(0).toUpperCase() + s.slice(1)}</div>
              <div className="bar-bg">
                <div className="bar-fill" style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%`, background: sentColor(s) }} />
              </div>
              <div className="bar-pct" style={{ color: sentColor(s) }}>
                {pct.toFixed(0)}% <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({count})</span>
              </div>
            </div>
          );
        })}
        <div className="stats-row">
          <div className="stats-item">
            <div className="val">{Number(stats?.average_rating || 0).toFixed(1)} / 5.0</div>
            <div className="lbl">Avg Rating</div>
            <div className="emoji">⭐</div>
          </div>
          <div className="stats-item">
            <div className="val">{Number(stats?.average_confidence || 0).toFixed(0)}%</div>
            <div className="lbl">Confidence</div>
            <div className="emoji">🎯</div>
          </div>
          <div className="stats-item">
            <div className="val" style={{ color: sentColor(stats?.recent_trend) }}>
              {stats?.recent_trend ? stats.recent_trend.toUpperCase() : 'NEUTRAL'}
            </div>
            <div className="lbl">Recent Trend</div>
            <div className="emoji">📈</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="actions-row">
          <button className="action-btn primary" onClick={() => onNavigate('analysis')}>
            <span className="emoji">🔍</span>
            <span className="text">Single Review</span>
          </button>
          <button className="action-btn" onClick={() => onNavigate('batch')}>
            <span className="emoji">📊</span>
            <span className="text">Batch Analysis</span>
          </button>
          <button className="action-btn" onClick={() => doExport('csv')}>
            <span className="emoji">📥</span>
            <span className="text">Export CSV</span>
          </button>
        </div>
      </div>

      <div className="section">
        <div className="recent-header">
          <div className="section-title" style={{ margin: 0 }}>Recent Analyses</div>
          <button className="see-all" onClick={() => onNavigate('history')}>See All ›</button>
        </div>
        {analyses.length === 0 ? (
          <div className="empty">
            <div className="emoji">📊</div>
            <div className="title">No analyses yet</div>
            <div className="desc">Analyze your first customer review to unlock instant insights</div>
            <button className="btn" style={{ marginTop: 14 }} onClick={() => onNavigate('analysis')}>
              🔍 Analyze Your First Review
            </button>
          </div>
        ) : (
          analyses.slice(0, 5).map((a, i) => (
            <div className="review-card" key={a.id ?? i} onClick={() => onNavigate('detail', a)}>
              <div className="review-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`sentiment-badge ${sentOf(a)}`}>{sentOf(a).toUpperCase()}</span>
                  {a.product_name && <span className="product-mini">📦 {a.product_name}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="confidence">{confOf(a).toFixed(0)}%</span>
                  <span className="grade-badge-sm" style={{ color: sentColor(sentOf(a)) }}>{gradeOf(a)}</span>
                </div>
              </div>
              <div className="review-text">{a.text}</div>
              <div className="review-footer">
                <span className="stars">{starsOf(a)} {ratingNum(a).toFixed(1)} <span style={{ fontSize: 11, color: 'var(--text-sec)' }}>({tierOf(a)})</span></span>
                <span className="date">{fmtDate(a)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="features-card">
        <div className="features-title">Core Intelligence Engine</div>
        <div className="feature-row"><span className="emoji">🧠</span><span className="text">Dual-Engine: TF-IDF Machine Learning & Real-Time On-Device NLP</span></div>
        <div className="feature-row"><span className="emoji">😊</span><span className="text">7-Emotion Classification & Customer Tone Detection</span></div>
        <div className="feature-row"><span className="emoji">⭐</span><span className="text">Calibrated Star Rating & Customer Satisfaction Index</span></div>
        <div className="feature-row"><span className="emoji">💡</span><span className="text">Context-Aware Product & Service Improvement Recommendations</span></div>
      </div>
    </div>
  );
}

// ============================================================
// SINGLE REVIEW ANALYSIS PAGE
// ============================================================
function AnalysisPage({ onNavigate, onResult, notify }) {
  const [text, setText] = useState('');
  const [product, setProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const analyze = async () => {
    if (text.trim().length < 5) {
      notify('Please enter at least 5 characters');
      return;
    }
    setLoading(true);
    try {
      const data = await analyzeReview({ text: text.trim(), product_name: product.trim() || undefined });
      if (data.status === 'success' && data.data) {
        if (data.fallback) {
          notify('Server offline — analyzed instantly with On-Device AI');
        } else {
          notify('Analysis completed successfully');
        }
        onResult(data.data);
        onNavigate('detail', data.data);
      } else {
        notify('Analysis failed: ' + (data.detail || 'unknown error'));
      }
    } catch (e) {
      notify('Analysis failed: ' + e.message);
    }
    setLoading(false);
  };

  const sampleReviews = [
    {
      label: '⭐ Outstanding Positive',
      product: 'Wireless Noise-Cancelling Headphones',
      text: "This product is absolutely amazing! Best purchase I've made all year. The sound quality is crystal clear, battery life lasts forever, and it arrived quickly in flawless packaging. Highly recommend to everyone!"
    },
    {
      label: '🔋 Battery & Hardware Focus',
      product: 'Pro Smartphone 5G',
      text: 'Good phone with solid battery life and very fast charging. The screen is vibrant and smooth for games, and build quality feels premium in the hand.'
    },
    {
      label: '😐 Balanced Neutral Review',
      product: 'Ergonomic Desk Mouse',
      text: "The product is okay, nothing special. It works as described for basic daily office tasks, but doesn't really stand out. Average build quality for the price."
    },
    {
      label: '😞 Critical Negative Review',
      product: 'Smart Fitness Tracker',
      text: 'Terrible product! Broke after one day of normal use. Complete waste of money. The sensor is completely defective and customer service was unhelpful. Want an immediate refund.'
    },
    {
      label: '⚡ Negation & Nuanced Review',
      product: 'USB-C Fast Charger Cable',
      text: 'This is not good at all, do not buy. The cable stopped charging after two days and customer support never replied to my email.'
    }
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('dashboard')}>← Back to Dashboard</button>
        <div className="page-title">Analyze Review</div>
        <div className="page-subtitle">Enter a customer review to generate complete multi-dimensional AI insights</div>
      </div>

      <div className="input-group">
        <label className="input-label">Product Name (Optional)</label>
        <input
          className="input"
          placeholder="e.g., Sony WH-1000XM5 Headphones"
          value={product}
          onChange={e => setProduct(e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="input-group">
        <label className="input-label">Customer Review *</label>
        <textarea
          className="input textarea"
          placeholder="Paste or type customer review text here..."
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={5000}
        />
        <div className="char-count">{text.length} characters · {words} words</div>
      </div>

      <button className="btn" onClick={analyze} disabled={loading || text.trim().length < 5}>
        {loading ? (
          <span className="loading-row"><span className="spinner" /> Analyzing with AI Engine...</span>
        ) : (
          '🔍 Analyze Review'
        )}
      </button>

      <div className="sample-card">
        <div className="sample-title">Try one of our curated sample reviews:</div>
        {sampleReviews.map((s, idx) => (
          <button
            key={idx}
            className="sample-btn"
            onClick={() => { setText(s.text); setProduct(s.product); }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {s.text}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// BATCH ANALYSIS PAGE
// ============================================================
function BatchPage({ onNavigate, notify }) {
  const [text, setText] = useState('');
  const [product, setProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const lines = useMemo(() => text.split('\n').map(r => r.trim()).filter(Boolean), [text]);

  const analyze = async () => {
    if (!lines.length) { notify('Enter at least one review'); return; }
    if (lines.length > 50) { notify('Maximum 50 reviews per batch'); return; }
    setLoading(true);
    try {
      const data = await analyzeBatch({ reviews: lines, product_name: product.trim() || undefined });
      if (data.status === 'success' && data.data) {
        if (data.fallback) notify('Processed with Built-in AI Engine');
        else notify('Batch analysis completed');
        setResults(data.data);
      } else {
        notify('Batch analysis failed');
      }
    } catch (e) {
      notify('Batch failed: ' + e.message);
    }
    setLoading(false);
  };

  const loadSampleBatch = () => {
    setProduct('Smart Audio Gear');
    setText([
      'This product is absolutely amazing! Best sound quality ever.',
      'Good battery life and very fast charging. Solid build.',
      'The product is okay, nothing special. Works adequately.',
      'Terrible quality! Broke after one day, complete waste of money.',
      'This is not good at all, do not buy from this brand.',
      'Customer service was very helpful and replaced my cable quickly.'
    ].join('\n'));
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('dashboard')}>← Back to Dashboard</button>
        <div className="page-title">Batch Review Analysis</div>
        <div className="page-subtitle">Analyze up to 50 customer reviews simultaneously with comprehensive aggregation</div>
      </div>

      {!results ? (
        <>
          <div className="input-group">
            <label className="input-label">Product Name (Optional)</label>
            <input
              className="input"
              placeholder="e.g., AudioLine Pro"
              value={product}
              onChange={e => setProduct(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="input-label" style={{ margin: 0 }}>Reviews (one per line)</label>
              <button className="mini-btn" onClick={loadSampleBatch}>Load Sample Batch</button>
            </div>
            <textarea
              className="input textarea"
              style={{ minHeight: 180 }}
              placeholder="Paste reviews here, one per line..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <div className="char-count">{lines.length} / 50 reviews entered</div>
          </div>
          <button className="btn" onClick={analyze} disabled={loading || lines.length === 0}>
            {loading ? (
              <span className="loading-row"><span className="spinner" /> Analyzing Batch ({lines.length} reviews)...</span>
            ) : (
              `📊 Analyze ${lines.length} Review${lines.length === 1 ? '' : 's'}`
            )}
          </button>
        </>
      ) : (
        <>
          <div className="chart-card">
            <div className="chart-title">Batch Intelligence Summary</div>
            <div className="stats-row" style={{ border: 'none', marginTop: 0, paddingTop: 0 }}>
              <div className="stats-item">
                <div className="val">{results.summary.total}</div>
                <div className="lbl">Total</div>
              </div>
              <div className="stats-item">
                <div className="val" style={{ color: '#00E676' }}>{results.summary.sentiment_distribution?.positive || 0}</div>
                <div className="lbl">Positive</div>
              </div>
              <div className="stats-item">
                <div className="val" style={{ color: '#FFD740' }}>{results.summary.sentiment_distribution?.neutral || 0}</div>
                <div className="lbl">Neutral</div>
              </div>
              <div className="stats-item">
                <div className="val" style={{ color: '#FF5252' }}>{results.summary.sentiment_distribution?.negative || 0}</div>
                <div className="lbl">Negative</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around' }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-sec)', display: 'block' }}>Average Rating</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#FFD740' }}>
                  ⭐ {Number(results.summary.average_rating || 0).toFixed(1)} / 5.0
                </span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-sec)', display: 'block' }}>Success Rate</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#00E676' }}>
                  {Math.round(((results.summary.successful || results.results.length) / Math.max(results.summary.total, 1)) * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section-title">Individual Review Breakdown ({results.results.length})</div>
            <div style={{ fontSize: 12, color: 'var(--text-sec)', marginBottom: 10 }}>Click on any review to open its full detailed report:</div>
          </div>

          {results.results.map((r, i) => (
            r.error ? (
              <div className="batch-result error" key={i}>
                <div className="batch-header">
                  <span className="batch-idx">#{i + 1}</span>
                  <span className="sentiment-badge neutral">ERROR</span>
                </div>
                <div className="review-text">{r.text}</div>
                <div className="err">{r.error}</div>
              </div>
            ) : (
              <div
                className="batch-result"
                key={i}
                onClick={() => onNavigate('detail', r)}
                style={{ cursor: 'pointer' }}
              >
                <div className="batch-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="batch-idx">#{i + 1}</span>
                    <span className={`sentiment-badge ${sentOf(r)}`}>{sentOf(r).toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: sentColor(sentOf(r)) }}>{gradeOf(r)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>›</span>
                  </div>
                </div>
                <div className="review-text">{r.text}</div>
                <div className="batch-stats">
                  <span>{starsOf(r)} {ratingNum(r).toFixed(1)}</span>
                  <span>🎯 {confOf(r).toFixed(0)}%</span>
                  <span>{EMOTIONS[emoOf(r)]?.emoji} {emoOf(r)}</span>
                  {r.suggestions?.priority && (
                    <span className={`priority-tag ${r.suggestions.priority.toLowerCase()}`}>{r.suggestions.priority}</span>
                  )}
                </div>
              </div>
            )
          ))}

          <div style={{ display: 'flex', gap: 8, margin: '14px 8px' }}>
            <button className="btn" style={{ flex: 1, margin: 0 }} onClick={() => setResults(null)}>
              🔄 Analyze Another Batch
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// DETAILED ANALYSIS REPORT PAGE (ALL TYPES CLEAR OUTPUT)
// ============================================================
function DetailPage({ result, onNavigate, notify }) {
  if (!result) {
    return (
      <div className="empty">
        <div className="title">No review selected</div>
        <button className="btn" onClick={() => onNavigate('dashboard')}>← Return to Dashboard</button>
      </div>
    );
  }

  const s = result.sentiment || { sentiment: 'neutral', confidence: 0, probabilities: {}, polarity: 'Neutral / Balanced' };
  const e = result.emotion || { primary_emotion: 'neutral', emotions: {}, description: 'Balanced customer feedback.' };
  const r = result.rating || { rating: 0, stars: 0, tier: 'Moderate', satisfaction: 'Neutral' };
  const sc = result.overall_score || { score: 0, grade: '—', breakdown: {} };
  const summ = result.summary || { summary: result.text || '', key_sentences: [] };
  const sugg = result.suggestions || { suggestions: [], topics_detected: [], keywords: [], priority: 'Medium' };
  const probs = s.probabilities || {};
  const meta = result.analysis_metadata || {};

  // Sort and format emotion percentages
  const emoEntries = Object.entries(e.emotions || {}).sort((a, b) => b[1] - a[1]);

  const copyText = (t, label) => {
    try {
      navigator.clipboard.writeText(t);
      notify(`${label} copied to clipboard!`);
    } catch {
      notify('Copy failed');
    }
  };

  const copyFullReport = () => {
    const reportText = [
      '============================================================',
      'SMARTREVIEW AI — COMPREHENSIVE ANALYSIS REPORT',
      '============================================================',
      `Review: "${result.text}"`,
      result.product_name ? `Product: ${result.product_name}` : '',
      `Sentiment: ${sentOf(result).toUpperCase()} (${confOf(result).toFixed(1)}% Confidence, ${polarityOf(result)})`,
      `Rating: ${starsOf(result)} ${ratingNum(result).toFixed(1)}/5.0 (${tierOf(result)} - ${satisfactionOf(result)})`,
      `Emotion: ${EMOTIONS[emoOf(result)]?.emoji || ''} ${emoOf(result).toUpperCase()} — ${emoDescOf(result)}`,
      `Overall Grade: ${gradeOf(result)} (Score: ${scoreOf(result).toFixed(1)}/100)`,
      '',
      'SUMMARY & HIGHLIGHTS:',
      summ.summary || result.text,
      ...(summ.key_sentences || []).map(k => `  • ${k}`),
      '',
      `IMPROVEMENT SUGGESTIONS (Priority: ${priorityOf(result)}):`,
      ...(sugg.suggestions || []).map(item => `  • ${item}`),
      '',
      sugg.topics_detected?.length ? `Detected Topics: ${sugg.topics_detected.join(', ')}` : '',
      `Engine: ${meta.engine || 'SmartReviewAI ML'} (Processing time: ${meta.processing_time_ms ?? '1'} ms)`,
      '============================================================'
    ].filter(Boolean).join('\n');

    copyText(reportText, 'Full Analysis Report');
  };

  return (
    <div className="fade-in">
      {/* Header bar with Back button and Overall Grade */}
      <div className="results-header">
        <button className="back-btn" onClick={() => onNavigate('dashboard')}>← Dashboard</button>
        <div
          className="overall-score"
          style={{
            background: `linear-gradient(135deg, ${sentColor(s.sentiment)}20, ${sentColor(s.sentiment)}08)`,
            borderColor: sentColor(s.sentiment)
          }}
        >
          <div className="grade" style={{ color: sentColor(s.sentiment) }}>{sc.grade}</div>
          <div className="score" style={{ color: sentColor(s.sentiment) }}>
            SCORE: {Number(sc.score || 0).toFixed(1)} / 100
          </div>
        </div>
      </div>

      {result.product_name && (
        <div className="product-chip">📦 Product: <strong>{result.product_name}</strong></div>
      )}

      {/* Quoted Original Review */}
      <div className="quote-card">
        “{result.text}”
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'normal', display: 'flex', justifyContent: 'space-between' }}>
          <span>{result.text.length} characters · {result.text.split(/\s+/).length} words</span>
          <button className="mini-btn" onClick={() => copyText(result.text, 'Original review')}>Copy Review</button>
        </div>
      </div>

      {/* 1. SENTIMENT ANALYSIS CLEAR OUTPUT */}
      <div className="result-card">
        <div className="result-title">
          <span>🎯 Sentiment Analysis</span>
          <span className="badge-chip" style={{ background: `${sentColor(s.sentiment)}22`, color: sentColor(s.sentiment) }}>
            {polarityOf(result)}
          </span>
        </div>
        <div className="sentiment-display">
          <span className="sentiment-pill" style={{ background: sentColor(s.sentiment) }}>
            {(s.sentiment || 'neutral').toUpperCase()}
          </span>
          <span style={{ fontSize: 22, fontWeight: 800, color: sentColor(s.sentiment) }}>
            {Number(s.confidence || 0).toFixed(1)}% <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-sec)' }}>Confidence</span>
          </span>
        </div>
        <div className="confidence-bar">
          <div className="confidence-fill" style={{ width: `${Math.min(100, Number(s.confidence || 0))}%`, background: sentColor(s.sentiment) }} />
        </div>

        {/* 3-Way Probability Distribution */}
        <div className="section-sub-title">Sentiment Probability Distribution:</div>
        <div className="prob-grid">
          {['positive', 'neutral', 'negative'].map(key => {
            const val = Number(probs[key] ?? (s.sentiment === key ? s.confidence : 0));
            return (
              <div className="prob-card" key={key} style={{ borderColor: s.sentiment === key ? sentColor(key) : 'var(--border)' }}>
                <div className="prob-label" style={{ color: sentColor(key) }}>{key.toUpperCase()}</div>
                <div className="prob-value">{val.toFixed(1)}%</div>
                <div className="mini-bar-bg">
                  <div className="mini-bar-fill" style={{ width: `${val}%`, background: sentColor(key) }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. STAR RATING & SATISFACTION CLEAR OUTPUT */}
      <div className="result-card">
        <div className="result-title">
          <span>⭐ Star Rating & Customer Satisfaction</span>
          <span className="badge-chip rating-tier-chip">{tierOf(result)}</span>
        </div>
        <div className="rating-display">
          <span className="rating-stars">{starsOf(result)}</span>
          <span className="rating-val">{ratingNum(result).toFixed(1)} <span style={{ fontSize: 14, color: 'var(--text-sec)' }}>/ 5.0</span></span>
        </div>
        <div className="satisfaction-row">
          <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>Customer Satisfaction Level:</span>
          <span className="satisfaction-badge" style={{ color: sentColor(s.sentiment) }}>
            {satisfactionOf(result)}
          </span>
        </div>
      </div>

      {/* 3. MULTI-EMOTION ANALYSIS CLEAR OUTPUT */}
      <div className="result-card">
        <div className="result-title">
          <span>😊 Multi-Emotion Breakdown</span>
          <span className="badge-chip">{EMOTIONS[e.primary_emotion]?.label || 'Neutral'}</span>
        </div>
        <div className="emotion-primary">
          <span className="emotion-emoji">{EMOTIONS[e.primary_emotion]?.emoji || '😐'}</span>
          <div>
            <div className="emotion-label">Primary Customer Emotion</div>
            <div className="emotion-name" style={{ color: EMOTIONS[e.primary_emotion]?.color || '#90CAF9' }}>
              {(e.primary_emotion || 'neutral').toUpperCase()}
            </div>
            <div className="emotion-desc">{emoDescOf(result)}</div>
          </div>
        </div>

        <div className="section-sub-title">Emotion Spectrum Breakdown:</div>
        {emoEntries.map(([em, pct]) => {
          const cfg = EMOTIONS[em] || { emoji: '😐', color: '#90CAF9', label: em };
          const p = Number(pct || 0);
          return (
            <div className="emotion-bar-row" key={em}>
              <span className="emotion-bar-emoji">{cfg.emoji}</span>
              <span className="emotion-bar-name">{cfg.label || em}</span>
              <div className="emotion-bar-bg">
                <div
                  className="emotion-bar-fill"
                  style={{ width: `${Math.max(p, p > 0 ? 3 : 0)}%`, background: cfg.color }}
                />
              </div>
              <span className="emotion-bar-pct" style={{ color: cfg.color }}>{p.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>

      {/* 4. EXECUTIVE SUMMARY & KEY HIGHLIGHTS CLEAR OUTPUT */}
      <div className="result-card">
        <div className="result-title">
          <span>📝 Executive Summary & Highlights</span>
          <button className="mini-btn" onClick={() => copyText(summ.summary || result.text, 'Summary')}>Copy Summary</button>
        </div>
        <div className="summary-text">{summ.summary || result.text}</div>

        {(summ.key_sentences || []).length > 1 && (
          <div className="key-sentences-box">
            <div className="key-sentences-title">Key Highlight Sentences:</div>
            {summ.key_sentences.map((sent, idx) => (
              <div className="key-sentence-item" key={idx}>
                <span className="key-sentence-bullet">•</span>
                <span>{sent}</span>
              </div>
            ))}
          </div>
        )}

        <div className="summary-stats">
          <div className="summary-stat">
            <div className="val">{summ.original_length ?? result.text.length}</div>
            <div className="lbl">Original Chars</div>
          </div>
          <div className="summary-stat">
            <div className="val">{summ.summary_length ?? (summ.summary || '').length}</div>
            <div className="lbl">Summary Chars</div>
          </div>
          <div className="summary-stat">
            <div className="val">{summ.compression_ratio ?? 100}%</div>
            <div className="lbl">Compression</div>
          </div>
          <div className="summary-stat">
            <div className="val">{Math.max(1, Math.round(result.text.split(/\s+/).length / 3))}s</div>
            <div className="lbl">Read Time</div>
          </div>
        </div>
      </div>

      {/* 5. ACTIONABLE IMPROVEMENT SUGGESTIONS CLEAR OUTPUT */}
      <div className="result-card">
        <div className="result-title">
          <span>💡 AI Improvement Suggestions</span>
          <span className={`priority-tag ${priorityOf(result).toLowerCase()}`}>
            Priority: {priorityOf(result)}
          </span>
        </div>

        {(sugg.suggestions || []).length === 0 ? (
          <div className="muted">No specific suggestions generated for this review.</div>
        ) : (
          (sugg.suggestions || []).map((t, i) => (
            <div className="suggestion-item" key={i}>
              <span className="suggestion-bullet">#{i + 1}</span>
              <span className="suggestion-text">{t}</span>
            </div>
          ))
        )}

        {(sugg.topics_detected || []).length > 0 && (
          <div className="topics-row">
            <span style={{ fontSize: 12, color: 'var(--text-sec)', marginRight: 6 }}>Detected Topics:</span>
            {sugg.topics_detected.map((t, i) => (
              <span className="topic-badge" key={i}>🏷️ {t.toUpperCase()}</span>
            ))}
          </div>
        )}

        {(sugg.keywords || []).length > 0 && (
          <div className="topics-row" style={{ borderTop: 'none', paddingTop: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-sec)', marginRight: 6 }}>Key Terms:</span>
            {sugg.keywords.slice(0, 8).map((k, i) => (
              <span className="topic-badge alt" key={i}>#{k}</span>
            ))}
          </div>
        )}
      </div>

      {/* 6. OVERALL SCORE BREAKDOWN CLEAR OUTPUT */}
      {sc.breakdown && Object.keys(sc.breakdown).length > 0 && (
        <div className="result-card">
          <div className="result-title">
            <span>📊 Composite Quality Score Breakdown</span>
            <span style={{ fontWeight: 800, color: sentColor(s.sentiment) }}>{sc.grade} ({Number(sc.score || 0).toFixed(1)} / 100)</span>
          </div>
          {Object.entries(sc.breakdown).map(([k, v]) => (
            <div className="breakdown-row" key={k}>
              <div className="breakdown-label">{k.replace('_', ' ').toUpperCase()}</div>
              <div className="breakdown-bar-bg">
                <div className="breakdown-bar-fill" style={{ width: `${Math.min(100, Math.max(4, Number(v) || 0))}%` }} />
              </div>
              <div className="breakdown-val">{Number(v).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      )}

      {/* 7. ENGINE METADATA & QUICK ACTIONS */}
      <div className="result-card" style={{ background: 'rgba(22, 22, 58, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-sec)' }}>
            <div><strong>Engine:</strong> {meta.engine || 'Built-in On-Device AI Engine'}</div>
            <div style={{ marginTop: 2 }}><strong>Latency:</strong> {meta.processing_time_ms ?? '0.8'} ms · <strong>Analyzed:</strong> {fmtDate(result)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="mini-btn" onClick={copyFullReport}>📋 Copy Full Report</button>
            <button className="mini-btn" onClick={() => onNavigate('analysis')}>🔍 New Analysis</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// HISTORY PAGE
// ============================================================
function HistoryPage({ analyses, onNavigate, onRefresh, notify }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear all analysis history?')) return;
    try {
      await deleteHistory();
      await onRefresh();
      notify('History cleared successfully');
    } catch {
      notify('Failed to clear history');
    }
  };

  const doExport = async (fmt) => {
    try {
      await exportData(fmt);
      notify(`Exported ${fmt.toUpperCase()} successfully`);
    } catch {
      notify('Export failed');
    }
  };

  let items = analyses.filter(a => {
    if (filter !== 'all' && sentOf(a) !== filter) return false;
    if (q) {
      const matchText = (a.text || '').toLowerCase().includes(q.toLowerCase());
      const matchProd = (a.product_name || '').toLowerCase().includes(q.toLowerCase());
      if (!matchText && !matchProd) return false;
    }
    return true;
  });

  items = [...items].sort((a, b) => {
    if (sort === 'oldest') return new Date(tsOf(a)) - new Date(tsOf(b));
    if (sort === 'rating') return ratingNum(b) - ratingNum(a);
    if (sort === 'confidence') return confOf(b) - confOf(a);
    return new Date(tsOf(b)) - new Date(tsOf(a));
  });

  return (
    <div className="fade-in">
      <div className="history-header">
        <div>
          <div className="page-title">Analysis History</div>
          <div style={{ fontSize: 13, color: 'var(--text-sec)', marginTop: 4 }}>
            Showing {items.length} of {analyses.length} total reviews
          </div>
        </div>
        {analyses.length > 0 && (
          <button className="clear-btn" onClick={clearHistory}>🗑️ Clear All</button>
        )}
      </div>

      <div className="toolbar">
        <input
          className="input search"
          placeholder="🔎 Search by review text or product name..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <div className="chips">
          {['all', 'positive', 'neutral', 'negative'].map(f => (
            <button
              key={f}
              className={`chip ${filter === f ? 'on' : ''} ${f}`}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <select className="sort" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="rating">Highest Rated</option>
            <option value="confidence">Highest Confidence</option>
          </select>
        </div>

        <div className="export-row">
          <button className="mini-btn" onClick={() => doExport('csv')}>⬇ Export CSV</button>
          <button className="mini-btn" onClick={() => doExport('json')}>⬇ Export JSON</button>
          <button className="mini-btn" onClick={() => doExport('report')}>⬇ Text Report</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <div className="emoji">📋</div>
          <div className="title">{analyses.length ? 'No matching reviews' : 'No History Yet'}</div>
          <div className="desc">{analyses.length ? 'Try adjusting your search or filters' : 'Analyzed reviews will be saved and listed here'}</div>
          <button className="btn" style={{ maxWidth: 280, margin: '16px auto 0' }} onClick={() => onNavigate('analysis')}>
            🔍 Analyze a Review
          </button>
        </div>
      ) : (
        items.map((a, i) => (
          <div
            className="review-card"
            key={a.id ?? i}
            onClick={() => onNavigate('detail', a)}
            style={{ margin: '0 8px 10px' }}
          >
            <div className="review-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`sentiment-badge ${sentOf(a)}`}>{sentOf(a).toUpperCase()}</span>
                {a.product_name && <span className="product-mini">📦 {a.product_name}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="confidence">🎯 {confOf(a).toFixed(0)}%</span>
                <span className="grade-badge-sm" style={{ color: sentColor(sentOf(a)) }}>{gradeOf(a)}</span>
              </div>
            </div>
            <div className="review-text">{a.text}</div>
            <div className="review-footer">
              <span className="stars">{starsOf(a)} {ratingNum(a).toFixed(1)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-sec)' }}>
                {EMOTIONS[emoOf(a)]?.emoji} {emoOf(a)} · {fmtDate(a)}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ============================================================
// PROFILE & CAPABILITIES PAGE
// ============================================================
function ProfilePage({ onNavigate }) {
  const features = [
    { icon: '🎯', title: 'Sentiment Intelligence', desc: 'Positive, Neutral & Negative classification with polarity descriptors' },
    { icon: '⭐', title: 'Star Rating Regression', desc: 'Predicts calibrated star rating (1.0 to 5.0) and customer satisfaction' },
    { icon: '😊', title: 'Multi-Emotion Spectrum', desc: 'Analyzes Happy, Sad, Angry, Surprised, Fearful, Disgusted & Neutral tones' },
    { icon: '📝', title: 'Extractive Summarization', desc: 'Distills key highlight sentences and computes compression ratio' },
    { icon: '💡', title: 'Actionable Suggestions', desc: 'Disambiguates topics (Quality, Price, Battery, Shipping, Service) with urgency tags' },
    { icon: '📊', title: 'Dual-Engine Architecture', desc: 'Seamlessly runs on Server ML Pipeline or Built-in On-Device AI' },
  ];

  return (
    <div className="fade-in">
      <div className="profile-header">
        <div className="profile-avatar">🤖</div>
        <div className="profile-name">SmartReviewAI</div>
        <div className="profile-ver">v{APP_VERSION} · {isOfflineMode() ? 'Built-in On-Device AI' : 'Hybrid AI Engine'}</div>
      </div>

      <div className="section">
        <div className="section-title">Engine Capabilities</div>
        {features.map((f, i) => (
          <div className="feature-item" key={i}>
            <span className="feature-icon">{f.icon}</span>
            <div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section">
        <div className="section-title">Architecture & Tech Stack</div>
        <div className="tech-grid">
          <div className="tech-item"><div className="tech-icon">⚛️</div><div className="tech-name">React 18</div></div>
          <div className="tech-item"><div className="tech-icon">⚡</div><div className="tech-name">FastAPI</div></div>
          <div className="tech-item"><div className="tech-icon">🧠</div><div className="tech-name">scikit-learn</div></div>
          <div className="tech-item"><div className="tech-icon">📱</div><div className="tech-name">Capacitor Android</div></div>
        </div>
      </div>

      <div className="section" style={{ marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={() => onNavigate('settings')}>
          ⚙️ Backend & App Settings
        </button>
      </div>

      <div className="section" style={{ textAlign: 'center', paddingBottom: 30, color: 'var(--text-sec)', fontSize: 12 }}>
        © 2026 SmartReviewAI · Enterprise Customer Review Intelligence
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS PAGE
// ============================================================
function SettingsPage({ onNavigate, notify }) {
  const [engineMode, setEngineModeState] = useState(getEngineMode());
  const [serverUrl, setServerUrl] = useState(defaultServerUrlForSettings());
  const [serverStatus, setServerStatus] = useState('checking');
  const [latency, setLatency] = useState(null);

  const testServer = async () => {
    setServerStatus('checking');
    const res = await checkHealth(true);
    if (res.ok) {
      setServerStatus('online');
      setLatency(res.latency);
      notify(`Server connected! Response time: ${res.latency}ms`);
    } else {
      setServerStatus('offline');
      setLatency(null);
      notify('Server unreachable — Built-in AI will handle all requests');
    }
  };

  useEffect(() => { testServer(); }, []);

  const handleSaveUrl = () => {
    const trimmed = serverUrl.trim();
    if (!trimmed || trimmed === BUILTIN_HOST || trimmed === 'offline') {
      setEngineMode('builtin');
      setEngineModeState('builtin');
      notify('Switched to Built-in On-Device AI Engine');
    } else {
      localStorage.setItem('api_host', trimmed.replace(/\/$/, ''));
      setEngineModeState('auto');
      testServer();
      notify('Backend URL saved!');
    }
  };

  const handleToggleBuiltin = () => {
    if (engineMode === 'builtin') {
      setEngineMode('auto');
      setEngineModeState('auto');
      testServer();
      notify('Switched to Automatic (Server + On-Device Fallback)');
    } else {
      setEngineMode('builtin');
      setEngineModeState('builtin');
      setServerStatus('builtin');
      notify('Using 100% On-Device AI (Instant, zero network lag)');
    }
  };

  const handleReset = () => {
    resetToDefault();
    setServerUrl(CLOUD_API_URL);
    setEngineModeState('auto');
    testServer();
    notify('Reset to default cloud configuration');
  };

  const handleClearCache = async () => {
    if (!confirm('Clear all cached data and review history?')) return;
    try {
      await deleteHistory();
      notify('Cache and review history cleared');
    } catch {
      notify('Failed to clear cache');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('dashboard')}>← Dashboard</button>
        <div className="page-title">Settings & Engine Configuration</div>
      </div>

      <div className="section">
        <div className="section-title">AI Processing Mode</div>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Built-in On-Device AI Mode</div>
            <div className="setting-desc">Run NLP entirely in-browser / on-phone with 0ms network latency (offline-capable)</div>
          </div>
          <button
            className={`toggle ${engineMode === 'builtin' ? 'on' : ''}`}
            onClick={handleToggleBuiltin}
            aria-label="Toggle built-in engine"
          />
        </div>
      </div>

      <div className="section">
        <div className="section-title">Backend Server Connection</div>
        <div className="input-group" style={{ padding: 0, marginBottom: 10 }}>
          <label className="input-label">Backend API URL</label>
          <input
            className="input"
            value={serverUrl}
            onChange={e => setServerUrl(e.target.value)}
            placeholder="http://localhost:8000 or https://your-server.onrender.com"
          />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Laptop local dev: <code style={{ color: 'var(--accent)' }}>http://localhost:8000</code>. When offline, on-device AI handles all predictions instantly.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1, margin: 0, padding: 12 }} onClick={handleSaveUrl}>
            💾 Save URL
          </button>
          <button className="btn btn-secondary" style={{ flex: 1, margin: 0, padding: 12 }} onClick={testServer}>
            🔄 Test Connection
          </button>
        </div>

        <button className="mini-btn" style={{ marginTop: 10 }} onClick={handleReset}>
          ↩ Reset to Cloud Default
        </button>

        <div className="setting-item" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div
              className={`status-dot ${serverStatus === 'online' ? 'online' : serverStatus === 'offline' ? 'offline' : 'builtin'}`}
            />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {serverStatus === 'online'
                ? `Server Connected (${latency}ms)`
                : serverStatus === 'offline'
                ? 'Server Offline (On-Device AI Active)'
                : 'Built-in On-Device Engine Active'}
            </span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Data Management</div>
        <div className="menu-item" onClick={() => exportData('csv')}>
          <span className="menu-icon">📊</span>
          <div className="menu-info">
            <div className="menu-label">Export All Analyses as CSV</div>
            <div className="menu-desc">Tabular dataset with sentiment, rating & emotion</div>
          </div>
          <span className="menu-arrow">›</span>
        </div>
        <div className="menu-item" onClick={() => exportData('json')}>
          <span className="menu-icon">📄</span>
          <div className="menu-info">
            <div className="menu-label">Export All Analyses as JSON</div>
            <div className="menu-desc">Full structured JSON export</div>
          </div>
          <span className="menu-arrow">›</span>
        </div>
        <div className="menu-item" onClick={handleClearCache} style={{ border: '1px solid rgba(255,82,82,0.3)' }}>
          <span className="menu-icon">🗑️</span>
          <div className="menu-info">
            <div className="menu-label" style={{ color: '#FF5252' }}>Clear All History & Cache</div>
            <div className="menu-desc">Wipes stored reviews from this device</div>
          </div>
          <span className="menu-arrow">›</span>
        </div>
      </div>

      <div className="section" style={{ textAlign: 'center', paddingBottom: 30 }}>
        <div className="profile-name" style={{ fontSize: 20 }}>SmartReviewAI</div>
        <div className="profile-ver">Version {APP_VERSION}</div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function App() {
  const [page, setPage] = useState('dashboard');
  const [analyses, setAnalyses] = useState([]);
  const [stats, setStats] = useState(null);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg) => {
    setToast({ id: Date.now(), text: msg });
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [histRes, statRes] = await Promise.all([
        fetchHistory(100),
        fetchStats()
      ]);
      if (histRes.status === 'success' && Array.isArray(histRes.data)) {
        setAnalyses(histRes.data);
      }
      if (statRes.status === 'success' && statRes.data) {
        setStats(statRes.data);
      }
    } catch { /* graceful fallback */ }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigate = (p, data) => {
    if (p === 'detail' && data) {
      setDetail(data);
    }
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResult = (newResult) => {
    loadData();
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} analyses={analyses} stats={stats} onRefresh={loadData} notify={notify} />;
      case 'analysis':
        return <AnalysisPage onNavigate={navigate} onResult={handleResult} notify={notify} />;
      case 'batch':
        return <BatchPage onNavigate={navigate} notify={notify} />;
      case 'detail':
        return <DetailPage result={detail} onNavigate={navigate} notify={notify} />;
      case 'history':
        return <HistoryPage analyses={analyses} onNavigate={navigate} onRefresh={loadData} notify={notify} />;
      case 'profile':
        return <ProfilePage onNavigate={navigate} />;
      case 'settings':
        return <SettingsPage onNavigate={navigate} notify={notify} />;
      default:
        return <Dashboard onNavigate={navigate} analyses={analyses} stats={stats} onRefresh={loadData} notify={notify} />;
    }
  };

  const tabs = [
    { id: 'dashboard', emoji: '📊', label: 'Dashboard' },
    { id: 'analysis', emoji: '🔍', label: 'Analyze' },
    { id: 'batch', emoji: '📋', label: 'Batch' },
    { id: 'history', emoji: '🕒', label: 'History' },
    { id: 'settings', emoji: '⚙️', label: 'Settings' },
  ];

  return (
    <div className="app">
      {toast && <Toast key={toast.id} msg={toast.text} onClose={() => setToast(null)} />}
      {renderPage()}
      <nav className="tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab ${page === t.id || (t.id === 'settings' && page === 'profile') ? 'active' : ''}`}
            onClick={() => navigate(t.id)}
          >
            <span className="emoji">{t.emoji}</span>
            <span className="label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
