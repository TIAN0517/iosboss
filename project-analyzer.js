#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ProjectAnalyzer {
  constructor() {
    this.results = {
      system: {},
      apis: {},
      components: {},
      issues: [],
      recommendations: []
    };
  }

  async analyze() {
    console.log('🔍 Starting comprehensive project analysis...');
    
    await this.analyzeSystem();
    await this.analyzeAPIs();
    await this.analyzeComponents();
    await this.generateRecommendations();
    
    return this.generateReport();
  }

  async analyzeSystem() {
    console.log('📊 Analyzing system structure...');
    
    const checks = {
      nextjs: fs.existsSync('./package.json'),
      python: fs.existsSync('./line_bot_ai'),
      node_modules: fs.existsSync('./node_modules'),
      dist: fs.existsSync('./.next'),
      logs: fs.existsSync('./logs'),
      env: fs.existsSync('./.env')
    };
    
    this.results.system = {
      structure: checks,
      totalFiles: this.countFiles('./'),
      size: this.getDirectorySize('./')
    };
  }

  async analyzeAPIs() {
    console.log('🔌 Analyzing API routes...');
    
    const apiDir = './app/api';
    const backupDir = './app/api_backup';
    const oldDir = './app/api_old';
    
    const activeAPIs = fs.existsSync(apiDir) ? this.countRouteFiles(apiDir) : 0;
    const backupAPIs = fs.existsSync(backupDir) ? this.countRouteFiles(backupDir) : 0;
    const oldAPIs = fs.existsSync(oldDir) ? this.countRouteFiles(oldDir) : 0;
    
    this.results.apis = {
      active: activeAPIs,
      backup: backupAPIs,
      old: oldAPIs,
      total: activeAPIs + backupAPIs + oldAPIs,
      duplicates: backupAPIs + oldAPIs
    };
  }

  async analyzeComponents() {
    console.log('🧩 Analyzing components...');
    
    const srcComponents = './src/components';
    const appComponents = './app/components';
    
    const srcComponentCount = fs.existsSync(srcComponents) ? 
      this.countFiles(srcComponents) : 0;
    const appComponentCount = fs.existsSync(appComponents) ? 
      this.countFiles(appComponents) : 0;
    
    this.results.components = {
      src: srcComponentCount,
      app: appComponentCount,
      total: srcComponentCount + appComponentCount
    };
  }

  countFiles(dir) {
    if (!fs.existsSync(dir)) return 0;
    
    const files = fs.readdirSync(dir);
    let count = 0;
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        count += this.countFiles(fullPath);
      } else {
        count++;
      }
    }
    
    return count;
  }

  countRouteFiles(dir) {
    if (!fs.existsSync(dir)) return 0;
    
    const files = fs.readdirSync(dir);
    let count = 0;
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        count += this.countRouteFiles(fullPath);
      } else if (file === 'route.ts') {
        count++;
      }
    }
    
    return count;
  }

  getDirectorySize(dir) {
    if (!fs.existsSync(dir)) return 0;
    
    const files = fs.readdirSync(dir);
    let totalSize = 0;
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        totalSize += this.getDirectorySize(fullPath);
      } else {
        totalSize += stat.size;
      }
    }
    
    return totalSize;
  }

  async generateRecommendations() {
    console.log('💡 Generating recommendations...');
    
    // 基於分析結果生成建議
    if (this.results.apis.duplicates > 50) {
      this.results.recommendations.push({
        priority: 'HIGH',
        category: 'Code Duplication',
        issue: `Found ${this.results.apis.duplicates} duplicate API routes`,
        recommendation: 'Remove duplicate API directories (api_backup, api_old)',
        impact: 'High - Reduces code maintenance burden'
      });
    }
    
    if (!this.results.system.structure.logs) {
      this.results.recommendations.push({
        priority: 'MEDIUM',
        category: 'Logging',
        issue: 'No logs directory found',
        recommendation: 'Create logs directory for better monitoring',
        impact: 'Medium - Improves debugging capabilities'
      });
    }
    
    if (this.results.system.structure.node_modules && this.results.system.structure.dist) {
      const nodeModulesSize = this.getDirectorySize('./node_modules');
      const distSize = this.getDirectorySize('./.next');
      
      if (nodeModulesSize > 100 * 1024 * 1024) { // 100MB
        this.results.recommendations.push({
          priority: 'LOW',
          category: 'Performance',
          issue: `node_modules directory is ${(nodeModulesSize / 1024 / 1024).toFixed(1)}MB`,
          recommendation: 'Consider using .gitignore for node_modules',
          impact: 'Low - Improves repository size'
        });
      }
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalAPIs: this.results.apis.total,
        duplicateAPIs: this.results.apis.duplicates,
        activeAPIs: this.results.apis.active,
        totalComponents: this.results.components.total,
        systemFiles: this.results.system.totalFiles,
        systemSize: this.formatBytes(this.results.system.size)
      },
      details: this.results,
      tools: {
        available: [
          'unified-launcher.js - Smart service launcher',
          'start-unified.bat - Unified startup script',
          'scan-api-simple.js - API inventory tool',
          'API_ROUTES_INVENTORY.md - API documentation'
        ],
        nextjs: {
          status: this.results.system.structure.nextjs ? 'Available' : 'Missing',
          commands: [
            'npm run dev - Start development server',
            'npm run build - Build for production',
            'npm start - Start production server'
          ]
        },
        python: {
          status: this.results.system.structure.python ? 'Available' : 'Missing',
          services: [
            'Python AI (port 8888)',
            'Boss LINE Bot (port 5001)',
            'Knowledge API (port 5002)',
            'Voice Service (port 8889)'
          ]
        }
      }
    };
    
    return report;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 執行分析
async function main() {
  const analyzer = new ProjectAnalyzer();
  const report = await analyzer.analyze();
  
  // 保存 JSON 報告
  fs.writeFileSync('PROJECT_ANALYSIS.json', JSON.stringify(report, null, 2));
  
  // 生成 Markdown 報告
  const markdown = generateMarkdownReport(report);
  fs.writeFileSync('PROJECT_ANALYSIS.md', markdown);
  
  console.log('\\n✅ Project analysis completed!');
  console.log('📄 Reports generated:');
  console.log('   - PROJECT_ANALYSIS.json');
  console.log('   - PROJECT_ANALYSIS.md');
  
  return report;
}

function generateMarkdownReport(report) {
  let markdown = `# Project Analysis Report\n\n`;
  markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
  
  // Summary
  markdown += `## Summary\n\n`;
  markdown += `- **Total API Routes**: ${report.summary.totalAPIs}\n`;
  markdown += `- **Active API Routes**: ${report.summary.activeAPIs}\n`;
  markdown += `- **Duplicate API Routes**: ${report.summary.duplicateAPIs}\n`;
  markdown += `- **Total Components**: ${report.summary.totalComponents}\n`;
  markdown += `- **System Files**: ${report.summary.systemFiles}\n`;
  markdown += `- **System Size**: ${report.summary.systemSize}\n\n`;
  
  // Available Tools
  markdown += `## Available Tools\n\n`;
  for (const tool of report.tools.available) {
    markdown += `- ${tool}\n`;
  }
  markdown += `\n`;
  
  // Recommendations
  if (report.details.recommendations.length > 0) {
    markdown += `## Recommendations\n\n`;
    for (const rec of report.details.recommendations) {
      markdown += `### ${rec.priority} - ${rec.category}\n`;
      markdown += `**Issue**: ${rec.issue}\n`;
      markdown += `**Recommendation**: ${rec.recommendation}\n`;
      markdown += `**Impact**: ${rec.impact}\n\n`;
    }
  }
  
  // Usage Guide
  markdown += `## Usage Guide\n\n`;
  markdown += `### Quick Start\n`;
  markdown += `1. Run the unified launcher: \`npm run dev\`\n`;
  markdown += `2. Or use the batch script: \`start-unified.bat\`\n\n`;
  
  markdown += `### Service Management\n`;
  markdown += `- **Monitor Services**: Check logs/unified-launcher.log\n`;
  markdown += `- **View API Inventory**: See API_ROUTES_INVENTORY.md\n`;
  markdown += `- **Restart Services**: Run unified-launcher.js again\n\n`;
  
  return markdown;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProjectAnalyzer;
