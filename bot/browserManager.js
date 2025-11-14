const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');

puppeteer.use(StealthPlugin());

class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Initializing browser for Render environment...');
    
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--single-process'
      ],
      executablePath: this.getChromePath(),
      ignoreHTTPSErrors: true
    };

    console.log('🔧 Chrome executable path:', launchOptions.executablePath);

    try {
      this.browser = await puppeteer.launch(launchOptions);
      this.page = await this.browser.newPage();

      // Set random user agent
      const userAgent = new UserAgent();
      await this.page.setUserAgent(userAgent.toString());

      // Set random viewport
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 }
      ];
      const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
      await this.page.setViewport(randomViewport);

      // Stealth configurations
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { 
          get: () => [1, 2, 3, 4, 5] 
        });
      });

      this.page.setDefaultNavigationTimeout(30000);
      this.page.setDefaultTimeout(30000);

      console.log('✅ Browser initialized successfully');
      return this;

    } catch (error) {
      console.error('❌ Browser initialization failed:', error);
      throw error;
    }
  }

  getChromePath() {
    // Priority list of possible Chrome paths
    const possiblePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/chrome',
      '/snap/bin/chromium'
    ];

    // Return the first available path
    for (const path of possiblePaths) {
      if (path) return path;
    }

    // Fallback
    return 'chromium';
  }

  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
        console.log('✅ Browser closed successfully');
      } catch (error) {
        console.error('❌ Error closing browser:', error);
      }
    }
  }
}

module.exports = { BrowserManager };
