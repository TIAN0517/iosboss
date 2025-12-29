# 🔒 HTTPS 配置檢查指南

## ✅ Cloudflare Tunnel 默認使用 HTTPS

Cloudflare Tunnel **默認通過 HTTPS 提供服務**，因為：
- Cloudflare 自動處理 SSL/TLS 終止
- 所有通過 Cloudflare Tunnel 的流量都是 HTTPS
- LINE Webhook URL 應該使用 `https://linebot.jytian.it.com`

## 🔍 需要檢查的配置

### 1. Cloudflare SSL/TLS 設置

**必須設置為 Full 或 Full (strict)**，不能是 Flexible。

#### 檢查步驟：
1. 訪問：https://dash.cloudflare.com/
2. 選擇域名：`jytian.it.com`
3. 進入 **SSL/TLS** 設置
4. 確認模式是 **Full** 或 **Full (strict)**

#### 如果設置錯誤：
1. 點擊 **SSL/TLS** 設置
2. 選擇 **Full** 或 **Full (strict)**
3. 保存設置

### 2. LINE Webhook URL

在 LINE Developers Console 中，Webhook URL 應該是：
```
https://linebot.jytian.it.com/api/webhook/line
```

**注意**：
- ✅ 使用 `https://`（不是 `http://`）
- ✅ 使用完整的域名 `linebot.jytian.it.com`
- ✅ 包含路徑 `/api/webhook/line`

### 3. Cloudflare Tunnel 配置

Tunnel 內部使用 HTTP（`http://nginx:80`）是正確的，因為：
- Cloudflare 會自動將 HTTPS 轉換為內部 HTTP
- 這是 Cloudflare Tunnel 的標準配置方式

## 📋 SSL/TLS 模式說明

| 模式 | 說明 | LINE 支持 |
|------|------|----------|
| **Off** | 不加密 | ❌ 不支持 |
| **Flexible** | Cloudflare ↔ 瀏覽器：HTTPS<br>Cloudflare ↔ 源服務器：HTTP | ⚠️ 可能不支持 |
| **Full** | Cloudflare ↔ 瀏覽器：HTTPS<br>Cloudflare ↔ 源服務器：HTTP（不驗證證書） | ✅ 支持 |
| **Full (strict)** | Cloudflare ↔ 瀏覽器：HTTPS<br>Cloudflare ↔ 源服務器：HTTPS（驗證證書） | ✅ 支持 |

**推薦**：使用 **Full** 模式（因為內部使用 HTTP）

## 🔧 修復步驟

### 如果 SSL/TLS 模式不是 Full：

1. **通過 Dashboard 修改**：
   - 訪問：https://dash.cloudflare.com/
   - 選擇域名：`jytian.it.com`
   - 進入 **SSL/TLS** → **Overview**
   - 選擇 **Full**
   - 保存

2. **通過 API 修改**（如果需要）：
   ```powershell
   # 獲取 Zone ID
   $zoneId = (curl -s "https://api.cloudflare.com/client/v4/zones?name=jytian.it.com" -H "Authorization: Bearer YOUR_API_TOKEN" | ConvertFrom-Json).result[0].id
   
   # 設置為 Full
   curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$zoneId/settings/ssl" `
     -H "Authorization: Bearer YOUR_API_TOKEN" `
     -H "Content-Type: application/json" `
     -d '{"value":"full"}'
   ```

## ✅ 驗證 HTTPS

### 測試 HTTPS 連接：
```powershell
curl -I https://linebot.jytian.it.com/api/webhook/line
```

應該看到：
- `HTTP/2 200` 或 `HTTP/1.1 200`
- SSL/TLS 相關的頭部信息

### 檢查證書：
```powershell
openssl s_client -connect linebot.jytian.it.com:443 -servername linebot.jytian.it.com
```

## 🎯 LINE Webhook 要求

LINE 要求：
- ✅ **必須使用 HTTPS**
- ✅ **必須是有效的 SSL 證書**
- ✅ **必須返回 200 狀態碼**

## 📝 當前配置檢查

- [ ] Cloudflare SSL/TLS 模式是 **Full** 或 **Full (strict)**
- [ ] LINE Webhook URL 使用 `https://`
- [ ] Tunnel 配置正確（內部 HTTP，外部 HTTPS）
- [ ] 外網可以通過 HTTPS 訪問

---

**重要**：確保 Cloudflare SSL/TLS 模式設置為 **Full**，這樣 LINE 才能正常訪問！

