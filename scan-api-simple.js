#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function scanAPIRoutes() {
  const apiDir = 'app/api';
  const backupDir = 'app/api_backup';
  const oldDir = 'app/api_old';
  
  const activeRoutes = [];
  const backupRoutes = [];
  const oldRoutes = [];
  const duplicates = {};
  
  async function scanDirectory(dir, routesArray) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath, routesArray);
      } else if (entry.name === 'route.ts') {
        const routePath = path.relative('app/api', fullPath).replace(/\\/g, '/').replace('/route.ts', '');
        const routeInfo = {
          path: routePath || '/',
          file: fullPath,
          methods: extractMethods(fs.readFileSync(fullPath, 'utf8')),
          size: fs.statSync(fullPath).size
        };
        routesArray.push(routeInfo);
      }
    }
  }
  
  function extractMethods(content) {
    const methods = [];
    if (content.includes('export async function GET')) methods.push('GET');
    if (content.includes('export async function POST')) methods.push('POST');
    if (content.includes('export async function PUT')) methods.push('PUT');
    if (content.includes('export async function DELETE')) methods.push('DELETE');
    return methods;
  }
  
  // 掃描所有目錄
  await scanDirectory(apiDir, activeRoutes);
  await scanDirectory(backupDir, backupRoutes);
  await scanDirectory(oldDir, oldRoutes);
  
  // 檢查重複
  for (const route of activeRoutes) {
    const normalizedPath = route.path.replace(/\[\w+\]/g, ':id');
    if (!duplicates[normalizedPath]) {
      duplicates[normalizedPath] = [];
    }
    duplicates[normalizedPath].push(route);
  }
  
  const duplicateGroups = Object.entries(duplicates).filter(([path, routes]) => routes.length > 1);
  
  return {
    activeRoutes,
    backupRoutes,
    oldRoutes,
    duplicateGroups
  };
}

async function generateInventoryReport() {
  console.log('🔍 Scanning API routes...');
  
  const result = await scanAPIRoutes();
  
  let report = `# API Routes Inventory Report\n\n`;
  report += `Generated: ${new Date().toLocaleString()}\n\n`;
  
  // Summary
  report += `## Summary\n\n`;
  report += `- **Active Routes**: ${result.activeRoutes.length}\n`;
  report += `- **Backup Routes**: ${result.backupRoutes.length}\n`;
  report += `- **Old Routes**: ${result.oldRoutes.length}\n`;
  report += `- **Duplicate Groups**: ${result.duplicateGroups.length}\n\n`;
  
  // Active Routes by Category
  report += `## Active Routes by Category\n\n`;
  
  const categories = {
    'Authentication': ['auth', 'login', 'logout', 'register'],
    'Customer Management': ['customer', '客戶'],
    'Order Management': ['order', '訂單'],
    'Inventory': ['inventory', '庫存'],
    'LINE Bot': ['line', 'linebot', 'webhook'],
    'AI/Chat': ['ai', 'chat', 'assistant'],
    'Voice': ['voice', 'tts', 'stt'],
    'Database': ['db', 'database', 'sql'],
    'Export': ['export', 'excel'],
    'Sync': ['sync', '同步'],
    'Reports': ['report', '報表', '統計'],
    'Admin': ['admin', '管理'],
    'Health': ['health', 'check']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    const routes = result.activeRoutes.filter(route => 
      keywords.some(keyword => route.path.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    if (routes.length > 0) {
      report += `### ${category} (${routes.length} routes)\n\n`;
      for (const route of routes) {
        report += `- \`${route.path}\` (${route.methods.join(', ')}) - ${Math.round(route.size/1024)}KB\n`;
      }
      report += `\n`;
    }
  }
  
  // Duplicates
  if (result.duplicateGroups.length > 0) {
    report += `## Duplicate Routes\n\n`;
    for (const [path, routes] of result.duplicateGroups) {
      report += `### ${path}\n`;
      for (const route of routes) {
        const dir = route.file.includes('api_backup') ? 'backup' : 
                   route.file.includes('api_old') ? 'old' : 'active';
        report += `- \`${route.path}\` - ${dir}\n`;
      }
      report += `\n`;
    }
  }
  
  // All Routes List
  report += `## All Active Routes\n\n`;
  result.activeRoutes.forEach((route, index) => {
    report += `${index + 1}. \`${route.path}\` (${route.methods.join(', ')})\n`;
  });
  
  return report;
}

// 執行
generateInventoryReport()
  .then(report => {
    fs.writeFileSync('API_ROUTES_INVENTORY.md', report);
    console.log('✅ Inventory report generated: API_ROUTES_INVENTORY.md');
  })
  .catch(console.error);
