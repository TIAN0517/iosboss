# ========================================
# 自動設置 Cloudflare Tunnel Token
# ========================================

$ErrorActionPreference = "Stop"

# Cloudflare API 配置
$CF_API_TOKEN = "Q7cgsne5ZfGoIH9-oWr6SJS7gYt56UwNd8V2WcrC"
$CF_ACCOUNT_ID = "294ea8539d4d17934ce09438d7c01967"
$CF_ZONE_NAME = "jytian.it.com"
$TUNNEL_NAME = "jyt-gas-tunnel"
$SUBDOMAIN = "linebot"
$SERVICE_URL = "http://nginx:80"

Write-Host "🚀 開始自動設置 Cloudflare Tunnel..." -ForegroundColor Cyan

# 步驟 1: 驗證 API Token
Write-Host "`n📋 步驟 1: 驗證 API Token..." -ForegroundColor Yellow
try {
    $verifyResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/tokens/verify" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $CF_API_TOKEN"
            "Content-Type" = "application/json"
        }
    
    if ($verifyResponse.success) {
        Write-Host "✅ API Token 驗證成功" -ForegroundColor Green
    } else {
        Write-Host "❌ API Token 驗證失敗" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ API Token 驗證失敗: $_" -ForegroundColor Red
    exit 1
}

# 步驟 2: 獲取或創建 Tunnel
Write-Host "`n📋 步驟 2: 獲取或創建 Tunnel..." -ForegroundColor Yellow
try {
    # 獲取現有 Tunnel 列表
    $tunnelList = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/cfd_tunnel" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $CF_API_TOKEN"
            "Content-Type" = "application/json"
        }
    
    $existingTunnel = $tunnelList.result | Where-Object { $_.name -eq $TUNNEL_NAME }
    
    if ($existingTunnel) {
        $TUNNEL_ID = $existingTunnel.id
        Write-Host "✅ 找到現有 Tunnel: $TUNNEL_ID" -ForegroundColor Green
    } else {
        # 創建新 Tunnel
        Write-Host "   創建新 Tunnel..." -ForegroundColor Gray
        $tunnelBody = @{
            name = $TUNNEL_NAME
            config_src = "cloudflare"
        } | ConvertTo-Json
        
        $tunnelResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/cfd_tunnel" `
            -Method POST `
            -Headers @{
                "Authorization" = "Bearer $CF_API_TOKEN"
                "Content-Type" = "application/json"
            } `
            -Body $tunnelBody
        
        if ($tunnelResponse.success) {
            $TUNNEL_ID = $tunnelResponse.result.id
            Write-Host "✅ 已創建新 Tunnel: $TUNNEL_ID" -ForegroundColor Green
        } else {
            Write-Host "❌ 創建 Tunnel 失敗" -ForegroundColor Red
            Write-Host "   錯誤: $($tunnelResponse.errors | ConvertTo-Json)" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "❌ 處理 Tunnel 失敗: $_" -ForegroundColor Red
    exit 1
}

# 步驟 3: 配置 Public Hostname
Write-Host "`n📋 步驟 3: 配置 Public Hostname..." -ForegroundColor Yellow
try {
    $configBody = @{
        config = @{
            ingress = @(
                @{
                    hostname = "$SUBDOMAIN.$CF_ZONE_NAME"
                    service = $SERVICE_URL
                },
                @{
                    service = "http_status:404"
                }
            )
        }
    } | ConvertTo-Json -Depth 10
    
    $configResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/configurations" `
        -Method PUT `
        -Headers @{
            "Authorization" = "Bearer $CF_API_TOKEN"
            "Content-Type" = "application/json"
        } `
        -Body $configBody
    
    if ($configResponse.success) {
        Write-Host "✅ Public Hostname 配置成功" -ForegroundColor Green
        Write-Host "   URL: https://$SUBDOMAIN.$CF_ZONE_NAME" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Public Hostname 配置可能失敗，請手動檢查" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  配置 Public Hostname 失敗: $_" -ForegroundColor Yellow
    Write-Host "   請手動在 Dashboard 配置" -ForegroundColor Yellow
}

# 步驟 4: 獲取 Tunnel Token（通過創建 Connector）
Write-Host "`n📋 步驟 4: 獲取 Tunnel Token..." -ForegroundColor Yellow
$TUNNEL_TOKEN = $null

try {
    # 方法 1: 嘗試獲取現有 Connector 的 Token
    try {
        $connectors = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/connectors" `
            -Method GET `
            -Headers @{
                "Authorization" = "Bearer $CF_API_TOKEN"
                "Content-Type" = "application/json"
            }
        
        if ($connectors.result -and $connectors.result.Count -gt 0) {
            # 如果有現有 Connector，嘗試獲取其 Token
            $connectorId = $connectors.result[0].id
            Write-Host "   找到現有 Connector: $connectorId" -ForegroundColor Gray
            
            # 注意：獲取現有 Connector 的 Token 可能需要不同的 API 端點
            # 通常需要創建新的 Connector 才能獲取 Token
        }
    } catch {
        Write-Host "   無法獲取現有 Connector" -ForegroundColor Gray
    }
    
    # 方法 2: 創建新的 Connector 並獲取 Token
    Write-Host "   創建新的 Connector..." -ForegroundColor Gray
    $connectorBody = @{
        name = "docker-connector-$(Get-Date -Format 'yyyyMMddHHmmss')"
    } | ConvertTo-Json
    
    $connectorResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/connectors" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $CF_API_TOKEN"
            "Content-Type" = "application/json"
        } `
        -Body $connectorBody
    
    if ($connectorResponse.success -and $connectorResponse.result.token) {
        $TUNNEL_TOKEN = $connectorResponse.result.token
        Write-Host "✅ Tunnel Token 已獲取" -ForegroundColor Green
    } else {
        Write-Host "❌ 無法通過 API 獲取 Tunnel Token" -ForegroundColor Red
        Write-Host "   錯誤: $($connectorResponse.errors | ConvertTo-Json -Depth 3)" -ForegroundColor Red
        Write-Host "`n💡 解決方案：" -ForegroundColor Cyan
        Write-Host "   請手動在 Cloudflare Dashboard 獲取 Tunnel Token：" -ForegroundColor White
        Write-Host "   1. 訪問: https://one.dash.cloudflare.com/" -ForegroundColor White
        Write-Host "   2. 進入 Zero Trust → Access → Tunnels" -ForegroundColor White
        Write-Host "   3. 找到 Tunnel: $TUNNEL_NAME" -ForegroundColor White
        Write-Host "   4. 點擊 'Token' 按鈕複製 Token" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "❌ 獲取 Token 失敗: $_" -ForegroundColor Red
    Write-Host "`n💡 解決方案：" -ForegroundColor Cyan
    Write-Host "   請手動在 Cloudflare Dashboard 獲取 Tunnel Token" -ForegroundColor White
    exit 1
}

# 步驟 5: 更新 .env 文件
Write-Host "`n📋 步驟 5: 更新 .env 文件..." -ForegroundColor Yellow
try {
    if (-not (Test-Path ".env")) {
        Write-Host "❌ .env 文件不存在！" -ForegroundColor Red
        exit 1
    }
    
    $envContent = Get-Content .env -Raw
    
    if ($envContent -match "CF_TUNNEL_TOKEN\s*=") {
        # 更新現有的 Token
        $envContent = $envContent -replace 'CF_TUNNEL_TOKEN\s*=\s*"[^"]*"', "CF_TUNNEL_TOKEN=`"$TUNNEL_TOKEN`""
        $envContent = $envContent -replace "CF_TUNNEL_TOKEN\s*=\s*''", "CF_TUNNEL_TOKEN=`"$TUNNEL_TOKEN`""
        $envContent = $envContent -replace "CF_TUNNEL_TOKEN\s*=\s*", "CF_TUNNEL_TOKEN=`"$TUNNEL_TOKEN`""
        Set-Content -Path .env -Value $envContent -NoNewline
        Write-Host "✅ 已更新 .env 文件中的 CF_TUNNEL_TOKEN" -ForegroundColor Green
    } else {
        Write-Host "❌ 在 .env 文件中找不到 CF_TUNNEL_TOKEN" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 更新 .env 文件失敗: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 配置完成！" -ForegroundColor Green
Write-Host "`n📋 下一步：" -ForegroundColor Cyan
Write-Host "1. 啟動 Cloudflare Tunnel: docker compose up -d cloudflared" -ForegroundColor White
Write-Host "2. 檢查狀態: docker compose ps cloudflared" -ForegroundColor White
Write-Host "3. 查看日誌: docker compose logs cloudflared --tail 50" -ForegroundColor White
Write-Host "4. 測試連接: curl https://linebot.jytian.it.com/api/webhook/line" -ForegroundColor White

