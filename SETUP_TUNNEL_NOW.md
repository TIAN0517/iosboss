# 🚀 Cloudflare Tunnel 立即設置指南

## ✅ 您已經完成
- ✅ Cloudflare API Token 已驗證（有效至 2027-12-31）

## 📋 接下來需要做的步驟

### 步驟 1：創建 Cloudflare Tunnel

#### 方法 A：使用 Cloudflare Dashboard（推薦）

1. **登入 Cloudflare Dashboard**
   - 訪問：https://dash.cloudflare.com/
   - 選擇域名：`jytian.it.com`

2. **進入 Zero Trust**
   - 點擊左側菜單 **Zero Trust**
   - 如果沒有看到，訪問：https://one.dash.cloudflare.com/

3. **創建 Tunnel**
   - 點擊 **Access** → **Tunnels**
   - 點擊 **Create a tunnel**
   - 選擇 **Cloudflared**
   - 給 Tunnel 命名：`jyt-gas-tunnel`
   - 點擊 **Save tunnel**

4. **配置 Public Hostname**
   - 在 Tunnel 頁面，點擊 **Configure**
   - 點擊 **Public Hostname** 標籤
   - 點擊 **Add a public hostname**
   - 填寫：
     - **Subdomain**: `linebot`
     - **Domain**: `jytian.it.com`
     - **Service Type**: HTTP
     - **Service URL**: `http://nginx:80`
   - 點擊 **Save hostname**

5. **獲取 Tunnel Token**
   - 在 Tunnel 頁面，找到您剛創建的 Tunnel
   - 點擊 **Token** 按鈕（或複製圖標）
   - **複製完整的 Token**（很長的字符串，類似：`eyJhIjoi...`）

#### 方法 B：使用 API（自動化）

如果您想使用 API 自動創建，可以運行：

```powershell
# 在項目根目錄執行
.\setup-cloudflare-tunnel.ps1
```

### 步驟 2：配置環境變量

1. **打開或創建 `.env` 文件**（在項目根目錄）

2. **添加或修改以下行**：
   ```env
   CF_TUNNEL_TOKEN=your_tunnel_token_here
   ```
   將 `your_tunnel_token_here` 替換為步驟 1 複製的 Token

3. **保存文件**

### 步驟 3：啟動 Cloudflare Tunnel

```powershell
# 停止現有服務（如果正在運行）
docker compose down

# 啟動所有服務（包括 Cloudflare Tunnel）
docker compose up -d

# 檢查 Cloudflare Tunnel 狀態
docker compose ps cloudflared

# 查看 Cloudflare Tunnel 日誌
docker compose logs cloudflared --tail 50
```

### 步驟 4：驗證配置

#### 4.1 檢查 Tunnel 日誌

應該看到類似：
```
✅ 檢測到 CF_TUNNEL_TOKEN，啟動 Cloudflare Tunnel...
INF +--------------------------------------------------------------------------------------------+
INF |  Your quick Tunnel has been created! Visit it at:                                          |
INF |  https://linebot.jytian.it.com                                                              |
INF +--------------------------------------------------------------------------------------------+
```

#### 4.2 測試 Webhook 端點

```powershell
# 測試外網訪問
curl https://linebot.jytian.it.com/api/webhook/line
```

應該返回：
```json
{
  "status": "ready",
  "message": "LINE Bot Webhook is ready..."
}
```

#### 4.3 在 LINE Developers Console 驗證

1. 訪問：https://developers.line.biz/console/
2. 選擇您的 LINE Bot
3. 進入 **Messaging API** 標籤
4. 在 **Webhook URL** 欄位輸入：`https://linebot.jytian.it.com/api/webhook/line`
5. 點擊 **Verify** 按鈕
6. 應該顯示：**✅ Webhook URL is valid**

## 🐛 常見問題

### Q: Tunnel 容器顯示 "未檢測到 CF_TUNNEL_TOKEN"
**A:** 確認 `.env` 文件中已正確設置 `CF_TUNNEL_TOKEN`，然後重啟：
```powershell
docker compose restart cloudflared
```

### Q: Tunnel 日誌顯示 "invalid token"
**A:** Token 可能已過期或無效，請重新獲取：
1. 進入 Cloudflare Dashboard → Zero Trust → Tunnels
2. 找到您的 Tunnel
3. 點擊 **Token** 按鈕重新複製
4. 更新 `.env` 文件中的 `CF_TUNNEL_TOKEN`
5. 重啟服務：`docker compose restart cloudflared`

### Q: 外網訪問還是 521 錯誤
**A:** 
1. 確認 Tunnel 已啟動：`docker compose ps cloudflared`
2. 檢查日誌：`docker compose logs cloudflared`
3. 確認 Public Hostname 配置正確（`linebot.jytian.it.com` → `http://nginx:80`）
4. 等待 2-3 分鐘讓 DNS 傳播

### Q: LINE 驗證還是失敗
**A:**
1. 確認 webhook URL 正確：`https://linebot.jytian.it.com/api/webhook/line`
2. 測試本地應用是否正常：`curl http://localhost:9999/api/webhook/line`
3. 檢查 Nginx 配置：`docker compose logs nginx`
4. 查看應用日誌：`docker compose logs app | Select-String "webhook"`

## 📝 快速檢查清單

- [ ] Cloudflare Tunnel 已創建（在 Zero Trust Dashboard）
- [ ] Public Hostname 已配置（`linebot.jytian.it.com` → `http://nginx:80`）
- [ ] Tunnel Token 已獲取並複製
- [ ] `.env` 文件中已添加 `CF_TUNNEL_TOKEN`
- [ ] Cloudflare Tunnel 容器已啟動（`docker compose ps cloudflared`）
- [ ] Tunnel 日誌顯示連接成功
- [ ] 外網可以訪問 `https://linebot.jytian.it.com/api/webhook/line`
- [ ] LINE Developers Console 驗證成功

## 🚀 快速修復命令

如果遇到問題，可以執行以下命令：

```powershell
# 1. 停止所有服務
docker compose down

# 2. 檢查 .env 文件中的 CF_TUNNEL_TOKEN
Get-Content .env | Select-String "CF_TUNNEL_TOKEN"

# 3. 啟動所有服務
docker compose up -d

# 4. 等待 30 秒
Start-Sleep -Seconds 30

# 5. 檢查服務狀態
docker compose ps

# 6. 查看 Cloudflare Tunnel 日誌
docker compose logs cloudflared --tail 50

# 7. 測試 webhook
curl https://linebot.jytian.it.com/api/webhook/line
```

## 📚 相關文檔

- `LINE_WEBHOOK_FIX.md` - 詳細的 LINE Webhook 修復指南
- `CLOUDFLARE_TUNNEL_SETUP.md` - Cloudflare Tunnel 詳細配置
- `QUICK_FIX_521.md` - 521 錯誤快速修復

---

**需要幫助？** 請檢查日誌：
```powershell
docker compose logs cloudflared --tail 100
docker compose logs app --tail 100
docker compose logs nginx --tail 100
```

