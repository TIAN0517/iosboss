# 🚀 快速設置 Cloudflare Tunnel Token

## ✅ 已完成的自動配置

- ✅ Tunnel 已創建/找到：`db89d429-b35d-4232-9e53-244ed2890713`
- ✅ Public Hostname 已配置：`https://linebot.jytian.it.com`
- ✅ API Token 驗證成功

## 📋 最後一步：獲取並設置 Token

### 方法 1：使用腳本（推薦）

1. **獲取 Token**（只需一次）：
   - 訪問：https://one.dash.cloudflare.com/
   - 進入 **Zero Trust** → **Access** → **Tunnels**
   - 找到 Tunnel：`jyt-gas-tunnel`
   - 點擊 **Token** 按鈕，複製完整的 Token

2. **運行設置腳本**：
   ```powershell
   .\set-tunnel-token.ps1 -Token "your_copied_token_here"
   ```

3. **啟動服務**：
   ```powershell
   docker compose up -d cloudflared
   ```

### 方法 2：手動編輯 .env 文件

1. **獲取 Token**（同上）

2. **編輯 .env 文件**：
   - 打開 `.env` 文件
   - 找到第 164 行：`CF_TUNNEL_TOKEN=""`
   - 改為：`CF_TUNNEL_TOKEN="your_copied_token_here"`
   - 保存文件

3. **啟動服務**：
   ```powershell
   docker compose up -d cloudflared
   ```

## ✅ 驗證設置

```powershell
# 1. 檢查 Token 是否設置
Get-Content .env | Select-String "CF_TUNNEL_TOKEN"

# 2. 檢查服務狀態
docker compose ps cloudflared

# 3. 查看日誌（應該看到連接成功）
docker compose logs cloudflared --tail 50

# 4. 測試外網訪問
curl https://linebot.jytian.it.com/api/webhook/line
```

## 🎯 預期結果

日誌應該顯示：
```
INF +--------------------------------------------------------------------------------------------+
INF |  Your quick Tunnel has been created! Visit it at:                                          |
INF |  https://linebot.jytian.it.com                                                              |
INF +--------------------------------------------------------------------------------------------+
```

測試應該返回：
```json
{
  "status": "ready",
  "message": "LINE Bot Webhook is ready (Humanized Conversational AI)",
  ...
}
```

## 🐛 如果遇到問題

### Token 無效
- 確認複製了完整的 Token（通常很長）
- 確認沒有多餘的空格
- 重新從 Dashboard 獲取新的 Token

### 容器無法啟動
```powershell
# 檢查日誌
docker compose logs cloudflared

# 重新啟動
docker compose down cloudflared
docker compose up -d cloudflared
```

### 外網還是 521
- 等待 2-3 分鐘讓 DNS 傳播
- 確認 Tunnel 狀態：`docker compose ps cloudflared`
- 檢查日誌：`docker compose logs cloudflared`

---

**需要幫助？** 所有配置都已自動完成，只需獲取 Token 並設置即可！

