# 九九瓦斯行 - 自動備份系統

## 🎯 備份策略

```
📁 備份輪換策略：
├── 每日備份 (保留最近 7 天)
├── 每週備份 (保留最近 4 週)
├── 每月備份 (保留最近 12 個月)
└── 異地備份 (Google Drive / OneDrive)
```

---

## 📋 前置準備

### 方案 A：Google Drive (推薦)

1. 創建 Google Cloud 專案
2. 啟用 Google Drive API
3. 下載 service account JSON
4. 創建資料夾用於存放備份
5. 共享資料夾給 service account

### 方案 B：OneDrive (更簡單)

1. 使用您的個人 OneDrive (15GB 免費)
2. 創建資料夾 `BossAI-Backups`
3. 使用 rclone 工具上傳

### 方案 C：Dropbox

1. 註冊 Dropbox (2GB 免費)
2. 生成 Access Token
3. 使用上傳腳本

---

## 🔧 安裝備份工具

### 1. 安裝 rclone (用於雲端上傳)

**Windows:**
```bash
# 下載 rclone
curl -o rclone.zip https://downloads.rclone.org/v1.64.2/rclone-v1.64.2-windows-amd64.zip
# 解壓縮
tar -xf rclone.zip
# 移動到系統路徑
mv rclone-v1.64.2-windows-amd64/rclone.exe C:\Windows\System32\
```

**驗證安裝:**
```bash
rclone version
```

---

## 📜 備份腳本

### 1. 主備份腳本

檔案：`scripts\backup-database.bat`

```batch
@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

:: ========================================
:: 九九瓦斯行 - 自動備份腳本
:: ========================================

echo ===============================================
echo   數據庫自動備份系統
echo   時間: %date% %time%
echo ===============================================
echo.

:: ===== 配置區 =====
set "BACKUP_DIR=C:\BossAI-Backups"
set "DB_NAME=postgres"
set "TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"

:: 創建備份目錄
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if not exist "%BACKUP_DIR%\daily" mkdir "%BACKUP_DIR%\daily"
if not exist "%BACKUP_DIR%\weekly" mkdir "%BACKUP_DIR%\weekly"
if not exist "%BACKUP_DIR%\monthly" mkdir "%BACKUP_DIR%\monthly"

:: ===== 1. PostgreSQL 備份 =====
echo [1/5] 正在備份 PostgreSQL...

:: 假設使用 pg_dump (需要安裝 PostgreSQL)
set "PG_DUMP=C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
set "DB_HOST=localhost"
set "DB_PORT=5432"
set "DB_USER=postgres"
set "DB_PASSWORD=your-password"

set "BACKUP_FILE=%BACKUP_DIR%\temp_backup_%TIMESTAMP%.sql"

if exist "%PG_DUMP%" (
    "%PG_DUMP%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -F c -b -v -f "%BACKUP_FILE%.backup"
    echo     ✓ PostgreSQL 備份完成
) else (
    echo     ✗ pg_dump 未找到，跳過 PostgreSQL 備份
    echo     請安裝 PostgreSQL 或使用 Prisma 備份
)

:: ===== 2. Prisma 數據導出 =====
echo [2/5] 正在導出 Prisma 數據...

cd /d "%~dp0.."
call npx prisma db pull 2>nul
call npx prisma db seed --skip-seed 2>nul

:: 導出為 JSON
node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportData() {
  const data = {
    customers: await prisma.customer.findMany({
      where: { updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    }),
    orders: await prisma.gasOrder.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    }),
    products: await prisma.product.findMany(),
    inventory: await prisma.inventory.findMany()
  };

  fs.writeFileSync('%BACKUP_DIR%\temp_data_%TIMESTAMP%.json', JSON.stringify(data, null, 2));
  console.log('✓ 數據導出完成');
  process.exit(0);
}

exportData().catch(err => {
  console.error('✗ 導出失敗:', err);
  process.exit(1);
});
"

echo     ✓ Prisma 數據導出完成

:: ===== 3. 壓縮備份 =====
echo [3/5] 正在壓縮備份...

set "ZIP_FILE=%BACKUP_DIR%\BossAI_Backup_%TIMESTAMP%.zip"

:: 使用 PowerShell 壓縮
powershell -Command "Compress-Archive -Path '%BACKUP_DIR%\temp_*' -DestinationPath '%ZIP_FILE%' -Force"

:: 清理臨時檔案
del "%BACKUP_DIR%\temp_*" /Q

echo     ✓ 壓縮完成: %ZIP_FILE%

:: ===== 4. 複製到輪換目錄 =====
echo [4/5] 正在建立輪換備份...

:: 每日備份
copy "%ZIP_FILE%" "%BACKUP_DIR%\daily\backup_%TIMESTAMP%.zip" >nul

:: 每週備份 (週日)
if "%date:~0,3%"=="日" (
    copy "%ZIP_FILE%" "%BACKUP_DIR%\weekly\backup_%TIMESTAMP%.zip" >nul
    echo     ✓ 每週備份已建立
)

:: 每月備份 (1號)
if "%date:~8,2%"=="01" (
    copy "%ZIP_FILE%" "%BACKUP_DIR%\monthly\backup_%TIMESTAMP%.zip" >nul
    echo     ✓ 每月備份已建立
)

echo     ✓ 輪換備份完成

:: ===== 5. 清理舊備份 =====
echo [5/5] 正在清理舊備份...

:: 刪除 7 天前的每日備份
forfiles /p "%BACKUP_DIR%\daily" /d -7 /c "cmd /c del @path" 2>nul

:: 刪除 4 週前的每週備份
forfiles /p "%BACKUP_DIR%\weekly" /d -28 /c "cmd /c del @path" 2>nul

:: 刪除 12 個月前的每月備份
forfiles /p "%BACKUP_DIR%\monthly" /d -365 /c "cmd /c del @path" 2>nul

echo     ✓ 舊備份已清理

:: ===== 6. 上傳到雲端 =====
echo.
echo [上傳] 正在上傳到雲端備份...
call "%~dp0upload-to-cloud.bat" "%ZIP_FILE%"

:: ===== 完成 =====
echo.
echo ===============================================
echo   備份完成！
echo   備份檔案: %ZIP_FILE%
echo   大小:
dir "%ZIP_FILE%" | find "backup_%TIMESTAMP%.zip"
echo ===============================================
echo.

pause
```

---

### 2. 雲端上傳腳本

檔案：`scripts\upload-to-cloud.bat`

```batch
@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

set "FILE=%~1"

if "%FILE%"=="" (
    echo 用法: upload-to-cloud.bat [檔案路徑]
    exit /b 1
)

echo 正在上傳: %FILE%

:: ===== OneDrive 上傳 =====
:: 假設 OneDrive 同步資料夾
set "ONE_DRIVE=C:\Users\%USERNAME%\OneDrive\BossAI-Backups"

if exist "%ONE_DRIVE%" (
    copy "%FILE%" "%ONE_DRIVE%\"
    echo ✓ 已上傳到 OneDrive
) else (
    echo ✗ OneDrive 資料夾不存在: %ONE_DRIVE%
)

:: ===== Google Drive 上傳 (使用 rclone) =====
:: 需要先配置 rclone
rclone copy "%FILE%" gdrive:BossAI-Backups --progress 2>nul
if not errorlevel 1 (
    echo ✓ 已上傳到 Google Drive
)

echo 上傳完成！

exit /b 0
```

---

### 3. 定時任務設置

檔案：`scripts\setup-scheduled-backup.bat`

```batch
@echo off
chcp 65001 > nul

echo ===============================================
echo   設置定時備份任務
echo ===============================================
echo.

:: 設置每日備份 (凌晨 2 點)
schtasks /create /tn "BossAI-每日備份" /tr "C:\BossAI-99\scripts\backup-database.bat" /sc daily /st 02:00 /f

echo ✓ 每日凌晨 2:00 自動備份
echo.
echo 查看任務: schtasks /query /fo list /v | find "BossAI"
echo.

echo ===============================================
echo   定時任務設置完成
echo ===============================================
pause
```

---

### 4. 簡化版備份腳本 (純 JSON)

檔案：`scripts\simple-backup.bat`

```batch
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

  // 備份所有數據
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

echo.
echo ===============================================
echo   備份完成！
echo.
echo   備份位置: %BACKUP_DIR%
echo ===============================================
pause
```

---

## 🕐 設置定時任務

### 方法 1: 使用 Windows 工作排程器 (GUI)

1. 開啟「工作排程器」
   - Win+R → 輸入 `taskschd.msc`

2. 建立工作
   - 點擊「建立基本工作」
   - 名稱：`BossAI 每日備份`
   - 觸發：每天凌晨 2:00
   - 動作：啟動程式
     - 程式：`C:\BossAI-99\scripts\simple-backup.bat`
   - 完成

### 方法 2: 使用命令列

```batch
:: 管理員身份執行
schtasks /create /tn "BossAI-每日備份" /tr "C:\BossAI-99\scripts\simple-backup.bat" /sc daily /st 02:00 /ru SYSTEM /f

:: 查看待務
schtasks /query /tn "BossAI-每日備份" /fo list

:: 刪除任務
schtasks /delete /tn "BossAI-每日備份" /f
```

---

## ☁️ 配置 OneDrive 備份

### 1. 設置 OneDrive

1. 確認 OneDrive 已安裝並同步
2. 在 OneDrive 建立資料夾：`BossAI-Backups`
3. 確認同步路徑：`C:\Users\您的用戶名\OneDrive\BossAI-Backups`

### 2. 修改備份腳本

在 `simple-backup.bat` 最後加上：

```batch
:: ===== 上傳到 OneDrive =====
set "ONE_DRIVE=C:\Users\%USERNAME%\OneDrive\BossAI-Backups"

if exist "%ONE_DRIVE%" (
    echo.
    echo 正在上傳到 OneDrive...
    xcopy "%BACKUP_DIR%\bossai-backup-%TIMESTAMP%.json" "%ONE_DRIVE%\" /Y
    echo ✓ 已上傳到 OneDrive
)
```

---

## 📊 監控備份狀態

### 備份狀態檢查腳本

檔案：`scripts\check-backup-status.bat`

```batch
@echo off
chcp 65001 > nul

set "BACKUP_DIR=C:\BossAI-Backups"

echo ===============================================
echo   備份狀態檢查
echo ===============================================
echo.

echo 📁 本地備份:
dir "%BACKUP_DIR%\*.json" /O-D /A-D | find "bossai-backup"
echo.

echo ☁️ OneDrive 備份:
dir "C:\Users\%USERNAME%\OneDrive\BossAI-Backups\*.json" /O-D /A-D 2>nul | find "bossai-backup"
echo.

echo 📊 備份統計:
echo   本地備份數量:
dir "%BACKUP_DIR%\*.json" /A-D 2>nul | find /c ".json"
echo   OneDrive 備份數量:
dir "C:\Users\%USERNAME%\OneDrive\BossAI-Backups\*.json" /A-D 2>nul | find /c ".json"

echo.
pause
```

---

## 🔙️ 還原數據

### 還原腳本

檔案：`scripts\restore-database.bat`

```batch
@echo off
chcp 65001 > nul

set "BACKUP_FILE=%~1"

if "%BACKUP_FILE%"=="" (
    echo 用法: restore-database.bat [備份檔案路徑]
    echo.
    echo 可用的備份檔案:
    dir /B C:\BossAI-Backups\*.json
    exit /b 1
)

echo ===============================================
echo   還原數據庫
echo ===============================================
echo.
echo 警告: 這將會覆蓋現有數據！
echo.
set /p confirm="確定要還原嗎？(y/N): "

if /i not "%confirm%"=="y" (
    echo 已取消
    exit /b 0
)

echo.
echo 正在還原: %BACKUP_FILE%

cd /d "%~dp0.."

node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restore() {
  const backupData = JSON.parse(fs.readFileSync('%BACKUP_FILE%', 'utf8'));

  console.log('開始還原...');

  // 清空現有數據
  console.log('清空舊數據...');
  await prisma.attendanceRecord.deleteMany({});
  await prisma.lineGroup.deleteMany({});
  await prisma.callRecord.deleteMany({});
  await prisma.check.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.gasOrderItem.deleteMany({});
  await prisma.gasOrder.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});

  // 還原數據
  console.log('還原數據...');

  for (const user of backupData.data.users) {
    await prisma.user.create({ data: user });
  }
  console.log('✓ Users');

  for (const customer of backupData.data.customers) {
    await prisma.customer.create({ data: customer });
  }
  console.log('✓ Customers');

  for (const product of backupData.data.products) {
    await prisma.product.create({ data: product });
  }
  console.log('✓ Products');

  for (const order of backupData.data.orders) {
    await prisma.gasOrder.create({ data: order });
  }
  console.log('✓ Orders');

  for (const inventory of backupData.data.inventory) {
    await prisma.inventory.create({ data: inventory });
  }
  console.log('✓ Inventory');

  for (const check of backupData.data.checks) {
    await prisma.check.create({ data: check });
  }
  console.log('✓ Checks');

  for (const call of backupData.data.callRecords) {
    await prisma.callRecord.create({ data: call });
  }
  console.log('✓ Call Records');

  for (const group of backupData.data.lineGroups) {
    await prisma.lineGroup.create({ data: group });
  }
  console.log('✓ LINE Groups');

  for (const attendance of backupData.data.attendanceRecords) {
    await prisma.attendanceRecord.create({ data: attendance });
  }
  console.log('✓ Attendance Records');

  console.log('✓ 還原完成！');

  await prisma.\$disconnect();
  process.exit(0);
}

restore().catch(err => {
  console.error('✗ 還原失敗:', err);
  process.exit(1);
});
"

echo.
echo ===============================================
echo   還原完成！
echo ===============================================
pause
```

---

## ✅ 測試備份

執行一次測試：

```batch
cd C:\BossAI-99\scripts
simple-backup.bat
```

應該看到：

```
====================================
  快速備份 - JSON 格式
====================================

正在備份數據...
開始備份...
✓ 備份完成
✓ 大小: 1.23 MB

====================================
  備份完成！

  備份位置: C:\BossAI-Backups
====================================
```

---

## 📋 每月檢查清單

- [ ] 確認備份正常執行
- [ ] 檢查備份檔案大小
- [ ] 驗證 OneDrive 同步
- [ ] 測試還原流程（可選）
- [ ] 清理過期備份

---

**完成！** 您現在有了完整的自動備份系統！ 🎉
