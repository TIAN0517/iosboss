@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ========================================
:: 九九瓦斯行管理系統 - Supabase 导入工具
:: ========================================

echo.
echo ========================================
echo   九九瓦斯行 - Supabase 数据导入
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ 错误：未安装 Node.js
    echo.
    echo 请先安装 Node.js：
    echo   1. 访问 https://nodejs.org/
    echo   2. 下载并安装 LTS 版本
    echo   3. 重新运行此脚本
    echo.
    pause
    exit /b 1
)

:: 如果没有提供 URL，提示用户输入
if "%~1"=="" (
    echo 请输入 Supabase 数据库连接 URL：
    echo.
    echo 获取 URL 步骤：
    echo   1. 访问 https://supabase.com/dashboard
    echo   2. 选择项目 → Settings → Database
    echo   3. Connection String → URI → 复制
    echo.
    set /p SUPABASE_URL="连接 URL: "
) else (
    set SUPABASE_URL=%~1
)

echo.
echo 开始导入...
echo.

:: 设置环境变量并执行
set SUPABASE_DATABASE_URL=%SUPABASE_URL%
node import-to-supabase.js

if errorlevel 1 (
    echo.
    echo ❌ 导入失败！
    echo.
    echo 可能的原因：
    echo   1. 连接 URL 不正确
    echo   2. 密码错误
    echo   3. 网络连接问题
    echo.
    echo 请检查后重试。
    echo.
) else (
    echo.
    echo ✅ 导入完成！
    echo.
)

pause
