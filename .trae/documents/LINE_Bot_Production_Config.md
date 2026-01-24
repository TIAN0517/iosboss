# LINE Bot 生產環境統一配置方案

## 🎯 **配置目標**
建立一個穩定、統一的 LINE Bot 生產環境配置，一次配置好，後續無需頻繁修改。

## 📋 **系統架構**
```
Internet → nginx (bossai.jytian.it.com) → 應用服務
                           ↓
                  ┌──────┼──────┐
                  ↓      ↓      ↓
              LINE Bot  Frontend  Others
             (5001)   (9999)   (其他)
```

## 🔧 **最終配置方案**

### **1. nginx 統一配置文件**
- 文件位置：`C:\nginx\conf\linebot.conf`
- 域名：`bossai.jytian.it.com`
- SSL 證書：`C:/nginx/html/bossai.jytian.it.com-crt.pem`

### **2. 端口分配**
- **5001**: LINE Bot API 服務
- **9999**: 前端應用
- **443**: nginx HTTPS
- **80**: HTTP 重定向

### **3. 端點映射**
- `https://bossai.jytian.it.com/api/webhook/line` → LINE Bot (5001)
- `https://bossai.jytian.it.com/api/*` → LINE Bot (5001)
- `https://bossai.jytian.it.com/health` → LINE Bot (5001)
- `https://bossai.jytian.it.com/*` → Frontend (9999)

### **4. LINE Webhook 配置**
- 固定 URL：`https://bossai.jytian.it.com/api/webhook/line`
- 優化 POST 處理
- LINE 簽名驗證
- 50MB 請求體限制

## 📝 **配置文件內容**
完整的 nginx 配置包含：
- SSL/HTTPS 設置
- LINE Webhook 專用配置
- 前端應用代理
- 健康檢查端點
- WebSocket 支持

## 🔄 **部署步驟**
1. 應用 nginx 配置
2. 重新啟動 nginx
3. 驗證所有端點
4. 更新 LINE Developers Console Webhook URL

## ✅ **驗證清單**
- [ ] nginx 配置應用成功
- [ ] 所有服務正常運行
- [ ] LINE Webhook 可達性測試
- [ ] 前端應用可訪問
- [ ] 健康檢查通過

這個配置方案將作為標準模板，後續維護人員可直接使用，無需重新設計架構。