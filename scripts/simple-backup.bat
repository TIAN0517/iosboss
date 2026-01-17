@echo off
chcp 65001 > nul

echo ===============================================
echo   快速備份 - JSON 格式
echo ===============================================
echo.

set "BACKUP_DIR=C:\BossAI-Backups"
set "TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

cd /d "%~dp0.."

echo 正在備份數據...

node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const backupDir = '%BACKUP_DIR%';
const timestamp = '%TIMESTAMP%';

async function backup() {
  console.log('開始備份...');

  // 備份關鍵數據
  const backup = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: {
      users: await prisma.user.findMany(),
      customers: await prisma.customer.findMany(),
      products: await prisma.product.findMany(),
      orders: await prisma.gasOrder.findMany({
        include: { items: true }
      }),
      inventory: await prisma.inventory.findMany(),
      checks: await prisma.check.findMany(),
      callRecords: await prisma.callRecord.findMany(),
      lineGroups: await prisma.lineGroup.findMany(),
      attendanceRecords: await prisma.attendanceRecord.findMany()
    }
  };

  // 保存備份
  const backupFile = path.join(backupDir, \`bossai-backup-\${timestamp}.json\`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

  const stats = fs.statSync(backupFile);
  console.log(\`✓ 備份完成: \${backupFile}\`);
  console.log(\`✓ 大小: \${(stats.size / 1024 / 1024).toFixed(2)} MB\`);

  await prisma.\$disconnect();

  process.exit(0);
}

backup().catch(err => {
  console.error('✗ 備份失敗:', err);
  process.exit(1);
});
"

:: ===== 上傳到 OneDrive =====
set "ONE_DRIVE=C:\Users\%USERNAME%\OneDrive\BossAI-Backups"

if exist "%ONE_DRIVE%" (
    echo.
    echo 正在上傳到 OneDrive...
    copy "%BACKUP_DIR%\bossai-backup-%TIMESTAMP%.json" "%ONE_DRIVE%\" /Y >nul
    echo ✓ 已上傳到 OneDrive 異地備份
)

echo.
echo ===============================================
echo   備份完成！
echo.
echo   本地備份: %BACKUP_DIR%
if exist "%ONE_DRIVE%" (
    echo   異地備份: %ONE_DRIVE%
)
echo ===============================================
pause
