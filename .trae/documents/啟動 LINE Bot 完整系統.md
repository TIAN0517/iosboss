## 📋 執行計劃：啟動所有服務

### 步驟 1：啟動 Next.js 開發伺服器
```bash
npm run dev
```
- 監聽端口：9999
- 提供所有 API 和前端介面

### 步驟 2：安裝並啟動 Cloudflared 服務
```bash
cloudflared.exe service install eyJhIjoiMjk0ZWE4NTM5ZDRkMTc5MzRjZTA5NDM4ZDdjMDE5NjciLCJ0IjoiNmI5NzU4NTMtZDY4YS00MjYyLTk4NzAtYmMxMGFhZGUyNzU5IiwicyI6IjkySXdaVFJsWlRZdFlqa3hOaTAwWkRNMkxXRTRZVEl0WVRjMk9EWTNNVEF3Tm1GbSJ9
cloudflared.exe service start
```
- 連接 Cloudflare Tunnel
- 提供 HTTPS 訪問

### 步驟 3：驗證服務狀態
```bash
curl -X POST https://linebot.tiankai.it.com/api/webhook/line \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'
```
- 預期返回：`{"status":"ok","message":"Empty request"}`

### 步驟 4：更新 LINE Developer Console
- Webhook URL：`https://linebot.tiankai.it.com/api/webhook/line`
- 點擊 Verify 按鈕

### 預期結果
- ✅ 所有服務運行
- ✅ LINE Bot 可用
- ✅ 數據庫同步
- ✅ AI 對話正常
- ✅ 員工打卡功能正常

**準備執行嗎？**