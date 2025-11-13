const { BrowserManager } = require('./browserManager');
const EventEmitter = require('events');

class TrafficGenerator extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.sessionLogs = new Map();
  }

  async startNewSession(config) {
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const session = {
      id: sessionId,
      status: 'starting',
      config: config,
      startTime: new Date(),
      browserManager: null,
      logs: []
    };

    this.sessions.set(sessionId, session);
    this.sessionLogs.set(sessionId, []);

    this.addSessionLog(sessionId, `Session ${sessionId} started with config: ${JSON.stringify(config)}`);

    // Start the session in the background
    this.runSession(sessionId).catch(error => {
      this.addSessionLog(sessionId, `Session error: ${error.message}`);
      session.status = 'error';
    });

    return sessionId;
  }

  async runSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'running';
    this.addSessionLog(sessionId, 'Session is now running');

    const browserManager = new BrowserManager();
    session.browserManager = browserManager;

    try {
      await browserManager.init();

      // Jika menggunakan traffic organic, buka Google search dulu
      if (session.config.useOrganicTraffic && session.config.googleSearchUrl) {
        this.addSessionLog(sessionId, `Starting organic traffic via Google search: ${session.config.googleSearchUrl}`);
        
        // Buka halaman Google search
        await browserManager.page.goto(session.config.googleSearchUrl, { 
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Tunggu beberapa detik untuk memuat hasil pencarian
        await browserManager.page.waitForTimeout(3000 + Math.random() * 4000);

        // Cari link yang menuju ke targetUrl di hasil pencarian
        const targetHostname = new URL(session.config.targetUrl).hostname;
        const linkSelector = `a[href*="${targetHostname}"]`;

        this.addSessionLog(sessionId, `Looking for link with selector: ${linkSelector}`);

        const links = await browserManager.page.$$eval(linkSelector, anchors => 
          anchors.map(anchor => anchor.href)
        );

        if (links.length > 0) {
          // Pilih link secara acak
          const randomLink = links[Math.floor(Math.random() * links.length)];
          this.addSessionLog(sessionId, `Found link: ${randomLink}, now clicking...`);

          // Klik link tersebut
          await browserManager.page.goto(randomLink, { 
            waitUntil: 'networkidle2',
            timeout: 30000
          });
        } else {
          this.addSessionLog(sessionId, `No links found with selector, going directly to target URL`);
          await browserManager.page.goto(session.config.targetUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000
          });
        }
      } else {
        // Langsung buka target URL
        this.addSessionLog(sessionId, `Direct traffic to: ${session.config.targetUrl}`);
        await browserManager.page.goto(session.config.targetUrl, { 
          waitUntil: 'networkidle2',
          timeout: 30000
        });
      }

      // Lakukan aktivitas di halaman dengan durasi random
      const duration = (session.config.visitDuration || 60) * 1000;
      this.addSessionLog(sessionId, `Starting activities for ${duration/1000} seconds`);

      // Simulasi aktivitas user
      await this.simulateUserActivities(browserManager, duration, sessionId);

      this.addSessionLog(sessionId, `Session completed successfully`);
      session.status = 'completed';

    } catch (error) {
      this.addSessionLog(sessionId, `Session error: ${error.message}`);
      session.status = 'error';
    } finally {
      await browserManager.close();
      session.endTime = new Date();
    }
  }

  async simulateUserActivities(browserManager, duration, sessionId) {
    const startTime = Date.now();
    const endTime = startTime + duration;

    while (Date.now() < endTime) {
      // Scroll acak
      const scrollAmount = Math.floor(Math.random() * 500) + 100;
      await browserManager.page.evaluate((scrollAmount) => {
        window.scrollBy(0, scrollAmount);
      }, scrollAmount);

      this.addSessionLog(sessionId, `Scrolled by ${scrollAmount}px`);

      // Tunggu antara 3-10 detik sebelum aktivitas berikutnya
      const waitTime = Math.random() * 7000 + 3000;
      await browserManager.page.waitForTimeout(waitTime);

      // Kadang-kadang klik link acak (dengan probabilitas 30%)
      if (Math.random() < 0.3) {
        try {
          const links = await browserManager.page.$$('a');
          if (links.length > 0) {
            const randomLink = links[Math.floor(Math.random() * links.length)];
            await randomLink.click();
            this.addSessionLog(sessionId, `Clicked a random link`);

            // Tunggu beberapa detik setelah klik
            await browserManager.page.waitForTimeout(5000);

            // Kembali ke halaman sebelumnya (jika mungkin)
            await browserManager.page.goBack();
            this.addSessionLog(sessionId, `Went back to previous page`);
          }
        } catch (error) {
          // Ignore errors when clicking random links
        }
      }
    }
  }

  addSessionLog(sessionId, message) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message };
    console.log(`[${sessionId}] ${message}`);

    const logs = this.sessionLogs.get(sessionId) || [];
    logs.push(logEntry);
    this.sessionLogs.set(sessionId, logs);

    // Emit event for real-time logging
    this.emit('sessionLog', { sessionId, logEntry });
  }

  getSessionLogs(sessionId) {
    return this.sessionLogs.get(sessionId) || [];
  }

  getAllSessions() {
    return Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      config: session.config
    }));
  }

  stopSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'stopping';
      this.addSessionLog(sessionId, 'Session stopping...');

      if (session.browserManager) {
        session.browserManager.close().catch(console.error);
      }

      session.status = 'stopped';
      session.endTime = new Date();
      this.addSessionLog(sessionId, 'Session stopped');
    }
  }

  stopAllSessions() {
    for (const sessionId of this.sessions.keys()) {
      this.stopSession(sessionId);
    }
  }

  clearAllSessions() {
    this.stopAllSessions();
    this.sessions.clear();
    this.sessionLogs.clear();
  }

  async testPuppeteer() {
    const browserManager = new BrowserManager();
    try {
      await browserManager.init();
      await browserManager.page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
      const title = await browserManager.page.title();
      await browserManager.close();
      return { success: true, title };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = TrafficGenerator;
