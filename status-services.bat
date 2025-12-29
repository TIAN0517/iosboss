@echo off
chcp 65001 >nul
echo ========================================
echo JYT Gas System - Service Status
echo ========================================
echo.
echo Running Containers:
echo -------------------
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr jyt-gas
echo.
echo Health Check:
echo -------------
curl -s http://localhost:9999/api/health 2>nul && echo Main App: OK || echo Main App: Not Responding
curl -s http://localhost:3004 2>nul >nul && echo Call Display: OK || echo Call Display: Not Responding
curl -s http://localhost:3005 2>nul >nul && echo Sync WebSocket: OK || echo Sync WebSocket: Not Responding
echo.
echo ========================================
pause
