# ========================================
# Cloudflare Tunnel 自動配置腳本 (PowerShell)
# ========================================

$ErrorActionPreference = "Stop"

# Cloudflare API 配置
$CF_API_TOKEN = "Q7cgsne5ZfGoIH9-oWr6SJS7gYt56UwNd8V2WcrC"
$CF_ACCOUNT_ID = "294ea8539d4d17934ce09438d7c01967"
$CF_ZONE_NAME = "jytian.it.com"
$TUNNEL_NAME = "jyt-gas-tunnel"
$SUBDOMAIN = "linebot"
$SERVICE_URL = "http://nginx:80"

Write-Host "🚀 開始配置 Cloudflare Tunnel..." -ForegroundColor Cyan

# 步驟 1: 驗證 API Token
Write-Host "`n📋 步驟 1: 驗證 Cloudflare API Token..." -ForegroundColor Yellow
try {
    # 使用 Account 特定的驗證端點
    $verifyResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/tokens/verify" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $CF_API_TOKEN"
            "Content-Type" = "application/json"
        }
    
    if ($verifyResponse.success) {
        Write-Host "✅ API Token 驗證成功" -ForegroundColor Green
        Write-Host "   Token ID: $($verifyResponse.result.id)" -ForegroundColor Gray
        Write-Host "   狀態: $($verifyResponse.result.status)" -ForegroundColor Gray
        Write-Host "   過期時間: $($verifyResponse.result.expires_on)" -ForegroundColor Gray
    } else {
        Write-Host "❌ API Token 驗證失敗" -ForegroundColor Red
        Write-Host "   錯誤: $($verifyResponse.errors | ConvertTo-Json -Depth 3)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ API Token 驗證失敗: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   響應: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# 步驟 2: 獲取 Zone ID
Write-Host "`n📋 步驟 2: 獲取 Zone ID..." -ForegroundColor Yellow
try {
    $zoneResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones?name=$CF_ZONE_NAME" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $CF_API_TOKEN"
            "Content-Type" = "application/json"
        }
    
    if ($zoneResponse.success -and $zoneResponse.result.Count -gt 0) {
        $ZONE_ID = $zoneResponse.result[0].id
        Write-Host "✅ Zone ID: $ZONE_ID" -ForegroundColor Green
    } else {
        Write-Host "❌ 無法獲取 Zone ID" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 獲取 Zone ID 失敗: $_" -ForegroundColor Red
    exit 1
}

# 步驟 3: 創建或獲取 Tunnel
Write-Host "`n📋 步驟 3: 創建/獲取 Cloudflare Tunnel..." -ForegroundColor Yellow
try {
    # 先嘗試獲取現有 Tunnel
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
            exit 1
        }
    }
} catch {
    Write-Host "❌ 處理 Tunnel 失敗: $_" -ForegroundColor Red
    exit 1
}

# 步驟 4: 獲取 Tunnel Token
Write-Host "`n📋 步驟 4: 獲取 Tunnel Token..." -ForegroundColor Yellow
try {
    # 方法 1: 嘗試使用 GET 方法獲取現有 Token
    try {
        $tokenResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/token" `
            -Method GET `
            -Headers @{
                "Authorization" = "Bearer $CF_API_TOKEN"
                "Content-Type" = "application/json"
            }
        
        if ($tokenResponse.success -and $tokenResponse.result.token) {
            $TUNNEL_TOKEN = $tokenResponse.result.token
            Write-Host "✅ Tunnel Token 已獲取（通過 GET）" -ForegroundColor Green
        } else {
            throw "GET 方法未返回 Token"
        }
    } catch {
        Write-Host "   ⚠️  GET 方法失敗，嘗試創建新的 Connector..." -ForegroundColor Yellow
        
        # 方法 2: 創建新的 Connector 並獲取 Token
        # 注意：這需要 API Token 有創建 Connector 的權限
        $connectorBody = @{
            name = "docker-connector"
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
            Write-Host "✅ Tunnel Token 已獲取（通過創建 Connector）" -ForegroundColor Green
        } else {
            Write-Host "❌ 無法通過 API 獲取 Tunnel Token" -ForegroundColor Red
            Write-Host "`n💡 解決方案：" -ForegroundColor Cyan
            Write-Host "   請手動在 Cloudflare Dashboard 獲取 Tunnel Token：" -ForegroundColor White
            Write-Host "   1. 訪問: https://one.dash.cloudflare.com/" -ForegroundColor White
            Write-Host "   2. 進入 Zero Trust → Access → Tunnels" -ForegroundColor White
            Write-Host "   3. 找到 Tunnel: $TUNNEL_NAME" -ForegroundColor White
            Write-Host "   4. 點擊 'Token' 按鈕複製 Token" -ForegroundColor White
            Write-Host "   5. 手動添加到 .env 文件: CF_TUNNEL_TOKEN=your_token_here" -ForegroundColor White
            exit 1
        }
    }
} catch {
    Write-Host "❌ 獲取 Token 失敗: $_" -ForegroundColor Red
    Write-Host "`n💡 解決方案：" -ForegroundColor Cyan
    Write-Host "   請手動在 Cloudflare Dashboard 獲取 Tunnel Token" -ForegroundColor White
    Write-Host "   訪問: https://one.dash.cloudflare.com/ → Zero Trust → Access → Tunnels" -ForegroundColor White
    exit 1
}

# 步驟 5: 配置路由（Public Hostname）
Write-Host "`n📋 步驟 5: 配置 Public Hostname..." -ForegroundColor Yellow
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
    Write-Host "   請手動在 Cloudflare Dashboard 配置" -ForegroundColor Yellow
}

# 步驟 6: 更新 .env 文件
Write-Host "`n📋 步驟 6: 更新 .env 文件..." -ForegroundColor Yellow
$envFile = ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    if ($envContent -match "CF_TUNNEL_TOKEN=") {
        # 更新現有的 Token
        $envContent = $envContent -replace "CF_TUNNEL_TOKEN=.*", "CF_TUNNEL_TOKEN=$TUNNEL_TOKEN"
        Set-Content -Path $envFile -Value $envContent -NoNewline
        Write-Host "✅ 已更新 .env 文件中的 CF_TUNNEL_TOKEN" -ForegroundColor Green
    } else {
        # 添加新的 Token
        Add-Content -Path $envFile -Value "`n# Cloudflare Tunnel Token`nCF_TUNNEL_TOKEN=$TUNNEL_TOKEN"
        Write-Host "✅ 已添加 CF_TUNNEL_TOKEN 到 .env 文件" -ForegroundColor Green
    }
} else {
    # 創建新文件
    Set-Content -Path $envFile -Value "# Cloudflare Tunnel Token`nCF_TUNNEL_TOKEN=$TUNNEL_TOKEN"
    Write-Host "✅ 已創建 .env 文件" -ForegroundColor Green
}

# 步驟 7: 啟動 Cloudflare Tunnel
Write-Host "`n📋 步驟 7: 啟動 Cloudflare Tunnel..." -ForegroundColor Yellow
try {
    docker compose --profile tunnel up -d cloudflared
    Write-Host "✅ Cloudflare Tunnel 已啟動" -ForegroundColor Green
} catch {
    Write-Host "⚠️  啟動失敗，請手動運行: docker compose --profile tunnel up -d cloudflared" -ForegroundColor Yellow
}

Write-Host "`n🎉 配置完成！" -ForegroundColor Green
Write-Host "`n📝 下一步：" -ForegroundColor Cyan
Write-Host "1. 等待 1-2 分鐘讓 Tunnel 完全啟動" -ForegroundColor White
Write-Host "2. 運行: docker compose logs cloudflared --tail 50" -ForegroundColor White
Write-Host "3. 測試: curl https://linebot.jytian.it.com/api/webhook/line" -ForegroundColor White
Write-Host "4. 在 LINE Developers Console 點擊 Verify 按鈕" -ForegroundColor White
Write-Host "`n🔑 Tunnel Token 已保存到 .env 文件" -ForegroundColor Yellow
Write-Host "⚠️  請妥善保管此 Token，不要洩露給他人" -ForegroundColor Red

