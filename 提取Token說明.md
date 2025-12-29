# 🔑 如何從頁面提取 Token

## ✅ 您已在正確的頁面！

我看到您的頁面上有 **"安裝並執行連接器"** (Install and Run Connector) 部分。

## 📋 找到 Token

在頁面上，您會看到一個命令，類似：

```
cloudflared.exe service install eyJhIjoiMj...
```

**Token 就是 `eyJhIjoiMj...` 這部分！**

## 🎯 提取 Token 的步驟

### 方法 1：從命令中複製（推薦）

1. **找到安裝命令**
   - 在 "安裝並執行連接器" 部分
   - 找到以 `cloudflared.exe service install` 開頭的命令

2. **複製 Token 部分**
   - Token 是 `install` 後面的所有內容
   - 從 `eyJ` 開始，一直到命令結尾
   - 通常非常長（200+ 字符）

3. **完整格式示例**：
   ```
   eyJhIjoiMjIzNDU2Nzg5MCIsInQiOiJDbG91ZGZsYXJlIFR1bm5lbCBUb2tlbiIsInMiOiJodHRwczovL2FwaS5jbG91ZGZsYXJlLmNvbSIsImUiOiIyMDI3LTEyLTMxVDIzOjU5OjU5WiJ9...
   ```

### 方法 2：使用複製按鈕

如果頁面上有 **複製按鈕**（通常在命令框右側）：
1. 點擊複製按鈕
2. 複製整個命令
3. 從中提取 Token 部分（`install` 後面的內容）

## 📝 設置 Token

獲取完整的 Token 後，告訴我，我會幫您設置。

或者您也可以自己運行：

```powershell
.\set-tunnel-token.ps1 -Token "your_complete_token_here"
```

## ✅ Token 格式確認

正確的 Token 應該：
- ✅ 以 `eyJ` 開頭
- ✅ 非常長（200+ 字符）
- ✅ 包含 Base64 編碼字符
- ✅ 沒有空格或換行

## 🚀 設置後的步驟

```powershell
# 1. 啟動 Cloudflare Tunnel
docker compose up -d cloudflared

# 2. 檢查狀態
docker compose ps cloudflared

# 3. 查看日誌
docker compose logs cloudflared --tail 50

# 4. 測試連接
curl https://linebot.jytian.it.com/api/webhook/line
```

---

**重要**：請複製完整的 Token（從 `eyJ` 開始到命令結尾），然後告訴我！

