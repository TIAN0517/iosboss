#!/usr/bin/env node

const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');

class SimpleServiceManager {
  constructor() {
    this.services = [
      { name: 'Next.js', port: 9999, cmd: 'npm', args: ['run', 'dev'], cwd: '.', critical: true },
      { name: 'Python AI', port: 8888, cmd: 'python', args: ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8888'], cwd: 'line_bot_ai', critical: true },
      { name: 'Boss LINE Bot', port: 5001, cmd: 'python', args: ['boss_line_bot.py'], cwd: 'line_bot_ai', critical: true },
      { name: 'Knowledge API', port: 5002, cmd: 'python', args: ['app\\knowledge_api.py'], cwd: 'line_bot_ai', critical: false },
      { name: 'Voice Service', port: 8889, cmd: 'python', args: ['ai_voice_chat.py'], cwd: 'line_bot_ai', critical: false }
    ];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
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

  async checkAllServices() {
    this.log('🔍 Checking service status...');
    const results = [];
    
    for (const service of this.services) {
      const isRunning = await this.checkPort(service.port);
      results.push({
        ...service,
        running: isRunning,
        status: isRunning ? '✅' : '❌'
      });
    }
    
    return results;
  }

  async startService(service) {
    this.log(`🚀 Starting ${service.name}...`);
    
    const process = spawn(service.cmd, service.args, {
      cwd: service.cwd === '.' ? process.cwd() : service.cwd,
      stdio: 'ignore'
    });
    
    this.log(`✅ ${service.name} started successfully`);
    
    // 等待啟動
    const started = await this.waitForService(service.port, 8000);
    return started;
  }

  async waitForService(port, timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const isRunning = await this.checkPort(port);
      if (isRunning) return true;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
  }

  async startMissingServices() {
    const results = await this.checkAllServices();
    const missing = results.filter(s => !s.running);
    
    if (missing.length === 0) {
      this.log('✅ All services are already running!');
      return true;
    }
    
    this.log(`🚀 Starting ${missing.length} missing services...`);
    
    for (const service of missing) {
      await this.startService(service);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return true;
  }

  generateStatusTable(results) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 SERVICE STATUS REPORT');
    console.log('='.repeat(70));
    console.log('Service Name'.padEnd(20) + 'Port'.padEnd(8) + 'Status'.padEnd(10) + 'Critical');
    console.log('-'.repeat(70));
    
    for (const result of results) {
      const critical = result.critical ? '🔴' : '🟡';
      console.log(
        result.name.padEnd(20) + 
        result.port.toString().padEnd(8) + 
        result.status.padEnd(10) + 
        critical
      );
    }
    
    const runningCount = results.filter(s => s.running).length;
    console.log('-'.repeat(70));
    console.log(`Total: ${runningCount}/${results.length} services running`);
    console.log('='.repeat(70) + '\n');
  }

  async run() {
    console.log('🚀 九九瓦斯行 - 簡化服務管理器');
    console.log('='.repeat(50));
    
    try {
      const results = await this.checkAllServices();
      this.generateStatusTable(results);
      
      const missing = results.filter(s => !s.running);
      if (missing.length > 0) {
        console.log(`⚠️ Found ${missing.length} missing services:`);
        missing.forEach(s => console.log(`  - ${s.name} (port ${s.port})`));
        console.log('\n🚀 Starting missing services...\n');
        
        for (const service of missing) {
          await this.startService(service);
        }
        
        // 重新檢查
        const finalResults = await this.checkAllServices();
        this.generateStatusTable(finalResults);
        
        const finalMissing = finalResults.filter(s => !s.running);
        if (finalMissing.length === 0) {
          this.log('✅ All services are now running!');
        } else {
          this.log('⚠️ Some services failed to start', 'warning');
        }
      } else {
        this.log('✅ All services are running perfectly!');
      }
      
      console.log('\n🔍 Continuous monitoring (press Ctrl+C to exit)...');
      
      // 持續監控
      const monitorInterval = setInterval(async () => {
        const currentResults = await this.checkAllServices();
        const failed = currentResults.filter(s => !s.running && s.critical);
        
        if (failed.length > 0) {
          this.log(`⚠️ Critical services down: ${failed.map(s => s.name).join(', ')}`, 'warning');
        }
      }, 30000);
      
      // 優雅關閉
      process.on('SIGINT', () => {
        clearInterval(monitorInterval);
        console.log('\n🛑 Monitoring stopped');
        process.exit(0);
      });
      
    } catch (error) {
      this.log(`❌ Error: ${error.message}`, 'error');
      return false;
    }
  }
}

// 執行
if (require.main === module) {
  const manager = new SimpleServiceManager();
  manager.run();
}

module.exports = SimpleServiceManager;
