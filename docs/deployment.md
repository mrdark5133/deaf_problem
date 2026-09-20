# SignBridge Deployment Guide (Render Free Tier)

This document describes the exact steps to deploy **SignBridge** to **Render** as a single unified Docker web service serving both the FastAPI backend and compiled React SPA.

---

## 1. Quick Overview

- **Service Type:** Web Service (Free tier)
- **Runtime:** Docker (Multi-stage build)
- **Instance Resources:** ~512 MB RAM, 0.1 CPU
- **Port:** Plain HTTP on `0.0.0.0:${PORT:-10000}` (TLS terminated by Render)
- **Health Check Path:** `/health`
- **Expected Build Time:** 2 to 4 minutes (Node 22 asset build + spaCy model download)

---

## 2. Step-by-Step Deployment Options

### Option A: Deploy via Render Blueprint (`render.yaml`) — Recommended

1. Push your code to your GitHub / GitLab repository (`mrdark5133/deaf_problem`).
2. Log in to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** in the top navigation bar and select **Blueprint**.
4. Connect your Git repository containing `render.yaml`.
5. Render will automatically detect `render.yaml` and configure:
   - **Service Name:** `signbridge`
   - **Environment:** `Docker`
   - **Region:** `Oregon (US West)` (or your preferred region)
   - **Plan:** `Free`
   - **Health Check Path:** `/health`
   - **Environment Variable:** `PORT=10000`
6. Click **Apply**. Render will initiate the initial build and deployment.

---

### Option B: Deploy Manually as a Web Service

1. On the Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
2. Select **Build and deploy from a Git repository**.
3. Choose your repository (`deaf_problem`).
4. Fill in the service configuration:
   - **Name:** `signbridge`
   - **Region:** `Oregon (US West)` (or `Ohio`, `Frankfurt`, `Singapore`)
   - **Branch:** `main`
   - **Language / Runtime:** `Docker`
   - **Dockerfile Path:** `./Dockerfile`
   - **Docker Context Directory:** `.`
   - **Instance Type:** `Free`
5. Under **Advanced Settings**:
   - **Health Check Path:** `/health`
   - **Auto-Deploy:** `Yes`
   - **Environment Variables:**
     - `PORT`: `10000`
     - `PYTHONUNBUFFERED`: `1`
6. Click **Create Web Service**.

---

## 3. Post-Deployment Verification

Once Render finishes building and indicates **Live**, verify the deployment:

1. **Check Health Endpoint:**
   ```bash
   curl -i https://<your-subdomain>.onrender.com/health
   ```
   *Expected Response:* HTTP 200 `{"status":"ok","version":"0.1.0","service":"signbridge-backend"}`

2. **Run Automated Smoke Test:**
   ```bash
   python scripts/smoke_test.py https://<your-subdomain>.onrender.com
   ```
   *Verifies:* Health check, ASL translation, SPA root, client route fallbacks (`/recorder`), missing API 404s, JS bundles, and sign library assets.

3. **Browser Smoke Check:**
   - Open `https://<your-subdomain>.onrender.com` in **Google Chrome** or **Microsoft Edge**.
   - Check that the header badge shows green **"Connected"**.
   - Test typed translation: type *"Hello doctor"* and click Translate.
   - Test speech recognition: click the microphone button, grant permissions, and speak.

---

## 4. Maintenance & Operations

### How to Redeploy
- **Automatic:** Any git push to the configured branch automatically triggers a rebuild.
- **Manual (Fast):** In the Render Dashboard, click **Manual Deploy** $\rightarrow$ **Deploy latest commit**.
- **Clean Build (Cache-clearing):** If dependencies change or cache issues occur, click **Manual Deploy** $\rightarrow$ **Clear build cache & deploy**.

### How to Roll Back
1. Go to the **Events** tab in your Render Web Service dashboard.
2. Locate the previous successful deploy event.
3. Click the three dots ($\cdots$) menu next to that deploy and select **Rollback to this deploy**.

### Cold Starts & Idle Spin-Down
- Render free tier instances spin down after **15 minutes of inactivity**.
- The next incoming request triggers a wake-up that typically takes **50 to 60 seconds**.
- The SignBridge frontend includes an automatic wake-up banner and retries for up to 90 seconds while keeping local demo and typed modes interactive.

---

## 5. Pre-Demo Checklist (Mandatory for Live Presentations)

Before presenting SignBridge to judges, evaluators, or an audience:

- [ ] **Wake the Service 5 Minutes Early:** Open `https://<your-subdomain>.onrender.com` in your browser at least 5 minutes before the presentation to ensure the instance is active and warm.
- [ ] **Run Smoke Test:** Execute `python scripts/smoke_test.py https://<your-subdomain>.onrender.com` from your terminal to verify all endpoints respond within normal latency.
- [ ] **Test Microphone in Chrome/Edge:** Ensure browser microphone permissions are enabled on the HTTPS URL and speak a short test sentence.
- [ ] **Freeze Deployments:** **Do not push any commits or trigger redeploys during the final 60 minutes before your demo.**
- [ ] **Keep Demo Mode Ready (Plan B):** If venue Wi-Fi becomes unstable, use the **Demo Mode** bar (*Doctor Visit*, *Classroom*, *Help Desk*) which runs 100% locally in the browser.
