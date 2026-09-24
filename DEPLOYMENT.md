# 🚀 Complete Deployment Guide: Vercel (Frontend) & Dokploy / Render (Backend)

This guide walks you through deploying your **Real-Time Telegram Bingo Bot** to production for free or low-cost.

---

## 📱 Part 1: Deploy Frontend to Vercel (100% Free)

Vercel provides free, high-performance static hosting with global CDN & SSL.

### Steps:
1. Push your code to GitHub (`https://github.com/anuteshome/Bingo_Telegram_Bot.git`).
2. Go to [vercel.com](https://vercel.com) and log in.
3. Click **Add New Project** $\rightarrow$ **Import Git Repository**.
4. Select `Bingo_Telegram_Bot`.
5. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add **Environment Variables**:
   - `VITE_API_URL` = `https://<YOUR-BACKEND-DOMAIN>/api/v1`
   - `VITE_WS_URL` = `wss://<YOUR-BACKEND-DOMAIN>`
7. Click **Deploy**. Vercel will give you a domain like `https://bingo-telegram-bot.vercel.app`.

---

## ⚙️ Part 2: Backend Deployment Options

FastAPI requires a persistent server for **WebSockets** and **Redis Real-Time Pub/Sub**.

### Option A: Dokploy (Recommended - Open Source Self-Hosted PaaS)
**Dokploy** is a free software dashboard (like Vercel) that runs on any $3-$5 VPS (Hetzner, DigitalOcean, AWS, Contabo).

1. Get a VPS (e.g. Hetzner / DigitalOcean $4/month).
2. Install Dokploy with 1 command:
   ```bash
   curl -sSL https://dokploy.com/install.sh | sh
   ```
3. Open `http://<YOUR_VPS_IP>:3000` and create an admin user.
4. Add project $\rightarrow$ select **GitHub** `anuteshome/Bingo_Telegram_Bot`.
5. Choose **Docker Compose** (`docker-compose.yml`) or **Dockerfile**.
6. Dokploy automatically builds the container, manages Redis, and provisions free SSL certificates via Let's Encrypt!

---

### Option B: Render.com (100% Free Tier)
Render offers free hosting for web services and managed Redis.

1. Go to [render.com](https://render.com).
2. Create a **New Redis** instance (free tier).
3. Create a **New Web Service** $\rightarrow$ connect `Bingo_Telegram_Bot` repo.
4. Select **Dockerfile** runtime.
5. Set Environment Variables:
   - `BOT_TOKEN` = `7631583464:AAFpsgbtwfdxCCEwUvwhwyGhf-oo1TgzhQA`
   - `REDIS_URL` = `<YOUR_RENDER_REDIS_URL>`
   - `ENVIRONMENT` = `production`
6. Click **Create Web Service**.

---

## 🤖 Part 3: Update Telegram Bot Menu Button

Once your Vercel frontend domain is live (e.g. `https://bingo-telegram-bot.vercel.app`):

1. Open Telegram and talk to [@BotFather](https://t.me/BotFather).
2. Send `/setmenubutton`.
3. Select your bot (`@your_bingo_bot`).
4. Enter your Vercel URL: `https://bingo-telegram-bot.vercel.app`.
5. Done! Now whenever anyone opens your Telegram bot, the **Play** button directly launches your Mini App!
