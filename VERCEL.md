# Deploying SmartReviewAI to Vercel

SmartReviewAI is pre-configured for seamless, zero-config deployment to [Vercel](https://vercel.com) as a modern web application.

---

## Method 1: Deploy with Vercel CLI (Fastest — 1 Minute)

The Vercel CLI is already installed on your system.

### Step 1: Login to Vercel (One-Time)
Run the following command in PowerShell:
```powershell
vercel login
```
Follow the prompt to authenticate with your GitHub, GitLab, Bitbucket, or Email account.

### Step 2: Deploy to Production
To deploy your live website immediately, run:
```powershell
vercel --prod
```
During the first run, Vercel will ask a few setup questions:
* **Set up and deploy?** [Y/n] → Press `Y` and Enter.
* **Which scope do you want to deploy to?** → Select your account or team.
* **Link to existing project?** [y/N] → Press `N`.
* **What’s your project’s name?** → `smartreviewai` (or your preferred name).
* **In which directory is your code located?** → Press Enter for `./` (the root configuration will automatically build `web`).

Vercel will build the project and output your live production URL (e.g., `https://smartreviewai.vercel.app`)!

---

## Method 2: Deploy via GitHub (Continuous Deployment)

If you prefer automatic deployments whenever you push to GitHub:

1. Push your project to GitHub:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit for SmartReviewAI"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your GitHub repository.
4. **Project Settings:**
   * **Framework Preset:** Vite
   * **Root Directory:** Leave as `./` (or select `web` — both are pre-configured!)
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist` (if Root Directory is `web`) or `web/dist` (if Root Directory is `./`)
5. Click **Deploy**.

---

## Pre-Configured Files

The following files have been generated to ensure smooth Vercel deployment:

* [package.json](file:///c:/Users/MITHESH%20D/Projects/SmartReviewAI/package.json): Root scripts to build and deploy.
* [vercel.json](file:///c:/Users/MITHESH%20D/Projects/SmartReviewAI/vercel.json): Root configuration with Vite build command, output directory, and SPA routing rewrites.
* [web/vercel.json](file:///c:/Users/MITHESH%20D/Projects/SmartReviewAI/web/vercel.json): Direct subfolder configuration if deploying from `web/`.
* [.vercelignore](file:///c:/Users/MITHESH%20D/Projects/SmartReviewAI/.vercelignore): Excludes Android build files, Python caches, and APK files from the upload bundle for rapid deployment.

---

## AI Engine on Vercel

* The website deployed on Vercel runs with the **Built-in High-Performance On-Device AI Engine** by default.
* It delivers instantaneous review intelligence (sentiment, predicted rating, 7-emotion breakdown, extractive summary, prioritized suggestions, and quality scores) directly in the visitor's browser with **zero server cold-starts or network latency**.
* Users can optionally connect a remote FastAPI backend in the in-app **Settings** if desired.
