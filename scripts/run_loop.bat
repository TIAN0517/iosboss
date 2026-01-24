@echo off
setlocal
cd /d "%~dp0.."

:loop
echo [%DATE% %TIME%] Starting: %*
cmd /c %*
echo [%DATE% %TIME%] Crashed! Restarting in 5 seconds...
timeout /t 5 >nul
goto loop
