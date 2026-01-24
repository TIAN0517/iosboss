#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class UnifiedLauncher {
  constructor() {
    this.services = {
      nextjs: {
        name: 'Next.js',
        port: 9999,
        command: 'npm',
        args: ['run', 'dev'],
        cwd: '.',
        critical: true
      },
      pythonai: {
        name: 'Python AI',
        port: 8888,
        command: 'python',
        args: ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8888'],
        cwd: 'line_bot_ai',
        critical: true
      },
      bossline: {
        name: 'Boss LINE Bot',
        port: 5001,
        command: 'python',
        args: ['boss_line_bot.py'],
        cwd: 'line_bot_ai',
        critical: true
      },
      knowledge: {
        name: 'Knowledge API',
        port: 5002,
        command: 'python',
        args: ['app\\knowledge_api.py'],
        cwd: 'line_bot_ai',
        critical: false
      },
      voice: {
        name: 'Voice Service',
        port: 8889,
        command: 'python',
        args: ['ai_voice_chat.py'],
        cwd: 'line_bot_ai',
        critical: false
      }
    };
    
    this.runningServices = new Map();
    this.checkInterval = 30000;
    this.maxRestartsPerHour = 5;
    this.recentRestarts = {};
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    
    console.log(logMessage);
    
    // 創建日誌目錄
    const logDir = 'logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(`${logDir}/unified-launcher.log`, logMessage + '\n');
  }

  async detectSystem() {
    this.log('🔍 Detecting system state...');
    
    const checks = {
      nodejs: await this.checkCommand('node'),
      npm: await this.checkCommand('npm'),
      python: await this.checkCommand('python'),
      pip: await this.checkCommand('pip'),
      nextjs: fs.existsSync('./package.json'),
      pythonEnv: fs.existsSync('./line_bot_ai/app/main.py')
    };
    
    this.log('System detection results:');
    Object.entries(checks).forEach(([check, result]) => {
      this.log(`  ${check}: ${result ? '✅' : '❌'}`);
    });
    
    return checks;
  }

  async checkCommand(command) {
    return new Promise((resolve) => {
      exec(`where ${command}`, (error) => {
        resolve(!error);
      });
    });
  }

  async checkPort(port) {
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
      
      socket.on('error', (error) => {
        if (error.code === 'ECONNREFUSED') {
          // 連接被拒絕 - 端口沒有服務
          socket.destroy();
          resolve(false);
        } else {
          // 其他錯誤 - 視為連接成功
          socket.destroy();
          resolve(true);
        }
      });
      
      socket.connect(port, '127.0.0.1');
    });
  }

  async checkAllServices() {
    const results = {};
    
    for (const [key, service] of Object.entries(this.services)) {
      const isRunning = await this.checkPort(service.port);
      results[key] = {
        running: isRunning,
        service: service
      };
    }
    
    return results;
  }

  async startService(key, service) {
    try {
      this.log(`🚀 Starting ${service.name}...`);
      
      const process = spawn(service.command, service.args, {
        cwd: path.join(__dirname, service.cwd),
        stdio: 'pipe',
        detached: false
      });
      
      // 監控進程輸出
      process.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          this.log(`[${service.name}] ${output}`, 'info');
        }
      });
      
      process.stderr?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          this.log(`[${service.name}] ERROR: ${output}`, 'error');
        }
      });
      
      process.on('exit', (code, signal) => {
        this.log(`[${service.name}] Process exited with code ${code}`, 'warning');
        this.runningServices.delete(key);
        
        // 自動重啟（如果需要）
        if (service.critical && code !== 0) {
          this.handleServiceRestart(key, service);
        }
      });
      
      this.runningServices.set(key, {
        process,
        service,
        startTime: Date.now()
      });
      
      this.log(`✅ ${service.name} started successfully`);
      
      // 等待服務啟動
      await this.waitForService(service.port);
      
      return true;
    } catch (error) {
      this.log(`❌ Failed to start ${service.name}: ${error.message}`, 'error');
      return false;
    }
  }

  async waitForService(port, maxWait = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const isRunning = await this.checkPort(port);
      if (isRunning) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
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

  handleServiceRestart(key, service) {
    if (!this.canRestart(key)) {
      this.log(`⚠️ ${service.name} restart limit reached, skipping`, 'warning');
      return;
    }
    
    this.recentRestarts[key].push(Date.now());
    
    this.log(`🔄 Auto-restarting ${service.name}...`);
    
    setTimeout(async () => {
      await this.startService(key, service);
    }, 5000);
  }

  async stopService(key) {
    const serviceInfo = this.runningServices.get(key);
    
    if (serviceInfo) {
      this.log(`🛑 Stopping ${serviceInfo.service.name}...`);
      
      try {
        serviceInfo.process.kill('SIGTERM');
      } catch (error) {
        this.log(`⚠️ Process already terminated: ${error.message}`, 'warning');
      }
      
      // 等待優雅關閉
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 強制關閉
      try {
        if (!serviceInfo.process.killed) {
          serviceInfo.process.kill('SIGKILL');
        }
      } catch (error) {
        this.log(`⚠️ Force kill not needed: ${error.message}`, 'warning');
      }
      
      this.runningServices.delete(key);
      this.log(`✅ ${serviceInfo.service.name} stopped`);
    }
  }

  async stopAllServices() {
    this.log('🛑 Stopping all services...');
    
    for (const [key] of this.runningServices) {
      await this.stopService(key);
    }
  }

  async startAllServices() {
    this.log('🚀 Starting all services...');
    
    const systemCheck = await this.detectSystem();
    
    if (!systemCheck.nodejs || !systemCheck.npm) {
      this.log('❌ Node.js or npm not found. Please install Node.js first.', 'error');
      return false;
    }
    
    // 停止現有服務
    await this.stopAllServices();
    
    // 按依賴關係啟動
    const startupOrder = ['pythonai', 'bossline', 'knowledge', 'voice', 'nextjs'];
    
    for (const key of startupOrder) {
      const service = this.services[key];
      await this.startService(key, service);
      
      // 等待一下再啟動下一個
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return true;
  }

  startMonitoring() {
    this.log('🔍 Starting service monitoring...');
    
    this.monitorInterval = setInterval(async () => {
      const results = await this.checkAllServices();
      
      for (const [key, result] of Object.entries(results)) {
        if (!result.running && result.service.critical) {
          this.log(`⚠️ ${result.service.name} is not running`, 'warning');
          
          if (this.canRestart(key)) {
            this.log(`🔄 Restarting ${result.service.name}...`);
            await this.startService(key, result.service);
          }
        }
      }
    }, this.checkInterval);
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.log('🔍 Service monitoring stopped');
    }
  }

  generateStatusReport() {
    const status = {
      timestamp: new Date().toISOString(),
      services: {},
      summary: {
        total: Object.keys(this.services).length,
        running: this.runningServices.size,
        critical: Object.values(this.services).filter(s => s.critical).length
      }
    };
    
    for (const [key, service] of Object.entries(this.services)) {
      const isRunning = this.runningServices.has(key);
      const serviceInfo = this.runningServices.get(key);
      
      status.services[key] = {
        name: service.name,
        port: service.port,
        running: isRunning,
        critical: service.critical,
        uptime: serviceInfo ? Date.now() - serviceInfo.startTime : 0,
        pid: serviceInfo ? serviceInfo.process.pid : null
      };
    }
    
    return status;
  }

  async run() {
    console.log('='.repeat(60));
    console.log('    🚀 九九瓦斯行 - 統一智能啟動工具');
    console.log('='.repeat(60));
    
    try {
      // 檢測系統
      await this.detectSystem();
      
      // 啟動所有服務
      const success = await this.startAllServices();
      
      if (success) {
        console.log('\n✅ All services started successfully!');
        console.log('\n📊 Service Status:');
        
        // 顯示狀態
        const status = this.generateStatusReport();
        for (const [key, info] of Object.entries(status.services)) {
          const statusIcon = info.running ? '✅' : '❌';
          const uptime = info.uptime > 0 ? ` (uptime: ${Math.floor(info.uptime / 1000)}s)` : '';
          console.log(`  ${statusIcon} ${info.name} (${info.port})${uptime}`);
        }
        
        // 開始監控
        this.startMonitoring();
        
        console.log('\n🔍 Service monitoring started');
        console.log('📝 Logs available in: logs/unified-launcher.log');
        console.log('\n💡 Press Ctrl+C to stop all services');
        
        // 優雅關閉處理
        process.on('SIGINT', async () => {
          console.log('\n🛑 Shutting down...');
          await this.stopAllServices();
          this.stopMonitoring();
          process.exit(0);
        });
        
        // 保持程序運行
        return new Promise(() => {});
      } else {
        console.log('\n❌ Failed to start some services');
        return false;
      }
    } catch (error) {
      this.log(`Launcher error: ${error.message}`, 'error');
      console.error('\n❌ Launcher error:', error.message);
      return false;
    }
  }
}

// 如果直接運行這個腳本
if (require.main === module) {
  const launcher = new UnifiedLauncher();
  launcher.run();
}

module.exports = UnifiedLauncher;
