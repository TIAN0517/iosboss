# 使用 psql 直接 COPY 數據
$ErrorActionPreference = "Stop"

Write-Host "=== 匯入美崙站數據到 PostgreSQL ===" -ForegroundColor Green

# 轉換 CSV 為 PostgreSQL COPY 格式
Write-Host ""
Write-Host "1. 轉換 CSV 格式..." -ForegroundColor Yellow

$csvPath = "C:\Users\tian7\Desktop\customers_meilun.csv"
$pgPath = "C:\Users\tian7\Desktop\customers_meilun_copy.csv"

# 讀取並轉換
$lines = Get-Content $csvPath
$header = $lines[0].Replace('"', '')

# 移除引號，處理特殊字元
$convertedLines = @($header)
for ($i = 1; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    # 處理引號包圍的欄位，移除內部引號的雙引號
    $newLine = $line -replace '""', '""' -replace '^"|"$', ''
    $convertedLines += $newLine
}

$convertedLines | Out-File -FilePath $pgPath -Encoding UTF8 -Force

Write-Host "   已轉換 $($convertedLines.Count - 1) 筆資料" -ForegroundColor Cyan

# 使用 psql COPY
Write-Host ""
Write-Host "2. 匯入 PostgreSQL..." -ForegroundColor Yellow

$psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$connectionString = "postgresql://postgres:Ss520520@localhost:5432/postgres"

# 先清空表
& $psqlPath -h localhost -p 5432 -U postgres -d postgres -c "DELETE FROM customers_meilun;" 2>&1

# 使用 COPY 匯入
Write-Host "   執行 COPY..." -ForegroundColor Gray

$process = Start-Process -FilePath $psqlPath `
    -ArgumentList "-h localhost -p 5432 -U postgres -d postgres -c ""\COPY customers_meilun FROM '$pgPath' WITH (FORMAT CSV, HEADER true)"""`
    -NoNewWindow -PassThru -Wait

if ($process.ExitCode -eq 0) {
    Write-Host "   ✅ 匯入成功!" -ForegroundColor Green
} else {
    Write-Host "   ❌ 匯入失敗" -ForegroundColor Red
}

# 驗證
Write-Host ""
Write-Host "3. 驗證..." -ForegroundColor Yellow
$result = & $psqlPath -h localhost -p 5432 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM customers_meilun;"
$result = $result.Trim()
Write-Host "   PostgreSQL 筆數: $result" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== 完成 ===" -ForegroundColor Green
