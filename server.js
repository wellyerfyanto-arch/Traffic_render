const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Security middleware untuk Render
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Session configuration untuk Render
app.use(session({
  secret: process.env.SESSION_SECRET || 'organic-traffic-bot-render-secret-key-' + Math.random().toString(36).substring(2),
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
  }
}));

// Import bot modules
const TrafficGenerator = require('./bot/trafficGenerator');
const botManager = new TrafficGenerator();

// Auto-looping configuration
const AUTO_LOOP_CONFIG = {
  enabled: process.env.AUTO_LOOP === 'true' || false,
  interval: parseInt(process.env.LOOP_INTERVAL) || 30 * 60 * 1000,
  maxSessions: parseInt(process.env.MAX_SESSIONS) || 5, // Reduced for Render
  targetUrl: process.env.DEFAULT_TARGET_URL || 'https://github.com'
};

// Global variable untuk auto-loop interval
let autoLoopInterval = null;

// Start auto-looping if enabled
if (AUTO_LOOP_CONFIG.enabled) {
  console.log('🔄 AUTO-LOOP: System starting with auto-looping enabled');
  startAutoLooping();
}

function startAutoLooping() {
  if (autoLoopInterval) {
    clearInterval(autoLoopInterval);
  }

  autoLoopInterval = setInterval(async () => {
    try {
      const activeSessions = botManager.getAllSessions().filter(s => s.status === 'running');
      
      if (activeSessions.length < AUTO_LOOP_CONFIG.maxSessions) {
        console.log(`🔄 AUTO-LOOP: Starting new automated session (${activeSessions.length + 1}/${AUTO_LOOP_CONFIG.maxSessions})`);
        
        const randomDuration = Math.floor(Math.random() * (120 - 45 + 1)) + 45; // 45-120 detik
        
        const sessionConfig = {
          profileCount: 1,
          proxyList: process.env.DEFAULT_PROXIES ? 
            process.env.DEFAULT_PROXIES.split(',').map(p => p.trim()).filter(p => p) : [],
          targetUrl: AUTO_LOOP_CONFIG.targetUrl,
          deviceType: Math.random() > 0.5 ? 'desktop' : 'mobile',
          isAutoLoop: true,
          maxRestarts: 3, // Reduced for Render
          useOrganicTraffic: true,
          visitDuration: randomDuration
        };

        await botManager.startNewSession(sessionConfig);
        
        console.log(`✅ AUTO-LOOP: Session started successfully with ${randomDuration}s duration`);
      } else {
        console.log(`⏸️ AUTO-LOOP: Maximum sessions reached (${activeSessions.length}/${AUTO_LOOP_CONFIG.maxSessions})`);
      }
    } catch (error) {
      console.error('❌ AUTO-LOOP: Error starting session:', error.message);
    }
  }, AUTO_LOOP_CONFIG.interval);
}

// Helper functions
function createGoogleSearchUrl(targetUrl, customKeywords = '') {
  try {
    const urlObj = new URL(targetUrl);
    const domain = urlObj.hostname.replace('www.', '');
    const domainName = domain.split('.')[0];
    
    let keywords = [];
    
    if (customKeywords && customKeywords.trim() !== '') {
      keywords = [customKeywords.trim()];
    } else {
      keywords = [
        `${domainName} website`,
        `what is ${domainName}`,
        `${domainName} services`,
        `visit ${domainName}`,
        `${domainName} official site`,
        `${domainName} platform`,
        `about ${domainName}`,
        `${domainName} reviews`,
        `${domainName} features`,
        `how to use ${domainName}`,
        `${domainName} benefits`,
        `${domainName} solutions`,
        `${domain} official website`,
        `best ${domainName} alternatives`,
        `${domainName} tutorial`
      ];
    }
    
    const selectedKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    const encodedKeyword = encodeURIComponent(selectedKeyword);
    
    console.log(`🔍 Selected keyword for ${domain}: "${selectedKeyword}"`);
    
    return {
      googleUrl: `https://www.google.com/search?q=${encodedKeyword}`,
      keyword: selectedKeyword
    };
  } catch (error) {
    console.error('Error creating Google search URL:', error);
    const fallbackSearch = encodeURIComponent(targetUrl);
    return {
      googleUrl: `https://www.google.com/search?q=${fallbackSearch}`,
      keyword: targetUrl
    };
  }
}

function generateRandomDuration() {
  return Math.floor(Math.random() * (120 - 45 + 1)) + 45;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/monitoring', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monitoring.html'));
});

// API Routes
app.post('/api/start-session', async (req, res) => {
  try {
    console.log('Starting new session with config:', req.body);
    
    const { profiles, proxies, targetUrl, deviceType, autoLoop, useOrganicTraffic, searchKeywords } = req.body;
    
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'Target URL is required'
      });
    }

    // Validasi URL
    try {
      new URL(targetUrl);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    let organicTrafficConfig = null;
    if (useOrganicTraffic) {
      organicTrafficConfig = createGoogleSearchUrl(targetUrl, searchKeywords);
      console.log(`🌐 Organic traffic configured: ${organicTrafficConfig.googleUrl}`);
    }

    const randomDuration = generateRandomDuration();

    const sessionConfig = {
      profileCount: Math.min(parseInt(profiles) || 1, 3), // Max 3 profiles di Render
      proxyList: proxies ? proxies.split('\n')
        .map(p => p.trim())
        .filter(p => p && p.includes(':')) : [],
      targetUrl: targetUrl,
      deviceType: deviceType || 'desktop',
      isAutoLoop: autoLoop || false,
      maxRestarts: autoLoop ? 3 : 0,
      useOrganicTraffic: useOrganicTraffic || false,
      googleSearchUrl: organicTrafficConfig ? organicTrafficConfig.googleUrl : null,
      searchKeyword: organicTrafficConfig ? organicTrafficConfig.keyword : null,
      visitDuration: randomDuration
    };

    console.log('Session config:', sessionConfig);
    console.log(`⏱️ Session duration: ${randomDuration} seconds`);

    const sessionId = await botManager.startNewSession(sessionConfig);
    
    res.json({ 
      success: true, 
      sessionId,
      message: `Session started successfully with ${randomDuration}s duration`,
      organicTraffic: useOrganicTraffic ? {
        googleUrl: organicTrafficConfig.googleUrl,
        keyword: organicTrafficConfig.keyword
      } : null
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/session-logs/:sessionId', (req, res) => {
  try {
    const logs = botManager.getSessionLogs(req.params.sessionId);
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error getting session logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/all-sessions', (req, res) => {
  try {
    const sessions = botManager.getAllSessions();
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error getting all sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stop-session/:sessionId', (req, res) => {
  try {
    botManager.stopSession(req.params.sessionId);
    res.json({ success: true, message: 'Session stopped' });
  } catch (error) {
    console.error('Error stopping session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stop-all-sessions', (req, res) => {
  try {
    botManager.stopAllSessions();
    res.json({ success: true, message: 'All sessions stopped' });
  } catch (error) {
    console.error('Error stopping all sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/clear-sessions', (req, res) => {
  try {
    botManager.clearAllSessions();
    res.json({ success: true, message: 'All sessions cleared' });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Auto-loop management
app.post('/api/auto-loop/start', (req, res) => {
  try {
    const { interval, maxSessions, targetUrl, useOrganicTraffic } = req.body;
    
    AUTO_LOOP_CONFIG.enabled = true;
    AUTO_LOOP_CONFIG.interval = Math.min(interval || AUTO_LOOP_CONFIG.interval, 60 * 60 * 1000); // Max 1 hour
    AUTO_LOOP_CONFIG.maxSessions = Math.min(maxSessions || AUTO_LOOP_CONFIG.maxSessions, 5); // Max 5 sessions
    AUTO_LOOP_CONFIG.targetUrl = targetUrl || AUTO_LOOP_CONFIG.targetUrl;
    AUTO_LOOP_CONFIG.useOrganicTraffic = useOrganicTraffic || true;
    
    startAutoLooping();
    
    res.json({
      success: true,
      message: `Auto-looping started with ${AUTO_LOOP_CONFIG.interval/60000} minute intervals`,
      config: AUTO_LOOP_CONFIG
    });
  } catch (error) {
    console.error('Error starting auto-loop:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auto-loop/stop', (req, res) => {
  try {
    AUTO_LOOP_CONFIG.enabled = false;
    if (autoLoopInterval) {
      clearInterval(autoLoopInterval);
      autoLoopInterval = null;
    }
    
    res.json({
      success: true,
      message: 'Auto-looping stopped'
    });
  } catch (error) {
    console.error('Error stopping auto-loop:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/auto-loop/status', (req, res) => {
  try {
    const activeSessions = botManager.getAllSessions().filter(s => s.status === 'running');
    
    res.json({
      success: true,
      config: AUTO_LOOP_CONFIG,
      activeSessions: activeSessions.length,
      totalSessions: botManager.getAllSessions().length
    });
  } catch (error) {
    console.error('Error getting auto-loop status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// System management
app.get('/api/test-puppeteer', async (req, res) => {
  try {
    const result = await botManager.testPuppeteer();
    res.json(result);
  } catch (error) {
    console.error('Puppeteer test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      platform: process.platform,
      render: true
    });
  }
});

// Health check untuk Render
app.get('/health', (req, res) => {
  const activeSessions = botManager.getAllSessions().filter(s => s.status === 'running');
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    autoLoop: {
      enabled: AUTO_LOOP_CONFIG.enabled,
      activeSessions: activeSessions.length,
      maxSessions: AUTO_LOOP_CONFIG.maxSessions,
      interval: AUTO_LOOP_CONFIG.interval
    }
  });
});

// Render-specific info
app.get('/api/render-info', (req, res) => {
  res.json({
    service: 'Organic Traffic Bot',
    optimizedFor: 'Render.com',
    features: [
      'Organic traffic via Google Search',
      'Random session durations',
      'Auto-looping capability',
      'Real-time monitoring',
      'Puppeteer with stealth plugin'
    ],
    limits: {
      maxSessions: 5,
      maxProfiles: 3,
      maxDuration: 120,
      maxRestarts: 3
    }
  });
});

// Error handlers
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `API endpoint not found: ${req.method} ${req.originalUrl}` 
  });
});

app.use((req, res) => {
  if (req.url.startsWith('/api/')) {
    res.status(404).json({ 
      success: false, 
      error: 'API endpoint not found' 
    });
  } else {
    res.status(404).send(`
      <html>
        <head>
          <title>404 - Page Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            a { color: #007cba; text-decoration: none; }
          </style>
        </head>
        <body>
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <a href="/">Go to Home Page</a>
        </body>
      </html>
    `);
  }
});

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    renderHint: 'Check Render logs for detailed error information'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Platform: ${process.platform}`);
  console.log(`🔄 Auto-loop: ${AUTO_LOOP_CONFIG.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`⏰ Auto-loop interval: ${AUTO_LOOP_CONFIG.interval/60000} minutes`);
  console.log(`📈 Max sessions: ${AUTO_LOOP_CONFIG.maxSessions}`);
  console.log(`🎯 Target URL: ${AUTO_LOOP_CONFIG.targetUrl}`);
  console.log(`🌐 Organic traffic: ENABLED`);
  console.log(`⚡ Optimized for Render.com`);
});

// Graceful shutdown untuk Render
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  if (autoLoopInterval) {
    clearInterval(autoLoopInterval);
  }
  botManager.stopAllSessions();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM (Render shutdown), shutting down gracefully...');
  if (autoLoopInterval) {
    clearInterval(autoLoopInterval);
  }
  botManager.stopAllSessions();
  process.exit(0);
});
