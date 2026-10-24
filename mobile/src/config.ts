// ============================================================
// SmartReviewAI — App configuration (ONE place to edit)
// Same cloud backend as the web app. After deploying, put your
// public backend URL below and rebuild the app.
// Example: 'https://smartreviewai-api.onrender.com'
// Users can still override it anytime in Settings (no rebuild).
// If the server is unreachable, the app auto-falls back to
// on-device AI so it ALWAYS works (online or offline).
// ============================================================
export const CLOUD_API_URL = 'https://smartreviewai-api.onrender.com';

// Seconds to wait for the cloud server before falling back to
// on-device AI (free hosts can cold-start ~30-60s on first hit).
export const SERVER_TIMEOUT_MS = 15000;

export const APP_VERSION = '2.0.0';
