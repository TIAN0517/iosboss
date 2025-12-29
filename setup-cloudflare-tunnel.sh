#!/bin/bash
# ========================================
# Cloudflare Tunnel 自動配置腳本
# ========================================

set -e

# Cloudflare API 配置
CF_API_TOKEN="Q7cgsne5ZfGoIH9-oWr6SJS7gYt56UwNd8V2WcrC"
CF_ACCOUNT_ID="294ea8539d4d17934ce09438d7c01967"
CF_ZONE_NAME="jytian.it.com"
TUNNEL_NAME="jyt-gas-tunnel"
SUBDOMAIN="linebot"
SERVICE_URL="http://nginx:80"

echo "🚀 開始配置 Cloudflare Tunnel..."

# 步驟 1: 驗證 API Token
echo "📋 步驟 1: 驗證 Cloudflare API Token..."
VERIFY_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json")

if echo "$VERIFY_RESPONSE" | grep -q '"success":true'; then
  echo "✅ API Token 驗證成功"
else
  echo "❌ API Token 驗證失敗"
  echo "$VERIFY_RESPONSE"
  exit 1
fi

# 步驟 2: 獲取 Zone ID
echo "📋 步驟 2: 獲取 Zone ID..."
ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$CF_ZONE_NAME" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json")

ZONE_ID=$(echo "$ZONE_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ZONE_ID" ]; then
  echo "❌ 無法獲取 Zone ID"
  echo "$ZONE_RESPONSE"
  exit 1
fi

echo "✅ Zone ID: $ZONE_ID"

# 步驟 3: 創建 Tunnel
echo "📋 步驟 3: 創建 Cloudflare Tunnel..."
TUNNEL_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/cfd_tunnel" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{
    \"name\": \"$TUNNEL_NAME\",
    \"config_src\": \"cloudflare\"
  }")

TUNNEL_ID=$(echo "$TUNNEL_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
TUNNEL_SECRET=$(echo "$TUNNEL_RESPONSE" | grep -o '"secret":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TUNNEL_ID" ]; then
  echo "⚠️  Tunnel 可能已存在，嘗試獲取現有 Tunnel..."
  TUNNEL_LIST=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/cfd_tunnel" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json")
  
  TUNNEL_ID=$(echo "$TUNNEL_LIST" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$TUNNEL_ID" ]; then
    echo "❌ 無法創建或獲取 Tunnel"
    echo "$TUNNEL_RESPONSE"
    exit 1
  fi
fi

echo "✅ Tunnel ID: $TUNNEL_ID"

# 步驟 4: 獲取 Tunnel Token
echo "📋 步驟 4: 獲取 Tunnel Token..."
TOKEN_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/token" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json")

TUNNEL_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TUNNEL_TOKEN" ]; then
  echo "❌ 無法獲取 Tunnel Token"
  echo "$TOKEN_RESPONSE"
  exit 1
fi

echo "✅ Tunnel Token 已獲取"

# 步驟 5: 配置路由（Public Hostname）
echo "📋 步驟 5: 配置 Public Hostname..."
CONFIG_RESPONSE=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/configurations" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{
    \"config\": {
      \"ingress\": [
        {
          \"hostname\": \"$SUBDOMAIN.$CF_ZONE_NAME\",
          \"service\": \"$SERVICE_URL\"
        },
        {
          \"service\": \"http_status:404\"
        }
      ]
    }
  }")

if echo "$CONFIG_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Public Hostname 配置成功"
else
  echo "⚠️  Public Hostname 配置可能失敗，請手動檢查"
  echo "$CONFIG_RESPONSE"
fi

# 步驟 6: 更新 .env 文件
echo "📋 步驟 6: 更新 .env 文件..."
if [ -f ".env" ]; then
  # 檢查是否已有 CF_TUNNEL_TOKEN
  if grep -q "CF_TUNNEL_TOKEN" .env; then
    # 更新現有的 Token
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' "s|CF_TUNNEL_TOKEN=.*|CF_TUNNEL_TOKEN=$TUNNEL_TOKEN|" .env
    else
      # Linux
      sed -i "s|CF_TUNNEL_TOKEN=.*|CF_TUNNEL_TOKEN=$TUNNEL_TOKEN|" .env
    fi
    echo "✅ 已更新 .env 文件中的 CF_TUNNEL_TOKEN"
  else
    # 添加新的 Token
    echo "" >> .env
    echo "# Cloudflare Tunnel Token" >> .env
    echo "CF_TUNNEL_TOKEN=$TUNNEL_TOKEN" >> .env
    echo "✅ 已添加 CF_TUNNEL_TOKEN 到 .env 文件"
  fi
else
  echo "⚠️  .env 文件不存在，創建新文件..."
  echo "CF_TUNNEL_TOKEN=$TUNNEL_TOKEN" > .env
  echo "✅ 已創建 .env 文件"
fi

# 步驟 7: 啟動 Cloudflare Tunnel
echo "📋 步驟 7: 啟動 Cloudflare Tunnel..."
docker compose --profile tunnel up -d cloudflared

echo ""
echo "🎉 配置完成！"
echo ""
echo "📝 下一步："
echo "1. 等待 1-2 分鐘讓 Tunnel 完全啟動"
echo "2. 運行: docker compose logs cloudflared --tail 50"
echo "3. 測試: curl https://linebot.jytian.it.com/api/webhook/line"
echo "4. 在 LINE Developers Console 點擊 Verify 按鈕"
echo ""
echo "🔑 Tunnel Token 已保存到 .env 文件"
echo "⚠️  請妥善保管此 Token，不要洩露給他人"

