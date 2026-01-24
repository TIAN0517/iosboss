@echo off
setlocal
:: First argument is the directory to run in
cd /d "%~dp0..\%~1"
shift

:loop
echo [%DATE% %TIME%] Starting in %CD%: %1 %2 %3 %4 %5 %6 %7 %8 %9
:: We use call to run the command so we can catch exit
call %1 %2 %3 %4 %5 %6 %7 %8 %9
echo [%DATE% %TIME%] Process exited. Restarting in 5 seconds...
timeout /t 5 >nul
goto loop
