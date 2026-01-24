const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level.toUpperCase()}] ${message}`)
  ),
  transports: [
    new transports.File({ filename: 'logs/smart-monitor.log' }),
    new transports.Console()
  ]
});

class SmartMonitor {
  constructor() {
    this.services = {
      nextjs: { port: 9999, name: 'Next.js', restartCount: 0, lastRestart: 0 },
      pythonai: { port: 8888, name: 'Python AI', restartCount: 0, lastRestart: 0 },
      bossline: { port: 5001, name: 'Boss LINE Bot', restartCount: 0, lastRestart: 0 },
      knowledge: { port: 5002, name: 'Knowledge API', restartCount: 0, lastRestart: 0 },
      voice: { port: 8889, name: 'Voice Service', restartCount: 0, lastRestart: 0 }
    };
    this.checkInterval = 30000;
    this.maxRestartsPerHour = 5;
    this.recentRestarts = {};
  }

  async start() {
    logger.info('=== 智能監控系統啟動 ===');
    logger.info('監控服務:');
    Object.values(this.services).forEach(s => logger.info(`  - ${s.name} (port ${s.port})`));
    
    this.checkIntervalId = setInterval(() => this.checkAllServices(), this.checkInterval);
    await this.checkAllServices();
  }

  async checkAllServices() {
    const results = [];
    
    for (const [key, service] of Object.entries(this.services)) {
      const result = await this.checkService(key, service);
      results.push(result);
    }
    
    const healthy = results.filter(r => r.healthy).length;
    const total = results.length;
    
    if (healthy < total) {
      logger.warn(`健康檢查: ${healthy}/${total} 服務正常`);
    } else {
      logger.info(`健康檢查: ${total}/${total} 服務正常`);
    }
  }

  async checkService(key, service) {
    const isRunning = await this.isPortOpen(service.port);
    
    if (!isRunning) {
      logger.warn(`${service.name} (port ${service.port}) 未運行`);
      
      if (this.canRestart(key)) {
        logger.info(`嘗試重啟 ${service.name}...`);
        await this.restartService(key, service);
      } else {
        logger.error(`${service.name} 重啟次數過多，暫停自動重啟`);
      }
      
      return { service: key, healthy: false };
    }
    
    return { service: key, healthy: true };
  }

  async isPortOpen(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(3000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, '127.0.0.1');
    });
  }

  canRestart(key) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (!this.recentRestarts[key]) {
      this.recentRestarts[key] = [];
    }
    
    this.recentRestarts[key] = this.recentRestarts[key].filter(t => now - t < oneHour);
    
    if (this.recentRestarts[key].length >= this.maxRestartsPerHour) {
      return false;
    }
    
    return true;
  }

  async restartService(key, service) {
    try {
      logger.info(`重啟 ${service.name}...`);
      
      const result = await new Promise((resolve, reject) => {
        exec(`pm2 restart ${key}`, { cwd: __dirname }, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      
      this.recentRestarts[key].push(Date.now());
      service.restartCount++;
      service.lastRestart = Date.now();
      
      logger.info(`${service.name} 重啟成功 (第 ${service.restartCount} 次)`);
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const isRunning = await this.isPortOpen(service.port);
      if (isRunning) {
        logger.info(`${service.name} 確認已啟動`);
      } else {
        logger.error(`${service.name} 重啟後仍未運行`);
      }
      
    } catch (error) {
      logger.error(`重啟 ${service.name} 失敗: ${error.message}`);
    }
  }

  async analyzeErrorLogs() {
    const errorFiles = [
      'logs/pm2/nextjs-error.log',
      'logs/pm2/python-ai-error.log',
      'logs/pm2/boss-line-bot-error.log',
      'logs/pm2/knowledge-api-error.log',
      'logs/pm2/voice-service-error.log'
    ];
    
    for (const errorFile of errorFiles) {
      if (fs.existsSync(errorFile)) {
        const content = fs.readFileSync(errorFile, 'utf8');
        const recentErrors = this.getRecentErrors(content);
        
        if (recentErrors.length > 0) {
          logger.warn(`發現錯誤: ${path.basename(errorFile)}`);
          recentErrors.slice(0, 3).forEach(error => {
            logger.warn(`  - ${error}`);
          });
          
          const fix = await this.suggestFix(recentErrors[0]);
          if (fix) {
            logger.info(`建議修復: ${fix}`);
          }
        }
      }
    }
  }

  getRecentErrors(content) {
    const lines = content.split('\n');
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    return lines.filter(line => {
      if (!line.trim()) return false;
      
      const timestamp = this.extractTimestamp(line);
      if (!timestamp) return false;
      
      return (now - timestamp.getTime()) < fiveMinutes;
    });
  }

  extractTimestamp(line) {
    const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/);
    if (timestampMatch) {
      return new Date(timestampMatch[1]);
    }
    return null;
  }

  async suggestFix(error) {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('eaddrinuse')) {
      return '端口被佔用，檢查是否有進程衝突';
    }
    
    if (errorLower.includes('econnrefused')) {
      return '連接被拒絕，檢查依賴服務是否啟動';
    }
    
    if (errorLower.includes('timeout')) {
      return '連接超時，檢查網絡或服務響應時間';
    }
    
    if (errorLower.includes('permission')) {
      return '權限錯誤，檢查文件/目錄權限';
    }
    
    if (errorLower.includes('memory')) {
      return '內存不足，考慮增加 max_memory_restart 或優化代碼';
    }
    
    if (errorLower.includes('module not found')) {
      return '缺少依賴，執行 npm install 或 pip install';
    }
    
    return null;
  }

  async stop() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      logger.info('監控已停止');
    }
  }
}

const monitor = new SmartMonitor();

process.on('SIGINT', async () => {
  logger.info('收到停止信號...');
  await monitor.stop();
  process.exit(0);
});

monitor.start().catch(error => {
  logger.error(`監控啟動失敗: ${error.message}`);
  process.exit(1);
});
