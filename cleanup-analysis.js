#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class CodeCleanup {
  constructor() {
    this.apiDir = 'app/api';
    this.backupDir = 'app/api_backup';
    this.oldDir = 'app/api_old';
    this.cleanupLog = [];
  }

  async analyzeDuplicates() {
    console.log('🔍 Analyzing duplicate API routes...');
    
    const activeRoutes = this.getRoutes(this.apiDir);
    const backupRoutes = this.getRoutes(this.backupDir);
    const oldRoutes = this.getRoutes(this.oldDir);
    
    console.log(`Found:`);
    console.log(`- Active routes: ${activeRoutes.length}`);
    console.log(`- Backup routes: ${backupRoutes.length}`);
    console.log(`- Old routes: ${oldRoutes.length}`);
    
    // 分析重複
    const duplicates = this.findDuplicates(activeRoutes, backupRoutes, oldRoutes);
    
    return {
      active: activeRoutes,
      backup: backupRoutes,
      old: oldRoutes,
      duplicates
    };
  }

  getRoutes(dir) {
    const routes = [];
    
    if (!fs.existsSync(dir)) return routes;
    
    const scanDirectory = (dirPath, parentPath = '') => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const routePath = path.join(parentPath, entry.name);
          scanDirectory(fullPath, routePath);
        } else if (entry.name === 'route.ts') {
          const routePath = parentPath;
          const filePath = fullPath;
          const content = fs.readFileSync(filePath, 'utf8');
          const methods = this.extractMethods(content);
          
          routes.push({
            path: routePath,
            file: filePath,
            content,
            methods,
            size: content.length
          });
        }
      }
    }
    
    scanDirectory(dir);
    return routes;
  }

  extractMethods(content) {
    const methods = [];
    if (content.includes('export async function GET')) methods.push('GET');
    if (content.includes('export async function POST')) methods.push('POST');
    if (content.includes('export async function PUT')) methods.push('PUT');
    if (content.includes('export async function DELETE')) methods.push('DELETE');
    return methods;
  }

  findDuplicates(active, backup, old) {
    const duplicates = [];
    const seen = new Set();
    
    // 檢查 backup 和 old 是否與 active 重複
    for (const route of [...backup, ...old]) {
      const normalizedPath = route.path.replace(/\[\w+\]/g, ':id');
      
      // 檢查是否在 active 中有相同或相似的路由
      const similarActive = active.find(activeRoute => {
        const activePath = activeRoute.path.replace(/\[\w+\]/g, ':id');
        return this.arePathsSimilar(activePath, normalizedPath);
      });
      
      if (similarActive) {
        duplicates.push({
          path: normalizedPath,
          active: similarActive,
          duplicate: route,
          reason: this.analyzeDuplicationReason(similarActive, route)
        });
      }
    }
    
    return duplicates;
  }

  arePathsSimilar(path1, path2) {
    // 簡單的路徑相似性檢查
    return path1.toLowerCase() === path2.toLowerCase() ||
           path1.toLowerCase().includes(path2.toLowerCase()) ||
           path2.toLowerCase().includes(path1.toLowerCase());
  }

  analyzeDuplicationReason(active, duplicate) {
    const activeSize = active.size;
    const duplicateSize = duplicate.size;
    
    if (Math.abs(activeSize - duplicateSize) < 100) {
      return 'Similar content size - likely identical';
    } else if (activeSize > duplicateSize) {
      return 'Active version has more content';
    } else {
      return 'Duplicate version has more content';
    }
  }

  generateCleanupReport(analysis) {
    const report = {
      summary: {
        totalActive: analysis.active.length,
        totalBackup: analysis.backup.length,
        totalOld: analysis.old.length,
        duplicates: analysis.duplicates.length
      },
      recommendations: [],
      cleanupPlan: []
    };

    // 生成清理建議
    for (const dup of analysis.duplicates) {
      const recommendation = {
        path: dup.path,
        activeFile: dup.active.file,
        duplicateFile: dup.duplicate.file,
        reason: dup.reason,
        action: this.determineCleanupAction(dup)
      };
      report.recommendations.push(recommendation);
    }

    return report;
  }

  determineCleanupAction(dup) {
    // 決定清理動作
    if (dup.reason.includes('Active version has more content')) {
      return 'DELETE_DUPLICATE'; // 刪除重複的
    } else if (dup.reason.includes('Duplicate version has more content')) {
      return 'REPLACE_ACTIVE_WITH_DUPLICATE'; // 用重複版本替換活躍版本
    } else {
      return 'DELETE_DUPLICATE'; // 默認刪除重複版本
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `api_backup_before_cleanup_${timestamp}`;
    
    console.log(`📦 Creating backup: ${backupName}`);
    
    // 備份當前的 api_backup 和 api_old
    if (fs.existsSync(this.backupDir)) {
      fs.renameSync(this.backupDir, `${backupName}_backup`);
      this.cleanupLog.push(`Renamed ${this.backupDir} to ${backupName}_backup`);
    }
    
    if (fs.existsSync(this.oldDir)) {
      fs.renameSync(this.oldDir, `${backupName}_old`);
      this.cleanupLog.push(`Renamed ${this.oldDir} to ${backupName}_old`);
    }
  }

  async executeCleanup(plan) {
    console.log('🧹 Executing cleanup plan...');
    
    for (const rec of plan.recommendations) {
      if (rec.action === 'DELETE_DUPLICATE') {
        console.log(`🗑️ Deleting: ${rec.duplicateFile}`);
        fs.unlinkSync(rec.duplicateFile);
        this.cleanupLog.push(`Deleted duplicate: ${rec.duplicateFile}`);
      } else if (rec.action === 'REPLACE_ACTIVE_WITH_DUPLICATE') {
        console.log(`🔄 Replacing: ${rec.activeFile} with ${rec.duplicateFile}`);
        // 備份原文件
        fs.renameSync(rec.activeFile, `${rec.activeFile}.backup`);
        fs.renameSync(rec.duplicateFile, rec.activeFile);
        this.cleanupLog.push(`Replaced ${rec.activeFile} with ${rec.duplicateFile}`);
      }
    }
  }

  generateCleanupLog() {
    const log = `# Code Cleanup Report\n\nGenerated: ${new Date().toLocaleString()}\n\n## Cleanup Log\n\n`;
    
    this.cleanupLog.forEach(action => {
      log += `- ${action}\n`;
    });
    
    return log;
  }
}

async function main() {
  const cleanup = new CodeCleanup();
  
  console.log('🚀 Starting code cleanup analysis...');
  
  // 分析重複
  const analysis = await cleanup.analyzeDuplicates();
  
  // 生成清理計劃
  const plan = cleanup.generateCleanupReport(analysis);
  
  console.log(`\n📊 Cleanup Analysis:`);
  console.log(`- Active routes: ${plan.summary.totalActive}`);
  console.log(`- Backup routes: ${plan.summary.totalBackup}`);
  console.log(`- Old routes: ${plan.summary.totalOld}`);
  console.log(`- Duplicates found: ${plan.summary.duplicates}`);
  
  if (plan.recommendations.length > 0) {
    console.log(`\n🔍 Recommendations:`);
    plan.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec.path} - ${rec.action}`);
      console.log(`   Active: ${rec.activeFile}`);
      console.log(`   Duplicate: ${rec.duplicateFile}`);
      console.log(`   Reason: ${rec.reason}`);
      console.log('');
    });
    
    // 詢問是否執行清理
    console.log('\n❓ Do you want to execute the cleanup? (y/n)');
    // 暫時不執行，等待用戶確認
  } else {
    console.log('\n✅ No duplicates found!');
  }
  
  // 保存報告
  fs.writeFileSync('CLEANUP_ANALYSIS.json', JSON.stringify(plan, null, 2));
  console.log('\n📄 Analysis saved to: CLEANUP_ANALYSIS.json');
}

main().catch(console.error);
