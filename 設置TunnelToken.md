# 🔧 設置 Cloudflare Tunnel Token

## 📝 關於 .env 文件

**重要說明**：
- `.env` 文件在**主機上**（您的電腦上），**不需要進入 Docker**
- Docker Compose 會自動讀取 `.env` 文件並將變量傳遞給容器
- 您只需要在主機上編輯 `.env` 文件即可

## 🚀 快速設置步驟

### 方法 1：使用腳本（推薦）

1. **獲取 Cloudflare Tunnel Token**
   - 訪問：https://one.dash.cloudflare.com/
   - 進入 Zero Trust → Access → Tunnels
   - 找到或創建 Tunnel：`jyt-gas-tunnel`
   - 點擊 **Token** 按鈕，複製完整的 Token

2. **運行設置腳本**
   ```powershell
   .\set-tunnel-token.ps1 -Token "your_copied_token_here"
   ```
   將 `your_copied_token_here` 替換為您複製的 Token

3. **啟動 Cloudflare Tunnel**
   ```powershell
   docker compose up -d cloudflared
   ```

### 方法 2：手動編輯 .env 文件

1. **打開 .env 文件**（在項目根目錄）

2. **找到這一行**：
   ```env
   CF_TUNNEL_TOKEN=""
   ```

3. **替換為您的 Token**：
   ```env
   CF_TUNNEL_TOKEN="your_copied_token_here"
   ```

4. **保存文件**

5. **啟動 Cloudflare Tunnel**：
   ```powershell
   docker compose up -d cloudflared
   ```

## ✅ 驗證設置

```powershell
# 1. 檢查 Token 是否設置
Get-Content .env | Select-String "CF_TUNNEL_TOKEN"

# 2. 啟動服務
docker compose up -d cloudflared

# 3. 檢查狀態
docker compose ps cloudflared

# 4. 查看日誌
docker compose logs cloudflared --tail 50

# 5. 測試外網訪問
curl https://linebot.jytian.it.com/api/webhook/line
```

## 🎯 完整流程

1. ✅ 獲取 Cloudflare Tunnel Token（從 Dashboard）
2. ✅ 設置到 .env 文件（使用腳本或手動編輯）
3. ✅ 啟動 Cloudflare Tunnel：`docker compose up -d cloudflared`
4. ✅ 驗證連接：`curl https://linebot.jytian.it.com/api/webhook/line`
5. ✅ 在 LINE Developers Console 點擊 Verify

---

**需要幫助獲取 Token？** 查看 `GET_TUNNEL_TOKEN.md`

