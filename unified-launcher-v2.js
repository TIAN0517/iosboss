#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class UnifiedLauncherV2 {
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
    
    fs.appendFileSync(`${logDir}/unified-launcher-v2.log`, logMessage + '\n');
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
      
      socket.setTimeout(2000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true); // 端口被佔用
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false); // 端口空閒
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false); // 端口空閒
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
      
      // 如果服務正在運行但不在運行列表中，添加它
      if (isRunning && !this.runningServices.has(key)) {
        this.log(`🔗 Detected ${service.name} running on port ${service.port}`, 'info');
      }
    }
    
    return results;
  }

  async startService(key, service) {
    try {
      // 檢查服務是否已在運行
      const isRunning = await this.checkPort(service.port);
      if (isRunning) {
        this.log(`✅ ${service.name} is already running on port ${service.port}`, 'info');
        return true;
      }

      this.log(`🚀 Starting ${service.name}...`);
      
      const process = spawn(service.command, service.args, {
        cwd: path.join(__dirname, service.cwd),
        stdio: ['ignore', 'pipe', 'pipe'],
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
        if (output && !output.includes('INFO:') && !output.includes('error while attempting to bind')) {
          this.log(`[${service.name}] ${output}`, 'info');
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
      const started = await this.waitForService(service.port, 10000);
      if (started) {
        this.log(`✅ ${service.name} is responding on port ${service.port}`);
      } else {
        this.log(`⚠️ ${service.name} may not be ready yet`, 'warning');
      }
      
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

  async stopService(key) {
    const serviceInfo = this.runningServices.get(key);
    
    if (serviceInfo) {
      this.log(`🛑 Stopping ${serviceInfo.service.name}...`);
      
      try {
        if (serviceInfo.process && !serviceInfo.process.killed) {
          serviceInfo.process.kill('SIGTERM');
        }
      } catch (error) {
        this.log(`⚠️ Process termination not needed: ${error.message}`, 'warning');
      }
      
      // 等待優雅關閉
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 強制關閉
      try {
        if (serviceInfo.process && !serviceInfo.process.killed) {
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

  async startMissingServices() {
    this.log('🔍 Checking service status...');
    
    const results = await this.checkAllServices();
    const missingServices = [];
    
    for (const [key, result] of Object.entries(results)) {
      if (!result.running) {
        missingServices.push(key);
        this.log(`⚠️ ${result.service.name} is not running`, 'warning');
      } else {
        this.log(`✅ ${result.service.name} is already running`, 'info');
      }
    }
    
    if (missingServices.length === 0) {
      this.log('✅ All services are already running!', 'info');
      return true;
    }
    
    this.log(`🚀 Starting ${missingServices.length} missing services...`);
    
    // 按依賴關係啟動
    const startupOrder = ['pythonai', 'bossline', 'knowledge', 'voice', 'nextjs'];
    
    for (const key of startupOrder) {
      if (missingServices.includes(key)) {
        const service = this.services[key];
        await this.startService(key, service);
        
        // 等待一下再啟動下一個
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return true;
  }

  generateStatusReport() {
    const status = {
      timestamp: new Date().toISOString(),
      services: {},
      summary: {
        total: Object.keys(this.services).length,
        running: 0,
        critical: Object.values(this.services).filter(s => s.critical).length
      }
    };
    
    for (const [key, service] of Object.entries(this.services)) {
      const isRunning = this.runningServices.has(key);
      
      status.services[key] = {
        name: service.name,
        port: service.port,
        running: isRunning,
        critical: service.critical,
        uptime: 0,
        pid: null
      };
      
      // 如果沒有在內部運行列表中，檢查端口狀態
      if (!isRunning) {
        // 這個檢查應該同步進行，避免複雜的 Promise
        this.checkPort(service.port).then(available => {
          if (available) {
            status.services[key].running = true;
            status.summary.running++;
          }
        });
      } else {
        status.summary.running++;
      }
    }
    
    return status;
  }

  async run() {
    console.log('='.repeat(60));
    console.log('    🚀 九九瓦斯行 - 統一智能啟動工具 V2');
    console.log('='.repeat(60));
    
    try {
      // 檢查環境
      const checks = {
        nodejs: await this.checkCommand('node'),
        npm: await this.checkCommand('npm'),
        python: await this.checkCommand('python'),
        pip: await this.checkCommand('pip')
      };
      
      this.log('🔍 Environment check:', 'info');
      Object.entries(checks).forEach(([check, result]) => {
        this.log(`  ${check}: ${result ? '✅' : '❌'}`, result ? 'info' : 'error');
      });
      
      if (!checks.nodejs || !checks.npm || !checks.python) {
        this.log('❌ Missing required dependencies', 'error');
        return false;
      }
      
      // 檢查和啟動缺失的服務
      const success = await this.startMissingServices();
      
      if (success) {
        console.log('\n✅ Service check completed!');
        console.log('\n📊 Service Status:');
        
        // 顯示狀態
        const status = this.generateStatusReport();
        for (const [key, info] of Object.entries(status.services)) {
          const statusIcon = info.running ? '✅' : '❌';
          const uptime = info.uptime > 0 ? ` (uptime: ${Math.floor(info.uptime / 1000)}s)` : '';
          console.log(`  ${statusIcon} ${info.name} (${info.port})${uptime}`);
        }
        
        console.log('\n🔍 Service monitoring started');
        console.log('📝 Logs available in: logs/unified-launcher-v2.log');
        console.log('\n💡 Press Ctrl+C to stop this monitor');
        
        // 開始監控
        this.startMonitoring();
        
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

  startMonitoring() {
    this.monitorInterval = setInterval(async () => {
      const results = await this.checkAllServices();
      
      for (const [key, result] of Object.entries(results)) {
        if (!result.running && result.service.critical) {
          this.log(`⚠️ ${result.service.name} is not running`, 'warning');
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
}

// 如果直接運行這個腳本
if (require.main === module) {
  const launcher = new UnifiedLauncherV2();
  launcher.run();
}

module.exports = UnifiedLauncherV2;
