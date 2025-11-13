# Traffic_render
# Organic Traffic Generator 🌐

A sophisticated Node.js application that generates organic traffic to your website via Google Search with realistic user behavior simulation.

## Features

- 🎯 **Organic Traffic** - Traffic originates from Google Search results
- ⏱️ **Random Durations** - Each session has unique duration (45-120 seconds)
- 🔍 **Keyword Generation** - Auto-generates relevant search keywords
- 🖥️ **Device Variety** - Desktop and mobile device simulation
- 🔄 **Auto-looping** - Continuous traffic generation
- 📊 **Real-time Monitoring** - Live session monitoring and logs
- 🛡️ **Stealth Mode** - Uses Puppeteer Stealth plugin to avoid detection
- ⚡ **Render Optimized** - Special configuration for Render.com deployment

## Deployment Options

### 🚀 Deploy on Render.com (Recommended)

#### Quick Deploy
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

#### Manual Deployment
1. **Create Account**: Sign up at [Render.com](https://render.com)
2. **New Web Service**: Click "New +" → "Web Service"
3. **Connect Repository**: Connect your GitHub repository
4. **Configure Service**:
   - **Name**: `organic-traffic-bot`
   - **Environment**: `Node`
   - **Region**: Choose closest to your target audience
   - **Branch**: `main` or your preferred branch
   - **Build Command**: `npm install && npx puppeteer browsers install chrome`
   - **Start Command**: `node server.js`

5. **Environment Variables**:
   ```env
   NODE_ENV=production
   SESSION_SECRET=your-super-secret-key-change-this
   AUTO_LOOP=false
   LOOP_INTERVAL=1800000
   MAX_SESSIONS=5
   DEFAULT_TARGET_URL=https://your-website.com
