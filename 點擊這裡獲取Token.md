# 🎯 獲取 Token 步驟（您已在正確頁面）

## ✅ 當前位置

您現在在 **Cloudflare Tunnels 列表頁面**，這是正確的起點！

## 📋 我看到的信息

- ✅ Tunnel 名稱：`jyt-gas-tunnel`
- ✅ Tunnel ID：`db89d429-b35d-4232-9e53-244ed2890713`
- ⚠️ 狀態：關閉（需要 Token 才能連接）

## 🎯 下一步操作（3 步）

### 步驟 1：點擊 Tunnel 名稱

在列表中，找到 **`jyt-gas-tunnel`** 這一行，**點擊 Tunnel 名稱**（不是其他按鈕）。

這會帶您進入 Tunnel 詳情頁面。

### 步驟 2：找到 Token 按鈕

進入詳情頁面後，您會看到：

- **Configure** 按鈕（配置按鈕）
- **Token** 按鈕（通常在右上角或配置區域）

**點擊 Token 按鈕**。

### 步驟 3：複製 Token

點擊 Token 按鈕後，會顯示一個很長的字符串：
- 通常以 `eyJ` 開頭
- 非常長（200+ 字符）
- ⚠️ **只顯示一次，請立即複製！**

## 📝 設置 Token

獲取 Token 後，有兩種方式設置：

### 方法 1：告訴我，我幫您設置

複製 Token 後，直接告訴我，我會幫您設置到 `.env` 文件。

### 方法 2：自己設置

運行以下命令：

```powershell
.\set-tunnel-token.ps1 -Token "your_copied_token_here"
```

或手動編輯 `.env` 文件第 164 行。

## ✅ 完成後的步驟

設置 Token 後：

```powershell
# 啟動 Cloudflare Tunnel
docker compose up -d cloudflared

# 檢查狀態
docker compose ps cloudflared

# 查看日誌
docker compose logs cloudflared --tail 50

# 測試連接
curl https://linebot.jytian.it.com/api/webhook/line
```

## 🎯 快速總結

1. ✅ 您已在正確的頁面（Tunnels 列表）
2. 👆 **點擊 `jyt-gas-tunnel` 名稱**
3. 🔑 **在詳情頁點擊 Token 按鈕**
4. 📋 **複製 Token 並告訴我**

---

**就是這麼簡單！** 點擊 `jyt-gas-tunnel` 進入詳情頁，然後找到 Token 按鈕即可。

