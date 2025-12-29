# 🔑 獲取 Cloudflare Tunnel Token 指南

## 問題
自動化腳本無法通過 API 獲取 Tunnel Token（需要特殊權限）。

## ✅ 解決方案：手動獲取 Token（推薦）

### 步驟 1：登入 Cloudflare Dashboard
1. 訪問：https://one.dash.cloudflare.com/
2. 如果沒有 Zero Trust 訪問權限，訪問：https://dash.cloudflare.com/ → 選擇域名 `jytian.it.com`

### 步驟 2：進入 Tunnels 頁面
1. 點擊左側菜單 **Zero Trust**
2. 點擊 **Access** → **Tunnels**
3. 如果沒有看到 Zero Trust，可能需要：
   - 升級到 Cloudflare Zero Trust 計劃（有免費版本）
   - 或使用其他方式暴露服務

### 步驟 3：創建或選擇 Tunnel
1. 如果已有 Tunnel（名稱：`jyt-gas-tunnel`），點擊它
2. 如果沒有，點擊 **Create a tunnel**：
   - 選擇 **Cloudflared**
   - 命名：`jyt-gas-tunnel`
   - 點擊 **Save tunnel**

### 步驟 4：配置 Public Hostname（如果尚未配置）
1. 在 Tunnel 頁面，點擊 **Configure**
2. 點擊 **Public Hostname** 標籤
3. 點擊 **Add a public hostname**
4. 填寫：
   - **Subdomain**: `linebot`
   - **Domain**: `jytian.it.com`
   - **Service Type**: HTTP
   - **Service URL**: `http://nginx:80`
5. 點擊 **Save hostname**

### 步驟 5：獲取 Tunnel Token
1. 在 Tunnel 頁面，找到 **Token** 按鈕（通常在右上角或配置區域）
2. 點擊 **Token** 按鈕
3. **複製完整的 Token**（很長的字符串，類似：`eyJhIjoi...`）
   - ⚠️ **重要**：Token 只顯示一次，請立即複製！

### 步驟 6：配置到 .env 文件
1. 打開項目根目錄的 `.env` 文件
2. 添加或修改：
   ```env
   CF_TUNNEL_TOKEN=your_copied_token_here
   ```
3. 將 `your_copied_token_here` 替換為步驟 5 複製的 Token
4. 保存文件

### 步驟 7：啟動 Cloudflare Tunnel
```powershell
# 重啟 Cloudflare Tunnel 服務
docker compose restart cloudflared

# 或重新啟動所有服務
docker compose down
docker compose up -d

# 檢查狀態
docker compose ps cloudflared

# 查看日誌（應該看到連接成功）
docker compose logs cloudflared --tail 50
```

### 步驟 8：驗證配置
```powershell
# 測試外網訪問
curl https://linebot.jytian.it.com/api/webhook/line

# 應該返回：
# {"status":"ready","message":"LINE Bot Webhook is ready..."}
```

## 🎯 快速檢查清單

- [ ] 已登入 Cloudflare Dashboard
- [ ] 已進入 Zero Trust → Access → Tunnels
- [ ] Tunnel 已創建（`jyt-gas-tunnel`）
- [ ] Public Hostname 已配置（`linebot.jytian.it.com` → `http://nginx:80`）
- [ ] Tunnel Token 已複製
- [ ] `.env` 文件中已添加 `CF_TUNNEL_TOKEN`
- [ ] Cloudflare Tunnel 容器已啟動
- [ ] 外網可以訪問 `https://linebot.jytian.it.com/api/webhook/line`
- [ ] LINE Developers Console 驗證成功

## 🐛 常見問題

### Q: 沒有看到 Zero Trust 選項
**A:** 
- Cloudflare Zero Trust 有免費版本，但需要啟用
- 訪問：https://one.dash.cloudflare.com/ 直接進入
- 或聯繫 Cloudflare 支持啟用 Zero Trust

### Q: Token 按鈕在哪裡？
**A:** 
- 在 Tunnel 詳情頁面的右上角
- 或在 **Configure** 頁面的 **Connectors** 區域
- 如果找不到，嘗試點擊 Tunnel 名稱進入詳情頁

### Q: Token 複製後還是無效
**A:**
- 確認複製了完整的 Token（通常很長，包含 `eyJhIjoi...`）
- 確認 `.env` 文件中沒有多餘的空格或引號
- 確認 Token 沒有過期（重新獲取一個新的）

### Q: 外網訪問還是 521
**A:**
1. 確認 Tunnel 容器正在運行：`docker compose ps cloudflared`
2. 查看日誌：`docker compose logs cloudflared`
3. 確認 Public Hostname 配置正確
4. 等待 2-3 分鐘讓 DNS 傳播

## 📝 替代方案

如果無法使用 Cloudflare Tunnel，可以考慮：

1. **直接暴露端口**（僅用於測試）：
   ```yaml
   # docker-compose.yml
   services:
     nginx:
       ports:
         - "80:80"
   ```

2. **使用其他反向代理**：
   - Nginx + Let's Encrypt
   - Caddy
   - Traefik

3. **使用其他 Tunnel 服務**：
   - ngrok
   - localtunnel
   - serveo

---

**需要幫助？** 請檢查日誌：
```powershell
docker compose logs cloudflared --tail 100
```

