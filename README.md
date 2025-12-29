# 九九瓦斯行管理系統 (BossJy-99 Gas Management System)

## 📋 專案概述

這是一個完整的瓦斯行管理系統，使用現代化技術棧開發，提供客戶管理、訂單處理、庫存管理、配送追蹤、LINE Bot 整合等功能。

### 🎯 主要功能

- ✅ **客戶管理** - 完整的客戶資料管理、分組、信用額度
- ✅ **訂單管理** - 訂單創建、編輯、配送追蹤、簽收
- ✅ **庫存管理** - 產品庫存、交易記錄、庫存警告
- ✅ **財務管理** - 成本記錄、支票管理、月度結單
- ✅ **車隊管理** - 司機位置追蹤、派單系統、配送記錄
- ✅ **LINE Bot** - 智能對話、訂單查詢、通知推送
- ✅ **AI 整合** - GLM-4.7、Ollama、語音識別、文字轉語音
- ✅ **實時功能** - WebSocket 同步、來電顯示、即時通知

---

## 🛠️ 技術棧

### 前端
- **Next.js 15** - React 框架
- **TypeScript** - 類型安全
- **Tailwind CSS** - 樣式框架
- **Prisma** - ORM

### 後端
- **Next.js API Routes** - Serverless Functions
- **PostgreSQL 16** - 數據庫
- **Prisma** - 數據庫 ORM

### DevOps
- **Docker & Docker Compose** - 容器化部署
- **Vercel** - 雲端部署（計劃中）
- **Supabase** - 雲端數據庫（計劃中）
- **GitHub Actions** - CI/CD

### 外部服務
- **LINE Bot API** - LINE Bot
- **Deepgram** - 語音轉文字
- **Azure Speech** - 文字轉語音
- **GLM API** - AI 對話
- **Ollama** - 本地 AI 模型

---

## 📦 安裝與設置

### 本地開發（Docker）

```bash
# 1. 複製項目
git clone https://github.com/TIAN0517/bossai.git
cd bossai

# 2. 啟動服務
docker-compose up -d

# 3. 訪問應用
# 前端: http://localhost:9999
# API: http://localhost:9999/api
```

### Vercel 雲端部署（推薦）

詳細遷移指南請查看：[MIGRATION_TO_VERCEL_SUPABASE.md](./MIGRATION_TO_VERCEL_SUPABASE.md)

```bash
# 1. 推送到 GitHub
git push origin main

# 2. 在 Vercel 導入項目
#    https://vercel.com/new

# 3. 配置環境變量
#    DATABASE_URL = [Supabase URL]
#    其他 API Keys
```

### GitHub Codespaces 開發

1. 點擊 GitHub 倉庫的 "Code" → "Codespaces"
2. 點擊 "New codespace"
3. 選擇分支和配置
4. 自動開啟開發環境

---

## 🗄️ 數據庫遷移

從 Docker 遷移到 Supabase：

```bash
# 1. 導出 Docker 數據庫
./export-docker-db.sh  # Linux/Mac
# 或
.\export-docker-db.ps1  # Windows

# 2. 導入到 Supabase
export SUPABASE_URL="postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres"
./import-to-supabase.sh backup.sql
```

詳細步驟請參考：[MIGRATION_TO_VERCEL_SUPABASE.md](./MIGRATION_TO_VERCEL_SUPABASE.md)

---

## 📁 項目結構

```
bossai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes (60+ 個端點)
│   │   ├── chat/              # 聊天頁面
│   │   ├── login/             # 登入頁面
│   │   └── page.tsx           # 首頁
│   ├── components/             # React 組件
│   └── lib/                 # 工具函數
├── prisma/
│   └── schema.prisma           # 數據庫模型 (25+ 個模型)
├── db/
│   └── init/                  # 數據庫初始化腳本
├── mini-services/              # 微服務
│   ├── call-display-service/
│   ├── sync-websocket-service/
│   └── voice-realtime-service/
├── docker-compose.yml          # Docker 編排
├── Dockerfile                 # Docker 映像構建
└── vercel.json               # Vercel 配置
```

---

## 🔑 API 端點總覽

### 認證
- `/api/auth/login` - 登入
- `/api/auth/register` - 註冊
- `/api/auth/me` - 當前用戶
- `/api/auth/logout` - 登出

### 客戶與訂單
- `/api/customers` - 客戶管理
- `/api/orders` - 訂單管理
- `/api/products` - 產品管理
- `/api/inventory` - 庫存管理

### AI 與語音
- `/api/ai/chat` - AI 對話
- `/api/voice/stt` - 語音識別
- `/api/voice/tts` - 文字轉語音
- `/api/voice/realtime` - 即時語音

### Webhook
- `/api/webhook/line` - LINE Webhook
- `/api/external-systems` - 外部系統整合

詳細 API 文檔請參考代碼中的 `src/app/api/` 目錄。

---

## 🗄️ 數據庫模型

### 核心業務模型
- `User` - 用戶/員工
- `Customer` - 客戶
- `Product` - 產品
- `Inventory` - 庫存
- `GasOrder` - 訂單

### 財務模型
- `CostRecord` - 成本記錄
- `Check` - 支票
- `MonthlyStatement` - 月度結單

### 配送模型
- `DeliveryRecord` - 配送記錄
- `DriverLocation` - 司機位置
- `DispatchRecord` - 派單記錄

### LINE Bot 模型
- `LineGroup` - LINE 群組
- `LineMessage` - LINE 訊息
- `LineConversation` - 對話上下文

完整模型定義請查看：[prisma/schema.prisma](./prisma/schema.prisma)

---

## 🚀 開發指南

### 啟動開發環境

```bash
# 本地開發
npm run dev
# 訪問: http://localhost:3000

# Docker 開發
docker-compose up
# 訪問: http://localhost:9999
```

### 數據庫遷移

```bash
# 生成 Prisma Client
npx prisma generate

# 執行遷移
npx prisma migrate dev

# 填充種子數據
npx prisma db seed
```

### 代碼規範

- 使用 TypeScript 類型
- 遵循 ESLint 規則
- 使用 Prisma 進行數據庫操作
- API Routes 使用 async/await
- 組件使用 React Hooks

---

## 📊 部署選項

### Docker（本地部署）

**優勢：**
- 完全控制
- 離線可用
- 適合開發測試

**限制：**
- 需要本地服務器
- 需要手動維護
- 依賴本地機器

### Vercel + Supabase（推薦）

**優勢：**
- ✅ 完全免費
- ✅ 全球 CDN
- ✅ 自動部署
- ✅ 零維護
- ✅ 99.99% 可用性

**詳細指南：** [MIGRATION_TO_VERCEL_SUPABASE.md](./MIGRATION_TO_VERCEL_SUPABASE.md)

---

## 🔧 環境變量

必需環境變量（查看 `.env.vercel.template`）：

```env
# 數據庫
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...

# AI
GLM_API_KEYS=...
OLLAMA_API_KEY=...

# 語音
DG_API_KEY=...  # Deepgram
AZ_SPEECH_KEY=...  # Azure
```

---

## 📞 技術支持

- 📧 Email: [您的郵箱]
- 💬 GitHub Issues: https://github.com/TIAN0517/bossai/issues
- 📝 文檔: [MIGRATION_TO_VERCEL_SUPABASE.md](./MIGRATION_TO_VERCEL_SUPABASE.md)

---

## 📜 授權證書

此項目採用 MIT 授權證書。詳細內容請查看 [LICENSE](./LICENSE) 文件。

---

## 🙏 致謝

感謝以下開源項目和服務：

- Next.js - React 框架
- Prisma - 數據庫 ORM
- Tailwind CSS - 樣式框架
- LINE Bot - LINE 平台
- Deepgram - 語音識別
- Azure Speech - 文字轉語音
- GLM API - AI 模型

---

## 📝 版本歷史

- v1.0.0 - 初始版本 (2024-12-29)
  - 完整的瓦斯行管理系統
  - LINE Bot 整合
  - AI 對話功能
  - 語音識別和合成
  - Docker 部署支持
  - Vercel + Supabase 遷移工具

---

## 🎯 未來計劃

- [ ] 完整遷移到 Vercel + Supabase
- [ ] 移動端 APP（React Native）
- [ ] 管理後台數據分析儀表板
- [ ] 自動化報告生成
- [ ] 多語言支持（繁體中文、簡體中文）
- [ ] 更多 AI 功能（智能推薦、預測分析）

---

Made with ❤️ by BossJy-99 Team

**Jy技術團隊** © 2024
