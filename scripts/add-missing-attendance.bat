@echo off
chcp 65001 > nul
cls

echo ===============================================
echo   補打卡記錄工具
echo ===============================================
echo.

cd /d "%~dp0.."

echo.
echo 請輸入要補卡的人：
echo.
echo   [1] 彥榮
echo   [2] 其他員工（輸入LINE User ID）
echo.
set /p choice="請選擇 (1/2): "

if "%choice%"=="1" (
    set "LINE_USER_ID=U_HASH_HERE"  :: 請替換為彥榮的 LINE User ID
    set "EMPLOYEE_NAME=彥榮"
    goto :input_dates
)

if "%choice%"=="2" (
    set /p LINE_USER_ID="請輸入 LINE User ID: "
    set /p EMPLOYEE_NAME="請輸入員工姓名: "
    goto :input_dates
)

echo.
echo 無效選擇
pause
exit /b 1

:input_dates
echo.
echo ===============================================
echo   選擇補卡日期
echo ===============================================
echo.
echo   [1] 只補昨天
echo   [2] 只補今天
echo   [3] 補昨天和今天
echo.
set /p date_choice="請選擇 (1/2/3): "

set "YESTERDAY=%date:~0,4%-%date:~5,2%-%date:~8,2%"
set /a "TODAY_YEAR=%date:~0,4%"
set /a "TODAY_MONTH=%date:~5,2%"
set /a "TODAY_DAY=%date:~8,2%"
set "TODAY=%TODAY_YEAR%-%TODAY_MONTH%:%TODAY_DAY%"

:: 顯示即將補卡的資訊
echo.
echo ===============================================
echo   準備補卡
echo ===============================================
echo.
echo   員工: %EMPLOYEE_NAME%
echo   LINE ID: %LINE_USER_ID%
echo.

if "%date_choice%"=="1" (
    echo   日期: %YESTERDAY% (昨天)
    set "DATES=%YESTERDAY%"
) else if "%date_choice%"=="2" (
    echo   日期: %TODAY% (今天)
    set "DATES=%TODAY%"
) else if "%date_choice%"=="3" (
    echo   日期: %YESTERDAY% (昨天) 和 %TODAY% (今天)
    set "DATES=%YESTERDAY% %TODAY%"
)

echo.
set /p confirm="確定要補卡嗎？(y/N): "
if /i not "%confirm%"=="y" (
    echo 已取消
    pause
    exit /b 0
)

echo.
echo 正在補卡...

:: 使用 Node.js 執行補卡
node -e "
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const lineUserId = '%LINE_USER_ID%';
const employeeName = '%EMPLOYEE_NAME%';
const dates = '%DATES%'.split(' ');

async function addAttendance(date) {
  // 檢查是否已有打卡記錄
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      userId_date: {
        userId: lineUserId,
        date: date
      }
    }
  });

  if (existing) {
    console.log(\`  \${date}: 已有打卡記錄，跳過\`);
    return;
  }

  // 創建打卡記錄 (假設上班 08:00，下班 17:00)
  await prisma.attendanceRecord.create({
    data: {
      userId: lineUserId,
      userName: employeeName,
      date: date,
      clockIn: '08:00',
      clockOut: '17:00',
      workHours: 9.0,
      note: '系統補卡'
    }
  });

  console.log(\`  ✓ \${date}: 補卡成功 (08:00 - 17:00)\`);
}

async function main() {
  for (const date of dates) {
    await addAttendance(date.trim());
  }

  await prisma.\$disconnect();
  console.log('');
  console.log('✓ 補卡完成！');
}

main().catch(err => {
  console.error('✗ 補卡失敗:', err);
  process.exit(1);
});
"

echo.
echo ===============================================
echo   補卡完成
echo ===============================================
echo.
echo   已將打卡記錄加入數據庫
echo.
pause
