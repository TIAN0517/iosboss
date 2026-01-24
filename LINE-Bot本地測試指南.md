# LINE Bot 本地測試指南

## 🔴 當前問題

```
SSL 錯誤 → LINE webhook 無法連接
原因 → 子域名未配置或指向錯誤
```

## ✅ 解決方案

### 方案 1: 忽略 LINE Bot（最簡單）

**你的系統完全可以正常使用！**

- ✅ 網頁管理界面
- ✅ 訂單管理
- ✅ 客戶管理
- ✅ 庫存管理
- ✅ AI 助手（網頁版）
- ❌ LINE Bot 自動回覆

**只需要暫時不用 LINE Bot 功能就好！**

### 方案 2: 使用 Ngrok（需要 LINE Bot）

#### 步驟 1: 下載 Ngrok
1. 訪問: https://ngrok.com/download
2. 下載 Windows 版本
3. 解壓縮到專案根目錄

#### 步驟 2: 啟動 Ngrok
```bash
ngrok http 9999
```

#### 步驟 3: 更新 LINE Webhook
1. 複製 ngrok 給你的 HTTPS URL (如: https://xxx.ngrok.io)
2. 到 LINE Developers 設置 webhook:
   ```
   https://xxx.ngrok.io/api/webhook/line
   ```

#### 步驟 4: 更新 .env
```env
LINE_WEBHOOK_URL=https://xxx.ngrok.io/api/webhook/line
```

### 方案 3: 配置真實域名（生產環境）

如果要正式上線，需要:

1. **購買域名** 或使用現有域名
2. **配置 DNS**:
   ```
   A記錄: bossai.tiankai.it.com → 你的伺服器 IP
   A記錄: ai.tiankai.it.com → 你的伺服器 IP
   ```

3. **配置 SSL**:
   - 使用 Let's Encrypt (免費)
   - 或使用 Cloudflare Proxy

4. **更新 LINE Webhook URL**:
   ```
   https://bossai.tiankai.it.com/api/webhook/line
   ```

## 🎯 推薦做法

**本地開發**: 忽略 LINE Bot，用網頁界面測試
**正式上線**: 配置域名 + SSL + LINE webhook

## 📝 快速測試

```bash
# 測試 Node.js 服務
curl http://localhost:9999/api/health

# 測試 Python 服務
curl http://localhost:8888/api/health

# 測試數據庫連接
npm run db:push
```

---

**目前建議: 先用網頁界面開發，LINE Bot 之後再配置！** 🎯
