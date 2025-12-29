# LINE Webhook 521 錯誤修復指南

## 🔴 問題描述

LINE Developers Console 顯示：
```
Error: The webhook returned an HTTP status code other than 200. (521 Unknown)
```

**原因**：Cloudflare 無法連接到源服務器，因為 Cloudflare Tunnel 未配置。

## ✅ 解決方案

### 方案 1：配置 Cloudflare Tunnel（必須，用於外網訪問）

#### 步驟 1：登入 Cloudflare Dashboard
1. 訪問：https://dash.cloudflare.com/
2. 選擇您的域名：`jytian.it.com`

#### 步驟 2：創建 Cloudflare Tunnel
1. 進入 **Zero Trust** → **Access** → **Tunnels**
2. 點擊 **Create a tunnel**
3. 選擇 **Cloudflared**
4. 給 Tunnel 命名（例如：`jyt-gas-tunnel`）
5. 點擊 **Save tunnel**

#### 步驟 3：配置路由（Public Hostname）
1. 在 Tunnel 頁面，點擊 **Configure**
2. 點擊 **Public Hostname** 標籤
3. 點擊 **Add a public hostname**
4. 填寫：
   - **Subdomain**: `linebot`
   - **Domain**: `jytian.it.com`
   - **Service Type**: HTTP
   - **Service URL**: `http://nginx:80`（Docker 內部網絡）
5. 點擊 **Save hostname**

#### 步驟 4：獲取 Tunnel Token
1. 在 Tunnel 頁面，找到您剛創建的 Tunnel
2. 點擊 **Token** 按鈕（或複製圖標）
3. **複製完整的 Token**（很長的字符串，類似：`eyJhIjoi...`）

#### 步驟 5：配置環境變量
1. 打開項目根目錄的 `.env` 文件
2. 添加或修改：
   ```env
   CF_TUNNEL_TOKEN=your_tunnel_token_here
   ```
3. 將 `your_tunnel_token_here` 替換為步驟 4 複製的 Token

#### 步驟 6：啟動 Cloudflare Tunnel
```bash
# 啟動 Tunnel 服務
docker compose --profile tunnel up -d cloudflared

# 檢查狀態
docker compose ps cloudflared

# 查看日誌（確認連接成功）
docker compose logs cloudflared --tail 50
```

#### 步驟 7：驗證 Webhook
1. 等待 1-2 分鐘讓 Tunnel 完全啟動
2. 測試連接：
   ```bash
   curl https://linebot.jytian.it.com/api/webhook/line
   ```
   應該返回：
   ```json
   {"status":"ready","message":"LINE Bot Webhook is ready..."}
   ```

3. 在 LINE Developers Console：
   - 點擊 **Verify** 按鈕
   - 應該顯示 "Webhook URL is valid" ✅

### 方案 2：使用其他方式暴露服務（臨時方案）

如果暫時無法配置 Cloudflare Tunnel，可以使用：

#### 選項 A：直接暴露端口（僅用於測試，不安全）
```yaml
# 修改 docker-compose.yml
services:
  nginx:
    ports:
      - "80:80"
      - "443:443"
```

然後配置域名 DNS 指向服務器 IP。

#### 選項 B：使用其他反向代理
- Nginx + Let's Encrypt SSL
- Caddy
- Traefik

## 🔍 驗證步驟

### 1. 檢查服務狀態
```bash
docker compose ps
```

所有服務應該顯示 `Up` 狀態。

### 2. 檢查應用健康
```bash
# 測試應用端點
docker compose exec app curl http://localhost:9999/api/webhook/line

# 應該返回 JSON 響應
```

### 3. 檢查 Nginx
```bash
# 測試 Nginx 代理
docker compose exec nginx curl http://app:9999/api/webhook/line

# 應該返回 JSON 響應
```

### 4. 檢查 Cloudflare Tunnel
```bash
# 查看 Tunnel 日誌
docker compose logs cloudflared --tail 50

# 應該看到類似：
# INF +--------------------------------------------------------------------------------------------+
# INF |  Your quick Tunnel has been created! Visit it at:                                          |
# INF |  https://linebot.jytian.it.com                                                              |
# INF +--------------------------------------------------------------------------------------------+
```

### 5. 測試外網訪問
```bash
curl https://linebot.jytian.it.com/api/webhook/line
```

## 📝 配置檢查清單

- [ ] Cloudflare Tunnel 已創建
- [ ] Public Hostname 已配置（linebot.jytian.it.com）
- [ ] Tunnel Token 已獲取
- [ ] `.env` 文件中已添加 `CF_TUNNEL_TOKEN`
- [ ] Cloudflare Tunnel 容器已啟動
- [ ] Tunnel 日誌顯示連接成功
- [ ] 外網可以訪問 `https://linebot.jytian.it.com/api/webhook/line`
- [ ] LINE Developers Console 驗證成功

## 🐛 常見問題

### Q: Tunnel 容器一直重啟
**A:** 檢查 Token 是否正確：
```bash
docker compose logs cloudflared
```
如果看到 "invalid token" 或類似錯誤，請重新獲取 Token。

### Q: 外網訪問還是 521
**A:** 
1. 確認 Tunnel 已啟動：`docker compose ps cloudflared`
2. 檢查日誌：`docker compose logs cloudflared`
3. 確認 Public Hostname 配置正確
4. 等待 2-3 分鐘讓 DNS 傳播

### Q: LINE 驗證還是失敗
**A:**
1. 確認 webhook URL 正確：`https://linebot.jytian.it.com/api/webhook/line`
2. 確認應用返回 200 狀態碼
3. 檢查 Nginx 配置是否正確
4. 查看應用日誌：`docker compose logs app | grep webhook`

## 🚀 快速修復命令

```bash
# 1. 停止所有服務
docker compose down

# 2. 確保 .env 文件中有 CF_TUNNEL_TOKEN
# （手動編輯 .env 文件）

# 3. 啟動所有服務（包括 Tunnel）
docker compose --profile tunnel up -d

# 4. 等待 30 秒後檢查狀態
sleep 30
docker compose ps

# 5. 測試 webhook
curl https://linebot.jytian.it.com/api/webhook/line

# 6. 在 LINE Developers Console 點擊 Verify
```

## 📚 相關文檔

- `CLOUDFLARE_TUNNEL_SETUP.md` - 詳細的 Tunnel 配置指南
- `QUICK_FIX_521.md` - 快速修復 521 錯誤
- [Cloudflare Tunnel 官方文檔](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [LINE Webhook 文檔](https://developers.line.biz/en/docs/messaging-api/webhook/)

