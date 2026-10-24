# SmartReviewAI — Go Online (no laptop needed) ☁️

Goal: the app works on **any phone/laptop with internet**, backend runs
**24/7 in the cloud**. Nothing to install, nothing to keep running.

## Step 1 — Put the code on GitHub (2 min)

```powershell
cd "C:\Users\MITHESH D\Projects\SmartReviewAI"
git init
git add -A
git commit -m "SmartReviewAI v2.0 - cloud ready"
git branch -M main
git remote add origin https://github.com/YOURNAME/SmartReviewAI.git
git push -u origin main
```

## Step 2 — Deploy backend + frontend (3 min, free)

1. Go to **https://render.com** → sign up (GitHub login) → **New → Blueprint**
2. Select your `SmartReviewAI` repo → Render finds `render.yaml` → **Apply**
3. Wait ~5 min. You get two public URLs:
   - API: `https://smartreviewai-api.onrender.com`
   - App: `https://smartreviewai-web.onrender.com`
4. Open `https://smartreviewai-api.onrender.com/health` → should say `{"status":"healthy"...}`

> Free servers sleep after ~15 min idle — first tap can take ~60s to
> wake. The app **auto-falls back to on-device AI** meanwhile, so it
> never looks broken. (Render paid $7/mo disables sleeping.)

## Step 3 — Point the app at your backend (1 min)

If your API URL is exactly `https://smartreviewai-api.onrender.com`,
**nothing to do** — it's already the default (`web/src/appConfig.js`
→ `CLOUD_API_URL`). Otherwise:

```js
// web/src/appConfig.js
export const CLOUD_API_URL = 'https://YOUR-ACTUAL-API.onrender.com';
```

then rebuild + push (Render auto-redeploys the site):

```powershell
cd web; npm run build; cd ..
git add -A; git commit -m "Point app at cloud backend"; git push
```

No rebuild handy? On any device open:
`https://smartreviewai-web.onrender.com/?api=https://YOUR-API.onrender.com`
— it saves automatically. Or set it in the app under **Profile → ⚙️ Settings**.

## Step 4 — Use it on phones 📱 (no download)

- Just open the app URL in Chrome/Safari → **Add to Home Screen**
  (Chrome menu → "Install app" / Safari Share → "Add to Home Screen").
  It opens full-screen like a native app (PWA manifest included).
- Works with internet (cloud AI) **and** without it (on-device AI).

## How "always running" works

| Situation | What happens |
|---|---|
| Internet + cloud awake | Full cloud AI (accurate ML models) |
| Internet, cloud waking up | On-device AI instantly, toast says so |
| No internet at all | On-device AI, everything except shared history works |
| `builtin://offline` in Settings | Force on-device mode |

History on the cloud server is in-memory (free-tier limitation);
per-device history is always in the browser. Export (CSV/JSON/Report)
works in every mode.
