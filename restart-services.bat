@echo off
chcp 65001 >nul
REM ========================================
REM JYT Gas Management System - Restart Services
REM ========================================

if "%1"=="" (
    echo Usage: restart-services.bat [all^|app^|postgres^|call-display^|sync-socket]
    echo.
    echo Examples:
    echo   restart-services.bat all
    echo   restart-services.bat app
    echo   restart-services.bat postgres
    goto :end
)

echo Restarting service: %1

if "%1"=="all" (
    docker restart jyt-gas-sync-websocket jyt-gas-call-display jyt-gas-app jyt-gas-postgres
    goto :end
)

if "%1"=="app" (
    docker restart jyt-gas-app
    goto :end
)

if "%1"=="postgres" (
    docker restart jyt-gas-postgres
    goto :end
)

if "%1"=="call-display" (
    docker restart jyt-gas-call-display
    goto :end
)

if "%1"=="sync-socket" (
    docker restart jyt-gas-sync-websocket
    goto :end
)

echo Unknown service: %1

:end
echo.
echo Service status:
docker ps --format "table {{.Names}}\t{{.Status}}" | findstr jyt-gas
pause
