# API 端點全面盤點
# 確保沒有衝突的服務架構

## 🚀 Next.js 應用 (Port 9999)
### 基本端點
- GET  / (主頁面)
- GET  /login (登入頁面)
- GET  /register (註冊頁面)
- GET  /chat (聊天頁面)

### 認證 API
- POST /api/auth/login (登入)
- POST /api/auth/logout (登出)
- GET  /api/auth/me (當前用戶)
- POST /api/auth/register (註冊)
- POST /api/auth/create-super-admin (創建管理員)
- POST /api/auth/init-admin (初始化管理員)
- POST /api/auth/self-register (自助註冊)

### 核心業務 API
- GET  /api/customers (客戶列表)
- GET  /api/customers/[id] (客戶詳情)
- POST /api/customers (新增客戶)
- PUT  /api/customers/[id] (更新客戶)
- DELETE /api/customers/[id] (刪除客戶)

- GET  /api/orders (訂單列表)
- GET  /api/orders/[id] (訂單詳情)
- POST /api/orders (新增訂單)
- PUT  /api/orders/[id] (更新訂單)
- DELETE /api/orders/[id] (刪除訂單)

- GET  /api/products (商品列表)
- GET  /api/products/[id] (商品詳情)
- POST /api/products (新增商品)
- PUT  /api/products/[id] (更新商品)
- DELETE /api/products/[id] (刪除商品)

### 智能功能 API
- POST /api/ai/chat (AI 聊天)
- POST /api/chat (聊天功能)
- GET  /api/alerts (智能提醒)

### 語音功能 API (Port 9999)
- POST /api/voice/chat (語音聊天 - 與外部服務集成)
- POST /api/voice/diag (語音診斷)
- POST /api/voice/realtime (語音即時)
- POST /api/voice/stream (語音流)
- POST /api/voice/stt (語音轉文字)
- POST /api/voice/tts (文字轉語音)
- POST /api/voice/webhook (語音Webhook)

### LINE Bot API
- POST /api/webhook/line (LINE Webhook)
- GET  /api/webhook/line/debug (LINE Debug)
- GET  /api/webhook/line/get-groups (獲取群組)
- POST /api/webhook/receive/[systemId] (Webhook接收)
- GET  /api/webhook-logs (Webhook日誌)

### 其他業務 API
- GET  /api/inventory (庫存)
- POST /api/inventory/transactions (庫存交易)
- GET  /api/checks (支票)
- POST /api/checks/[id] (支票詳情)
- GET  /api/cost-analysis (成本分析)
- GET  /api/costs (費用)
- GET  /api/customer-groups (客戶群組)
- GET  /api/monthly-statements (月結單)
- GET  /api/meter-readings (抄表)
- GET  /api/promotions (促銷)
- GET  /api/sheets (表單)
- POST /api/sheets/[id]/review (表單審核)
- GET  /api/sheets/today (今日表單)
- GET  /api/sheets/daily-notify (每日通知)
- GET  /api/staff (員工)
- POST /api/staff/[id] (員工詳情)

---

## 🎤 LINE Bot AI 服務 (Port 8888)
### 主要端點
- GET  / (服務狀態)
- POST /api/webhook/line (LINE Webhook接收)
- GET  /api/health (健康檢查)

---

## 🎤 語音測試服務 (Port 8889)
### 主要端點
- GET  / (服務狀態)
- GET  /health (健康檢查)
- POST /api/voice/simple (簡單語音聊天)
- POST /api/voice/test (語音服務測試)

---

## 📊 PostgreSQL 數據庫 (Port 5432)
### 連接配置
- Host: localhost
- Port: 5432
- Database: postgres
- User: postgres
- Password: Ss520520

---

## 🔄 服務依賴關係

### Next.js (9999) 依賴
- PostgreSQL 數據庫 (5432)
- LINE Bot AI (8888) - Webhook
- 外部語音服務 - TTS/ASR

### LINE Bot AI (8888) 獨立運行
- PostgreSQL 數據庫 (5432)
- 不依賴其他服務

### 語音測試服務 (8889) 獨立運行
- 不依賴數據庫
- 提供本地語音測試功能

---

## ⚠️ 注意事項

### 端口衝突
- 確保 8888, 8889, 9999, 5432 端口沒有被其他服務占用

### API 路徑衝突
- `/api/voice/*` 在 Next.js 和語音服務中都有定義
- 通過不同端口區分，無衝突

### 數據庫連接
- 所有服務使用相同的 PostgreSQL 連接
- 確保數據庫服務正常運行

### CORS 設定
- 所有 API 都配置了 CORS，允許跨域請求
- 生產環境需要根據實際需求調整

---

## 🚀 啟動順序建議

1. **PostgreSQL** (5432) - 必須最先啟動
2. **LINE Bot AI** (8888) - 獨立服務
3. **語音測試服務** (8889) - 獨立服務
4. **Next.js** (9999) - 依賴其他服務

## 🔧 故障排除

### 常見問題
1. **端口被占用**: 使用 netstat 檢查並關閉衝突進程
2. **數據庫連接失敗**: 檢查 PostgreSQL 服務狀態
3. **API 404**: 檢查服務是否正常啟動
4. **CORS 錯誤**: 檢查 CORS 配置和請求域名

### 檢查命令
```bash
# 檢查端口占用
netstat -ano | Select-String "8888|8889|9999|5432"

# 檢查服務狀態
curl http://localhost:9999/api/health
curl http://localhost:8888/api/health  
curl http://localhost:8889/health

# 測試數據庫連接
# 使用 Prisma 數據庫連接測試
```
