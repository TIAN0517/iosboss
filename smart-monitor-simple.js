const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class SimpleMonitor {
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

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    
    // 写入日志文件
    const logDir = 'logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(`${logDir}/smart-monitor.log`, `[${timestamp}] ${message}\n`);
  }

  async start() {
    this.log('=== 智能监控系统启动 ===');
    this.log('监控服务:');
    Object.values(this.services).forEach(s => this.log(`  - ${s.name} (port ${s.port})`));
    
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
      this.log(`健康检查: ${healthy}/${total} 服务正常`);
    } else {
      this.log(`健康检查: ${total}/${total} 服务正常`);
    }
  }

  async checkService(key, service) {
    const isRunning = await this.isPortOpen(service.port);
    
    if (!isRunning) {
      this.log(`${service.name} (port ${service.port}) 未运行`);
      
      if (this.canRestart(key)) {
        this.log(`尝试重启 ${service.name}...`);
        await this.restartService(key, service);
      } else {
        this.log(`${service.name} 重启次数过多，暂停自动重启`);
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
      this.log(`重启 ${service.name}...`);
      
      let command, args;
      
      switch (key) {
        case 'nextjs':
          command = 'npm';
          args = ['run', 'dev'];
          break;
        case 'pythonai':
          command = 'python';
          args = ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8888'];
          break;
        case 'bossline':
          command = 'python';
          args = ['boss_line_bot.py'];
          break;
        case 'knowledge':
          command = 'python';
          args = ['app\\knowledge_api.py'];
          break;
        case 'voice':
          command = 'python';
          args = ['ai_voice_chat.py'];
          break;
        default:
          throw new Error(`未知服务: ${key}`);
      }
      
      // 切换到对应目录
      const cwd = key === 'nextjs' ? __dirname : path.join(__dirname, 'line_bot_ai');
      
      // 启动进程
      const process = spawn(command, args, {
        cwd: cwd,
        stdio: 'pipe',
        detached: true
      });
      
      this.recentRestarts[key].push(Date.now());
      service.restartCount++;
      service.lastRestart = Date.now();
      
      this.log(`${service.name} 重启成功 (第 ${service.restartCount} 次)`);
      
      // 等待5秒后检查是否真的启动了
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const isRunning = await this.isPortOpen(service.port);
      if (isRunning) {
        this.log(`${service.name} 确认已启动`);
      } else {
        this.log(`${service.name} 重启后仍未运行`);
      }
      
    } catch (error) {
      this.log(`重启 ${service.name} 失败: ${error.message}`);
    }
  }

  async stop() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.log('监控已停止');
    }
  }
}

const monitor = new SimpleMonitor();

process.on('SIGINT', async () => {
  this.log('收到停止信号...');
  await monitor.stop();
  process.exit(0);
});

monitor.start().catch(error => {
  this.log(`监控启动失败: ${error.message}`);
  process.exit(1);
});
