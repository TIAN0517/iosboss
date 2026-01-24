#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class APIInventory {
  constructor() {
    this.apiRoutes = new Map();
    this.backupRoutes = new Map();
    this.oldRoutes = new Map();
    this.duplicateRoutes = new Map();
    this.functionalityMap = new Map();
  }

  async scanDirectory(dirPath) {
    const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        await this.scanDirectory(fullPath);
      } else if (file.name === 'route.ts') {
        await this.analyzeRoute(fullPath, dirPath);
      }
    }
  }

  async analyzeRoute(filePath, dirPath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const routePath = this.extractRoutePath(filePath, dirPath);
      const methods = this.extractMethods(content);
      const functionality = this.identifyFunctionality(content);
      const imports = this.extractImports(content);
      
      const routeInfo = {
        path: routePath,
        file: filePath,
        methods,
        functionality,
        imports,
        lineCount: content.split('\n').length,
        hasErrorHandling: content.includes('try') && content.includes('catch'),
        hasAuth: content.includes('auth') || content.includes('Auth') || imports.some(imp => imp.includes('auth'))
      };

      // 分類路由
      if (filePath.includes('/api_backup/')) {
        this.backupRoutes.set(routePath, routeInfo);
      } else if (filePath.includes('/api_old/')) {
        this.oldRoutes.set(routePath, routeInfo);
      } else {
        this.apiRoutes.set(routePath, routeInfo);
        
        // 檢查重複
        const key = this.normalizePath(routePath);
        if (!this.functionalityMap.has(key)) {
          this.functionalityMap.set(key, []);
        }
        this.functionalityMap.get(key).push(routeInfo);
      }
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
    }
  }

  extractRoutePath(filePath, dirPath) {
    const relativePath = path.relative(dirPath, filePath);
    const parts = relativePath.split(path.sep);
    
    // 構建路由路徑
    let routePath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i] === 'api') continue;
      routePath += '/' + parts[i];
    }
    
    return routePath || '/';
  }

  extractMethods(content) {
    const methods = [];
    
    if (content.includes('export async function GET')) methods.push('GET');
    if (content.includes('export async function POST')) methods.push('POST');
    if (content.includes('export async function PUT')) methods.push('PUT');
    if (content.includes('export async function DELETE')) methods.push('DELETE');
    if (content.includes('export async function PATCH')) methods.push('PATCH');
    
    return methods;
  }

  identifyFunctionality(content) {
    const functionalities = [];
    
    // 檢查功能關鍵字
    const keywords = {
      'Authentication': ['login', 'logout', 'auth', 'register'],
      'Customer Management': ['customer', '客戶'],
      'Order Management': ['order', '訂單', '訂購'],
      'Inventory': ['inventory', '庫存', '瓦斯'],
      'LINE Bot': ['line', 'linebot', 'webhook'],
      'AI/Chat': ['ai', 'chat', 'assistant'],
      'Voice': ['voice', 'tts', 'stt', 'speech'],
      'Database': ['db', 'database', 'sql'],
      'Export': ['export', 'excel', 'csv'],
      'Sync': ['sync', '同步'],
      'Reports': ['report', '報表', '統計'],
      'Admin': ['admin', '管理'],
      'Health Check': ['health', 'check', 'ping']
    };

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => content.toLowerCase().includes(word.toLowerCase()))) {
        functionalities.push(category);
      }
    }

    return functionalities.length > 0 ? functionalities : ['Unknown'];
  }

  extractImports(content) {
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    const imports = [];
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  normalizePath(path) {
    return path.replace(/\/\[\w+\]/g, '/:param').replace(/\/+$/, '') || '/';
  }

  findDuplicates() {
    for (const [normalizedKey, routes] of this.functionalityMap.entries()) {
      if (routes.length > 1) {
        this.duplicateRoutes.set(normalizedKey, routes);
      }
    }
  }

  generateReport() {
    this.findDuplicates();
    
    const report = {
      summary: {
        totalRoutes: this.apiRoutes.size,
        backupRoutes: this.backupRoutes.size,
        oldRoutes: this.oldRoutes.size,
        duplicateGroups: this.duplicateRoutes.size,
        averageLines: Math.round(Array.from(this.apiRoutes.values()).reduce((sum, route) => sum + route.lineCount, 0) / this.apiRoutes.size)
      },
      categories: this.groupByFunctionality(),
      duplicates: Array.from(this.duplicateRoutes.entries()).map(([key, routes]) => ({
        path: key,
        routes: routes.map(r => ({ path: r.path, file: r.file }))
      })),
      routes: Array.from(this.apiRoutes.values()),
      backup: Array.from(this.backupRoutes.values()),
      old: Array.from(this.oldRoutes.values())
    };

    return report;
  }

  groupByFunctionality() {
    const groups = {};
    
    for (const route of this.apiRoutes.values()) {
      for (const func of route.functionality) {
        if (!groups[func]) groups[func] = [];
        groups[func].push(route);
      }
    }
    
    return groups;
  }

  async generateMarkdown() {
    const report = this.generateReport();
    
    let markdown = `# API Routes Inventory Report\n\n`;
    
    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Active Routes**: ${report.summary.totalRoutes}\n`;
    markdown += `- **Backup Routes**: ${report.summary.backupRoutes}\n`;
    markdown += `- **Old Routes**: ${report.summary.oldRoutes}\n`;
    markdown += `- **Duplicate Groups**: ${report.summary.duplicateGroups}\n`;
    markdown += `- **Average Lines per Route**: ${report.summary.averageLines}\n\n`;
    
    // Categories
    markdown += `## Routes by Functionality\n\n`;
    for (const [category, routes] of Object.entries(report.categories)) {
      markdown += `### ${category} (${routes.length} routes)\n\n`;
      for (const route of routes.slice(0, 5)) { // 只顯示前5個
        markdown += `- \`${route.path}\` (${route.methods.join(', ')}) - ${route.lineCount} lines\n`;
      }
      if (routes.length > 5) {
        markdown += `- ... and ${routes.length - 5} more\n`;
      }
      markdown += `\n`;
    }
    
    // Duplicates
    if (report.duplicates.length > 0) {
      markdown += `## Duplicate Routes\n\n`;
      for (const dup of report.duplicates) {
        markdown += `### ${dup.path}\n`;
        for (const route of dup.routes) {
          markdown += `- \`${route.path}\` - ${route.file}\n`;
        }
        markdown += `\n`;
      }
    }
    
    // Backup Routes
    if (report.backup.length > 0) {
      markdown += `## Backup Routes\n\n`;
      for (const route of report.backup.slice(0, 10)) {
        markdown += `- \`${route.path}\` - ${route.file}\n`;
      }
      markdown += `\n`;
    }
    
    return markdown;
  }
}

async function main() {
  const inventory = new APIInventory();
  
  console.log('🔍 Scanning API routes...');
  
  // 掃描所有 API 目錄
  const apiDirs = [
    'c:\\Users\\tian7\\OneDrive\\Desktop\\媽媽ios\\app\\api',
    'c:\\Users\\tian7\\OneDrive\\Desktop\\媽媽ios\\app\\api_backup',
    'c:\\Users\\tian7\\OneDrive\\Desktop\\媽媽ios\\app\\api_old'
  ];
  
  for (const dir of apiDirs) {
    if (fs.existsSync(dir)) {
      console.log(`Scanning: ${dir}`);
      await inventory.scanDirectory(dir);
    }
  }
  
  // 生成報告
  console.log('📊 Generating report...');
  const markdown = await inventory.generateMarkdown();
  
  // 保存報告
  const reportPath = 'API_ROUTES_INVENTORY.md';
  await fs.promises.writeFile(reportPath, markdown);
  
  console.log(`✅ Inventory report saved to: ${reportPath}`);
  console.log(`📈 Found ${inventory.apiRoutes.size} active routes`);
  console.log(`💾 Found ${inventory.backupRoutes.size} backup routes`);
  console.log(`🗂️ Found ${inventory.oldRoutes.size} old routes`);
  console.log(`🔄 Found ${inventory.duplicateRoutes.size} duplicate groups`);
}

main().catch(console.error);
