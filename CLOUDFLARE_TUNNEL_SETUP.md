# Cloudflare Tunnel 配置指南

## 🔍 問題診斷

### 521 錯誤原因
- Cloudflare Tunnel 容器未正確配置或未運行
- `CF_TUNNEL_TOKEN` 環境變量未設置或無效
- Tunnel 無法連接到源服務器

## ✅ 解決方案

### 方案 1：配置 Cloudflare Tunnel（推薦）

#### 步驟 1：創建 Cloudflare Tunnel
1. 登入 Cloudflare Zero Trust Dashboard: https://dash.cloudflare.com/
2. 進入 **Access** → **Tunnels**
3. 點擊 **Create a tunnel**
4. 選擇 **Cloudflared** → **Docker**
5. 給 Tunnel 命名（例如：`jyt-gas-tunnel`）

#### 步驟 2：配置路由
1. 點擊 **Configure** 按鈕
2. 添加 Public Hostname：
   - **Subdomain**: `linebot`（或您想要的子域名）
   - **Domain**: `jytian.it.com`
   - **Service Type**: HTTP
   - **Service URL**: `http://nginx:80`（Docker 內部網絡）

#### 步驟 3：獲取 Tunnel Token
1. 在 Tunnel 頁面，點擊 **Token** 按鈕
2. 複製完整的 Token（很長的字符串）

#### 步驟 4：配置環境變量
在 `.env` 文件中添加：
```env
CF_TUNNEL_TOKEN=your_tunnel_token_here
```

#### 步驟 5：重啟服務
```bash
docker compose restart cloudflared
```

### 方案 2：暫時禁用 Cloudflare Tunnel

如果暫時不需要外網訪問，可以禁用 Cloudflare Tunnel：

```bash
# 停止 Cloudflare Tunnel 容器
docker compose stop cloudflared

# 或從 docker-compose.yml 中註釋掉 cloudflared 服務
```

### 方案 3：使用其他方式暴露服務

#### 選項 A：直接暴露端口（不推薦，僅用於測試）
```yaml
# docker-compose.yml
services:
  nginx:
    ports:
      - "80:80"
      - "443:443"
```

#### 選項 B：使用 Nginx 反向代理 + 域名
配置 Nginx 直接監聽 80/443 端口，並配置 SSL 證書。

## 🔧 驗證配置

### 1. 檢查 Tunnel 狀態
```bash
docker compose logs cloudflared --tail 50
```

應該看到：
```
INF +--------------------------------------------------------------------------------------------+
INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
INF |  https://linebot.jytian.it.com                                                              |
INF +--------------------------------------------------------------------------------------------+
```

### 2. 測試 Webhook 端點
```bash
curl https://linebot.jytian.it.com/api/webhook/line
```

應該返回：
```json
{
  "status": "ready",
  "message": "LINE Bot Webhook is ready"
}
```

### 3. 在 LINE Developers Console 驗證
1. 進入 LINE Developers Console
2. 點擊 **Verify** 按鈕
3. 應該顯示 "Webhook URL is valid"

## 🐛 常見問題

### Q: Tunnel 容器一直重啟
**A:** 檢查 `CF_TUNNEL_TOKEN` 是否正確配置：
```bash
docker compose exec cloudflared env | grep TUNNEL_TOKEN
```

### Q: 521 錯誤持續出現
**A:** 
1. 確認應用容器正常運行：`docker compose ps app`
2. 確認 Nginx 正常運行：`docker compose ps nginx`
3. 確認 Tunnel 正常運行：`docker compose ps cloudflared`
4. 檢查日誌：`docker compose logs cloudflared`

### Q: Tunnel 連接成功但還是 521
**A:** 
1. 檢查 Nginx 配置是否正確
2. 檢查應用是否在 9999 端口正常運行
3. 檢查 Docker 網絡連接：`docker compose exec nginx ping app`

## 📝 當前狀態

根據檢查結果：
- ✅ 應用正常運行（Next.js 已啟動）
- ✅ Nginx 正常運行
- ❌ Cloudflare Tunnel 未配置（需要 CF_TUNNEL_TOKEN）

## 🚀 快速修復

### 如果暫時不需要外網訪問：
```bash
# 停止 Cloudflare Tunnel
docker compose stop cloudflared

# 使用本地測試
curl http://localhost:9999/api/webhook/line
```

### 如果需要外網訪問：
1. 按照「方案 1」配置 Cloudflare Tunnel
2. 獲取 Tunnel Token
3. 添加到 `.env` 文件
4. 重啟服務：`docker compose restart cloudflared`

## 📚 參考文檔

- [Cloudflare Tunnel 文檔](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [LINE Bot Webhook 文檔](https://developers.line.biz/en/docs/messaging-api/webhook/)

