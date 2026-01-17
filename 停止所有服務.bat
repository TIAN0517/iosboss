@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   停止所有服務
echo ===============================================
echo.

echo 正在停止所有服務...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1

timeout /t 2 /nobreak >nul

echo.
echo ===============================================
echo   所有服務已停止
echo ===============================================
echo.
timeout /t 2 /nobreak >nul
