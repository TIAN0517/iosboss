# 🔑 如何獲取 Cloudflare Tunnel Token

## ⚠️ 重要區別

### API Token（您剛創建的）
- ✅ 用途：Cloudflare API 調用
- ✅ 格式：短字符串（如：`8DmN7UdbeDerrv_rwp373a1C8rHsaXcJmCgmWYuw`）
- ✅ 獲取位置：API Token 管理頁面
- ✅ 狀態：已創建

### Tunnel Token（我們需要的）⚠️
- ❌ 用途：Cloudflare Tunnel 連接
- ❌ 格式：很長的字符串，通常以 `eyJ` 開頭（Base64 編碼）
- ❌ 獲取位置：**Tunnel 詳情頁面**（不同的頁面）
- ❌ 狀態：**還未獲取**

## 🎯 獲取 Tunnel Token 的正確步驟

### 步驟 1：離開 API Token 頁面

您現在在 **API Token 管理頁面**，需要切換到 **Tunnel 頁面**。

### 步驟 2：進入 Tunnel 頁面

1. **點擊左側菜單** → **Zero Trust**
   - 如果沒有看到 Zero Trust，訪問：https://one.dash.cloudflare.com/

2. **進入 Tunnels**
   - 點擊 **Access** → **Tunnels**
   - 或直接訪問：https://one.dash.cloudflare.com/access/tunnels

### 步驟 3：找到您的 Tunnel

1. 在 Tunnels 列表中，找到：**`jyt-gas-tunnel`**
2. **點擊 Tunnel 名稱**（不是編輯按鈕）

### 步驟 4：獲取 Token

1. 進入 Tunnel 詳情頁面後
2. 找到 **Token** 按鈕（通常在右上角或配置區域）
3. 點擊 **Token** 按鈕
4. **立即複製完整的 Token**
   - 通常很長（200+ 字符）
   - 通常以 `eyJ` 開頭
   - ⚠️ **只顯示一次，請立即複製！**

### 步驟 5：設置 Token

獲取 Token 後，運行：

```powershell
.\set-tunnel-token.ps1 -Token "your_tunnel_token_here"
```

或手動編輯 `.env` 文件第 164 行：
```env
CF_TUNNEL_TOKEN="your_tunnel_token_here"
```

### 步驟 6：啟動服務

```powershell
docker compose up -d cloudflared
docker compose logs cloudflared --tail 50
```

## 📍 頁面導航對比

| 當前位置 | 目標位置 |
|---------|---------|
| 管理帳戶 → API 權杖 | Zero Trust → Access → Tunnels |
| API Token 列表/創建頁面 | Tunnel 詳情頁面 |
| 創建/編輯 API Token | 查看 Tunnel Token |

## 🎯 快速導航

### 方法 1：通過左側菜單
1. 點擊左側菜單 **Zero Trust**
2. 點擊 **Access**
3. 點擊 **Tunnels**
4. 找到並點擊 **`jyt-gas-tunnel`**

### 方法 2：直接訪問
訪問：https://one.dash.cloudflare.com/access/tunnels

然後找到並點擊 **`jyt-gas-tunnel`**

## ✅ 驗證 Token 格式

獲取 Token 後，確認：
- ✅ 很長（200+ 字符）
- ✅ 通常以 `eyJ` 開頭
- ✅ 包含 Base64 編碼字符

**示例格式**（僅供參考）：
```
eyJhIjoiMTIzNDU2Nzg5MCIsInQiOiJDbG91ZGZsYXJlIFR1bm5lbCBUb2tlbiIsInMiOiJodHRwczovL2FwaS5jbG91ZGZsYXJlLmNvbSIsImUiOiIyMDI3LTEyLTMxVDIzOjU5OjU5WiJ9...
```

## 🐛 如果找不到 Token 按鈕

1. **確認您在正確的頁面**
   - 應該是 Tunnel 詳情頁面，不是 API Token 頁面

2. **嘗試創建新的 Connector**
   - 在 Tunnel 詳情頁面，點擊 **Configure**
   - 點擊 **Connectors** 標籤
   - 點擊 **Add Connector** 或 **Create Connector**
   - 創建後會顯示 Token

3. **檢查權限**
   - 確認您的帳號有查看 Tunnel Token 的權限

## 📝 完成後的檢查

設置 Token 並啟動服務後：

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

---

**記住**：API Token ≠ Tunnel Token，需要從不同的頁面獲取！

