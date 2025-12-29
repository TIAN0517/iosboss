# ========================================
# 設置 Cloudflare Tunnel Token 腳本
# ========================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$ErrorActionPreference = "Stop"

Write-Host "🔧 正在更新 .env 文件中的 CF_TUNNEL_TOKEN..." -ForegroundColor Cyan

# 檢查 .env 文件是否存在
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env 文件不存在！" -ForegroundColor Red
    exit 1
}

# 讀取 .env 文件內容
$envContent = Get-Content .env -Raw

# 檢查是否已存在 CF_TUNNEL_TOKEN
if ($envContent -match "CF_TUNNEL_TOKEN\s*=") {
    # 更新現有的 Token - 使用更精確的正則表達式
    # 匹配整行，包括可能的空值
    $pattern = '(?m)^CF_TUNNEL_TOKEN\s*=\s*"[^"]*"'
    if ($envContent -match $pattern) {
        $envContent = $envContent -replace $pattern, "CF_TUNNEL_TOKEN=`"$Token`""
    } else {
        # 如果沒有引號，直接替換
        $envContent = $envContent -replace '(?m)^CF_TUNNEL_TOKEN\s*=\s*.*', "CF_TUNNEL_TOKEN=`"$Token`""
    }
    Write-Host "✅ 已更新現有的 CF_TUNNEL_TOKEN" -ForegroundColor Green
} else {
    # 添加新的 Token（在 Cloudflare Tunnel 配置區域）
    $insertPoint = $envContent.IndexOf("# ========================================`n# Cloudflare Tunnel")
    if ($insertPoint -ge 0) {
        $endPoint = $envContent.IndexOf("`n# ========================================", $insertPoint + 1)
        if ($endPoint -ge 0) {
            $before = $envContent.Substring(0, $endPoint)
            $after = $envContent.Substring($endPoint)
            $envContent = $before + "`nCF_TUNNEL_TOKEN=`"$Token`"`n" + $after
        } else {
            $envContent = $envContent + "`nCF_TUNNEL_TOKEN=`"$Token`"`n"
        }
    } else {
        # 如果找不到配置區域，添加到文件末尾
        $envContent = $envContent + "`n# ========================================`n# Cloudflare Tunnel 配置`n# ========================================`nCF_TUNNEL_TOKEN=`"$Token`"`n"
    }
    Write-Host "✅ 已添加 CF_TUNNEL_TOKEN 到 .env 文件" -ForegroundColor Green
}

# 保存文件
Set-Content -Path .env -Value $envContent -NoNewline

Write-Host "`n✅ 配置完成！" -ForegroundColor Green
Write-Host "`n📋 下一步：" -ForegroundColor Cyan
Write-Host "1. 啟動 Cloudflare Tunnel: docker compose up -d cloudflared" -ForegroundColor White
Write-Host "2. 檢查狀態: docker compose ps cloudflared" -ForegroundColor White
Write-Host "3. 查看日誌: docker compose logs cloudflared --tail 50" -ForegroundColor White
Write-Host "4. 測試連接: curl https://linebot.jytian.it.com/api/webhook/line" -ForegroundColor White

