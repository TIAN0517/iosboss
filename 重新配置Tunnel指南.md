# 🔄 重新配置 Cloudflare Tunnel 完整指南

## ✅ 刪除並重新配置的影響

### 不會影響的項目 ✅

1. **Docker 服務**
   - App、Nginx、PostgreSQL 服務不受影響
   - 數據庫數據完全安全
   - 應用配置不受影響

2. **配置文件**
   - `.env` 文件中的其他配置不受影響
   - `docker-compose.yml` 不受影響
   - 應用代碼不受影響

3. **數據**
   - 所有數據庫數據安全
   - 上傳的文件安全
   - 用戶數據安全

### 會影響的項目 ⚠️

1. **Cloudflare Tunnel 連接**
   - 刪除 Tunnel 後，外網訪問會暫時中斷
   - 重新配置後會恢復

2. **外網訪問**
   - 在重新配置完成前，無法通過外網訪問
   - 本地訪問不受影響（`http://localhost:9999`）

3. **LINE Webhook**
   - 如果域名改變，需要在 LINE Developers Console 更新 Webhook URL
   - 如果使用相同域名，不需要更新

## 🚀 完整重新配置步驟

### 步驟 1：備份當前配置（可選）

```powershell
# 備份 .env 文件
Copy-Item .env .env.backup

# 備份當前 Token（如果需要）
Get-Content .env | Select-String "CF_TUNNEL_TOKEN" > tunnel-token-backup.txt
```

### 步驟 2：停止並刪除現有 Tunnel

#### 在 Cloudflare Dashboard 中：

1. **訪問 Tunnel 列表**：
   - https://one.dash.cloudflare.com/access/tunnels

2. **刪除現有 Tunnel**：
   - 找到 `jyt-gas-tunnel`
   - 點擊右側的 **功能表**（三個點圖標）
   - 選擇 **刪除** 或 **Delete**
   - 確認刪除

#### 在本地：

```powershell
# 停止 Cloudflare Tunnel 容器
docker compose stop cloudflared

# 刪除容器（可選）
docker compose rm cloudflared
```

### 步驟 3：創建新的 Tunnel

#### 在 Cloudflare Dashboard 中：

1. **創建新 Tunnel**：
   - 點擊 **+ 建立通道**（Create Tunnel）
   - 選擇 **Cloudflared**
   - 命名：`jyt-gas-tunnel-new`（或您喜歡的名稱）
   - 點擊 **儲存**（Save）

2. **獲取新 Token**：
   - 在 Tunnel 詳情頁面
   - 點擊 **Token** 按鈕
   - **立即複製完整的 Token**（只顯示一次！）

### 步驟 4：配置路由

1. **進入 Published Application Routes**：
   - 在 Tunnel 詳情頁面
   - 點擊 **已發佈的應用程式路由** 標籤

2. **添加新 Route**：
   - 點擊 **+ 新增已發佈的應用程式路由**
   - 填寫：
     - **Hostname**: `linebot.jytian.it.com`
     - **Service**: `http://nginx:80`
     - **Path**: `*`（或留空）
   - 點擊 **儲存**

### 步驟 5：更新本地配置

```powershell
# 更新 .env 文件中的 Token
.\set-tunnel-token.ps1 -Token "new_tunnel_token_here"
```

或手動編輯 `.env` 文件：
```env
CF_TUNNEL_TOKEN="new_tunnel_token_here"
```

### 步驟 6：啟動新 Tunnel

```powershell
# 啟動 Cloudflare Tunnel
docker compose up -d cloudflared

# 檢查狀態
docker compose ps cloudflared

# 查看日誌
docker compose logs cloudflared --tail 50
```

### 步驟 7：驗證配置

```powershell
# 等待 2-5 分鐘
Start-Sleep -Seconds 120

# 測試外網訪問
curl https://linebot.jytian.it.com/api/webhook/line
```

## 📋 檢查清單

- [ ] 已備份當前配置（可選）
- [ ] 已刪除舊的 Tunnel（在 Dashboard）
- [ ] 已創建新的 Tunnel
- [ ] 已獲取新的 Tunnel Token
- [ ] 已配置路由（Hostname + Service）
- [ ] 已更新 `.env` 文件中的 Token
- [ ] 已啟動新的 Tunnel 容器
- [ ] Tunnel 連接正常
- [ ] 外網訪問正常
- [ ] LINE Webhook 驗證成功

## ⚠️ 注意事項

### 1. 域名不變

如果使用相同的域名（`linebot.jytian.it.com`）：
- ✅ 不需要更新 LINE Webhook URL
- ✅ 不需要更新 DNS 設置
- ✅ 只需要等待 Cloudflare 更新路由

### 2. 域名改變

如果使用新的域名：
- ⚠️ 需要在 LINE Developers Console 更新 Webhook URL
- ⚠️ 可能需要更新 DNS 設置
- ⚠️ 需要更新 `.env` 文件中的 `LINE_WEBHOOK_URL`

### 3. 數據安全

- ✅ 所有數據完全安全
- ✅ 刪除 Tunnel 不會影響數據庫
- ✅ 只是網絡連接配置的更改

## 🎯 快速重新配置腳本

創建一個 PowerShell 腳本來自動化部分流程：

```powershell
# 1. 停止舊的 Tunnel
docker compose stop cloudflared

# 2. 等待用戶在 Dashboard 創建新 Tunnel 並獲取 Token
# （這部分需要手動操作）

# 3. 更新 Token（用戶提供新 Token 後）
# .\set-tunnel-token.ps1 -Token "new_token"

# 4. 啟動新 Tunnel
# docker compose up -d cloudflared
```

## 💡 推薦做法

1. **使用相同的域名**：避免需要更新 LINE Webhook
2. **保留舊配置備份**：以防需要恢復
3. **逐步操作**：先創建新 Tunnel，確認正常後再刪除舊的

---

**總結**：可以安全刪除並重新配置，不會影響數據和服務。只需要重新配置 Tunnel 連接即可。

