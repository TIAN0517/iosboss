@echo off
chcp 65001 >nul
echo Export Meilun customer data to CSV
echo ====================================
echo.

"C:\Program Files\Microsoft SQL Server\160\Tools\Binn\sqlcmd" -S BOSSJY\BOSSJY -E -d CPF47 -s "," -W -Q "SELECT * FROM Cust" -o "C:\Users\tian7\OneDrive\Desktop\媽媽ios\backups\migration\customers.csv"

echo Done!
echo File: customers.csv

pause
