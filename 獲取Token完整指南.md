# 🔑 獲取 Cloudflare Tunnel Token 完整指南

## ✅ 當前狀態

- ✅ API Token 驗證成功
- ✅ Tunnel 已創建：`jyt-gas-tunnel` (ID: `db89d429-b35d-4232-9e53-244ed2890713`)
- ✅ Public Hostname 已配置：`https://linebot.jytian.it.com`
- ❌ Tunnel 狀態：`down`（需要 Token 才能連接）

## 🎯 獲取 Token 步驟（必須手動操作）

### 方法 1：通過 Cloudflare Dashboard（推薦）

1. **訪問 Cloudflare Zero Trust Dashboard**
   - 打開瀏覽器，訪問：https://one.dash.cloudflare.com/
   - 如果沒有 Zero Trust 訪問權限，會提示您啟用（免費版本可用）

2. **進入 Tunnels 頁面**
   - 登入後，點擊左側菜單 **Zero Trust**
   - 點擊 **Access** → **Tunnels**
   - 或直接訪問：https://one.dash.cloudflare.com/access/tunnels

3. **找到您的 Tunnel**
   - 在 Tunnels 列表中，找到：`jyt-gas-tunnel`
   - 點擊 Tunnel 名稱進入詳情頁

4. **獲取 Token**
   - 在 Tunnel 詳情頁面，找到 **Token** 按鈕（通常在右上角或配置區域）
   - 點擊 **Token** 按鈕
   - **立即複製完整的 Token**（很長的字符串，通常以 `eyJ` 開頭）
   - ⚠️ **重要**：Token 只顯示一次，請立即複製並保存！

### 方法 2：通過 Cloudflare Dashboard 創建新 Connector

如果找不到 Token 按鈕，可以創建新的 Connector：

1. 在 Tunnel 詳情頁面，點擊 **Configure**
2. 點擊 **Connectors** 標籤
3. 點擊 **Add Connector** 或 **Create Connector**
4. 給 Connector 命名（例如：`docker-connector`）
5. 創建後，會顯示 Token，複製它

## 📝 Token 格式說明

Cloudflare Tunnel Token 通常：
- 以 `eyJ` 開頭（Base64 編碼的 JSON）
- 非常長（200+ 字符）
- 格式類似：`eyJhIjoi...`（省略號代表更多字符）

**示例格式**（僅供參考，不是真實 Token）：
```
eyJhIjoiMTIzNDU2Nzg5MCIsInQiOiJDbG91ZGZsYXJlIFR1bm5lbCBUb2tlbiIsInMiOiJodHRwczovL2FwaS5jbG91ZGZsYXJlLmNvbSIsImUiOiIyMDI3LTEyLTMxVDIzOjU5OjU5WiJ9...
```

## 🔧 設置 Token

### 方法 1：使用腳本（推薦）

獲取 Token 後，運行：

```powershell
.\set-tunnel-token.ps1 -Token "your_copied_token_here"
```

將 `your_copied_token_here` 替換為您從 Dashboard 複製的完整 Token。

### 方法 2：手動編輯 .env 文件

1. 打開項目根目錄的 `.env` 文件
2. 找到第 164 行：
   ```env
   CF_TUNNEL_TOKEN=""
   ```
3. 改為：
   ```env
   CF_TUNNEL_TOKEN="your_copied_token_here"
   ```
4. 保存文件

## 🚀 啟動服務

設置 Token 後：

```powershell
# 啟動 Cloudflare Tunnel
docker compose up -d cloudflared

# 檢查狀態
docker compose ps cloudflared

# 查看日誌（應該看到連接成功）
docker compose logs cloudflared --tail 50
```

## ✅ 驗證設置

### 1. 檢查日誌

應該看到類似：
```
INF +--------------------------------------------------------------------------------------------+
INF |  Your quick Tunnel has been created! Visit it at:                                          |
INF |  https://linebot.jytian.it.com                                                              |
INF +--------------------------------------------------------------------------------------------+
```

### 2. 測試外網訪問

```powershell
curl https://linebot.jytian.it.com/api/webhook/line
```

應該返回：
```json
{
  "status": "ready",
  "message": "LINE Bot Webhook is ready (Humanized Conversational AI)",
  ...
}
```

### 3. 在 LINE Developers Console 驗證

1. 訪問：https://developers.line.biz/console/
2. 選擇您的 LINE Bot
3. 進入 **Messaging API** 標籤
4. 點擊 **Verify** 按鈕
5. 應該顯示：**✅ Webhook URL is valid**

## 🐛 常見問題

### Q: 找不到 Zero Trust 選項
**A:** 
- Cloudflare Zero Trust 有免費版本，但需要啟用
- 訪問：https://one.dash.cloudflare.com/ 直接進入
- 或聯繫 Cloudflare 支持啟用 Zero Trust

### Q: 找不到 Token 按鈕
**A:**
- 確保您已進入 Tunnel 詳情頁面（點擊 Tunnel 名稱）
- 嘗試創建新的 Connector 來獲取 Token
- 檢查是否有權限查看 Token

### Q: Token 無效
**A:**
- 確認複製了完整的 Token（沒有截斷）
- 確認沒有多餘的空格
- 重新從 Dashboard 獲取新的 Token

### Q: 容器無法啟動
**A:**
```powershell
# 檢查日誌
docker compose logs cloudflared

# 檢查 .env 文件格式
Get-Content .env | Select-String "CF_TUNNEL_TOKEN"

# 重新啟動
docker compose down cloudflared
docker compose up -d cloudflared
```

## 📋 快速檢查清單

- [ ] 已訪問 Cloudflare Zero Trust Dashboard
- [ ] 已進入 Tunnels 頁面
- [ ] 已找到 Tunnel：`jyt-gas-tunnel`
- [ ] 已點擊 Token 按鈕
- [ ] 已複製完整的 Token
- [ ] 已設置到 `.env` 文件
- [ ] 已啟動 Cloudflare Tunnel 容器
- [ ] 日誌顯示連接成功
- [ ] 外網可以訪問 `https://linebot.jytian.it.com/api/webhook/line`
- [ ] LINE Developers Console 驗證成功

---

**需要幫助？** 所有配置都已自動完成，只需獲取 Token 並設置即可！

