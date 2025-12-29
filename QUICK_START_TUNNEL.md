# 🚀 Cloudflare Tunnel 快速啟動指南

## ✅ 已完成的修復

1. ✅ 修復了 `docker-compose.yml` 中的 Cloudflare Tunnel 配置
2. ✅ 解決了容器啟動失敗的問題（`/bin/sh` 錯誤）
3. ✅ 配置了優雅的錯誤處理（沒有 Token 時不會無限重啟）

## 📋 當前狀態

- ✅ LINE Bot 配置正確
- ✅ Docker 服務運行正常（app, nginx, postgres）
- ✅ 本地 Webhook 端點正常
- ❌ Cloudflare Tunnel 未運行（需要 Token）

## 🎯 解決 521 錯誤的步驟

### 步驟 1：獲取 Cloudflare Tunnel Token

1. **訪問 Cloudflare Dashboard**
   - 打開：https://one.dash.cloudflare.com/
   - 如果沒有 Zero Trust 訪問權限，先啟用免費的 Zero Trust 計劃

2. **進入 Tunnels 頁面**
   - 點擊左側菜單 **Zero Trust**
   - 點擊 **Access** → **Tunnels**

3. **創建或選擇 Tunnel**
   - 如果已有 Tunnel（名稱：`jyt-gas-tunnel`），點擊它
   - 如果沒有，點擊 **Create a tunnel**：
     - 選擇 **Cloudflared**
     - 命名：`jyt-gas-tunnel`
     - 點擊 **Save tunnel**

4. **配置 Public Hostname**（如果尚未配置）
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
   - 在 Tunnel 頁面，找到 **Token** 按鈕
   - 點擊 **Token** 按鈕
   - **複製完整的 Token**（很長的字符串，類似：`eyJhIjoi...`）
   - ⚠️ **重要**：Token 只顯示一次，請立即複製！

### 步驟 2：更新 .env 文件

打開項目根目錄的 `.env` 文件，找到：

```env
CF_TUNNEL_TOKEN=""
```

將它改為：

```env
CF_TUNNEL_TOKEN="your_copied_token_here"
```

將 `your_copied_token_here` 替換為步驟 1 複製的 Token。

**使用 PowerShell 快速更新**（替換 `your_token_here` 為實際 Token）：

```powershell
(Get-Content .env) -replace 'CF_TUNNEL_TOKEN=""', 'CF_TUNNEL_TOKEN="your_token_here"' | Set-Content .env
```

### 步驟 3：啟動 Cloudflare Tunnel

```powershell
# 啟動 Cloudflare Tunnel 服務
docker compose up -d cloudflared

# 檢查狀態
docker compose ps cloudflared

# 查看日誌（應該看到連接成功）
docker compose logs cloudflared --tail 50
```

**預期的日誌輸出**：
```
INF +--------------------------------------------------------------------------------------------+
INF |  Your quick Tunnel has been created! Visit it at:                                          |
INF |  https://linebot.jytian.it.com                                                              |
INF +--------------------------------------------------------------------------------------------+
```

### 步驟 4：驗證外網訪問

```powershell
# 等待 1-2 分鐘讓 Tunnel 完全啟動
Start-Sleep -Seconds 60

# 測試外網訪問
curl https://linebot.jytian.it.com/api/webhook/line
```

**應該返回**：
```json
{
  "status": "ready",
  "message": "LINE Bot Webhook is ready (Humanized Conversational AI)",
  ...
}
```

### 步驟 5：在 LINE Developers Console 驗證

1. 訪問：https://developers.line.biz/console/
2. 選擇您的 LINE Bot
3. 進入 **Messaging API** 標籤
4. 確認 **Webhook URL** 為：`https://linebot.jytian.it.com/api/webhook/line`
5. 點擊 **Verify** 按鈕
6. 應該顯示：**✅ Webhook URL is valid**

## 🐛 常見問題

### Q: 容器一直重啟
**A:** 檢查 Token 是否正確：
```powershell
docker compose logs cloudflared
```
如果看到 "invalid token" 或類似錯誤，請重新獲取 Token。

### Q: 外網訪問還是 521
**A:** 
1. 確認 Tunnel 已啟動：`docker compose ps cloudflared`
2. 檢查日誌：`docker compose logs cloudflared`
3. 確認 Public Hostname 配置正確
4. 等待 2-3 分鐘讓 DNS 傳播

### Q: 沒有看到 Zero Trust 選項
**A:** 
- Cloudflare Zero Trust 有免費版本，但需要啟用
- 訪問：https://one.dash.cloudflare.com/ 直接進入
- 或聯繫 Cloudflare 支持啟用 Zero Trust

## 📝 快速檢查清單

- [ ] 已登入 Cloudflare Dashboard
- [ ] 已進入 Zero Trust → Access → Tunnels
- [ ] Tunnel 已創建（`jyt-gas-tunnel`）
- [ ] Public Hostname 已配置（`linebot.jytian.it.com` → `http://nginx:80`）
- [ ] Tunnel Token 已複製
- [ ] `.env` 文件中已設置 `CF_TUNNEL_TOKEN`
- [ ] Cloudflare Tunnel 容器已啟動
- [ ] Tunnel 日誌顯示連接成功
- [ ] 外網可以訪問 `https://linebot.jytian.it.com/api/webhook/line`
- [ ] LINE Developers Console 驗證成功

## 🚀 快速修復命令

如果遇到問題：

```powershell
# 1. 檢查 Token 是否設置
Get-Content .env | Select-String "CF_TUNNEL_TOKEN"

# 2. 停止並重新啟動
docker compose down cloudflared
docker compose up -d cloudflared

# 3. 查看日誌
docker compose logs cloudflared --tail 50

# 4. 測試連接
curl https://linebot.jytian.it.com/api/webhook/line
```

---

**需要更多幫助？** 查看詳細文檔：
- `GET_TUNNEL_TOKEN.md` - 詳細的 Token 獲取指南
- `LINE_WEBHOOK_FIX.md` - LINE Webhook 修復指南

