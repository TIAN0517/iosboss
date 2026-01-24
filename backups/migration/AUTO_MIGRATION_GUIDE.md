# 🤖 九九瓦斯行管理系統 - 自動化遷移完整指南

## 🎯 目標

**完全自動化**將九九瓦斯行管理系統從 Docker 遷移到 Supabase + Vercel，確保**不遺漏任何數據**。

---

## 📋 遷移檢查清單

### ✅ 已完成項目

- [x] Docker 數據庫導出成功
- [x] Supabase 項目創建完成
- [x] 所有表結構已創建（32 個表）
- [x] 所有索引已創建（85 個索引）
- [x] 所有外鍵約束已創建（25 個外鍵）
- [x] 部分核心數據已導入（60 條記錄）

### ⏳ 待完成項目

- [ ] **完整數據導入**（從 SQL 文件導入所有數據）
- [ ] **數據完整性驗證**（確保所有表都有數據）
- [ ] **環境變量配置**（Supabase、GLM、LINE 等）
- [ ] **Vercel 部署配置**（環境變量、構建配置）
- [ ] **應用程序連接測試**（確保應用能連接到 Supabase）
- [ ] **功能驗證**（測試所有功能是否正常）

---

## 🚀 自動化遷移步驟

### 步驟 1：運行自動化檢查腳本

#### Windows PowerShell：

```powershell
# 設置 Supabase 憑證
$env:SUPABASE_ANON_KEY = "sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ"
$env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2"

# 運行完整遷移腳本
.\scripts\complete-migration.ps1 -GenerateVercelConfig
```

#### 或使用簡化檢查腳本：

```powershell
.\scripts\auto-migrate-to-supabase.ps1
```

---

### 步驟 2：導入完整數據到 Supabase

#### 方法 A：使用 Supabase SQL Editor（推薦）⭐

**這是最可靠的方法，確保所有數據都能正確導入！**

1. **訪問 Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/sql
   ```

2. **打開 SQL 文件**
   - 文件位置：`backups/migration/gas-management-20251229-222610.sql`
   - 使用記事本或 VS Code 打開
   - 確保編碼為 UTF-8

3. **全選並複製**
   - 按 `Ctrl+A` 全選
   - 按 `Ctrl+C` 複製
   - 文件有 1948 行，複製可能需要幾秒鐘

4. **粘貼到 SQL Editor**
   - 在 Supabase SQL Editor 編輯區粘貼
   - 點擊 "Run" 按鈕或按 `Ctrl+Enter`

5. **等待導入完成**
   - 通常需要 1-2 分鐘
   - 看到 "Success" 消息即表示完成

6. **驗證導入結果**
   - 點擊左側 "Table Editor"
   - 查看各表的記錄數量
   - 確認數據是否正確

#### 方法 B：使用 psql 命令行（需要技術知識）

```powershell
# 1. 安裝 PostgreSQL 客戶端（如果還沒有）
# 下載：https://www.postgresql.org/download/windows/

# 2. 獲取 Supabase 連接 URL
# 在 Supabase Dashboard → Settings → Database → Connection string
# 格式：postgresql://postgres:[PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres

# 3. 導入數據
psql "postgresql://postgres:[PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres" < backups\migration\gas-management-20251229-222610.sql
```

---

### 步驟 3：驗證數據完整性

運行以下 SQL 查詢檢查所有表的記錄數量：

```sql
-- 在 Supabase SQL Editor 中執行
SELECT 
    'User' as table_name, COUNT(*)::int as record_count FROM "User"
UNION ALL SELECT 'Customer', COUNT(*)::int FROM "Customer"
UNION ALL SELECT 'Product', COUNT(*)::int FROM "Product"
UNION ALL SELECT 'ProductCategory', COUNT(*)::int FROM "ProductCategory"
UNION ALL SELECT 'Inventory', COUNT(*)::int FROM "Inventory"
UNION ALL SELECT 'CustomerGroup', COUNT(*)::int FROM "CustomerGroup"
UNION ALL SELECT 'GasOrder', COUNT(*)::int FROM "GasOrder"
UNION ALL SELECT 'GasOrderItem', COUNT(*)::int FROM "GasOrderItem"
UNION ALL SELECT 'DeliveryRecord', COUNT(*)::int FROM "DeliveryRecord"
UNION ALL SELECT 'Check', COUNT(*)::int FROM "Check"
UNION ALL SELECT 'CallRecord', COUNT(*)::int FROM "CallRecord"
UNION ALL SELECT 'CostRecord', COUNT(*)::int FROM "CostRecord"
UNION ALL SELECT 'CostItem', COUNT(*)::int FROM "CostItem"
UNION ALL SELECT 'MeterReading', COUNT(*)::int FROM "MeterReading"
UNION ALL SELECT 'MonthlyStatement', COUNT(*)::int FROM "MonthlyStatement"
UNION ALL SELECT 'Promotion', COUNT(*)::int FROM "Promotion"
UNION ALL SELECT 'AuditLog', COUNT(*)::int FROM "AuditLog"
UNION ALL SELECT 'WebhookLog', COUNT(*)::int FROM "WebhookLog"
UNION ALL SELECT 'ExternalSystem', COUNT(*)::int FROM "ExternalSystem"
UNION ALL SELECT 'InventoryTransaction', COUNT(*)::int FROM "InventoryTransaction"
UNION ALL SELECT 'LineGroup', COUNT(*)::int FROM "LineGroup"
UNION ALL SELECT 'LineMessage', COUNT(*)::int FROM "LineMessage"
UNION ALL SELECT 'LineConversation', COUNT(*)::int FROM "LineConversation"
UNION ALL SELECT 'dispatch_records', COUNT(*)::int FROM dispatch_records
UNION ALL SELECT 'driver_locations', COUNT(*)::int FROM driver_locations
UNION ALL SELECT 'employee_schedules', COUNT(*)::int FROM employee_schedules
UNION ALL SELECT 'inventory_alerts', COUNT(*)::int FROM inventory_alerts
UNION ALL SELECT 'schedule_sheets', COUNT(*)::int FROM schedule_sheets
UNION ALL SELECT 'schedule_stations', COUNT(*)::int FROM schedule_stations
UNION ALL SELECT 'sync_changes', COUNT(*)::int FROM sync_changes
UNION ALL SELECT 'sync_status', COUNT(*)::int FROM sync_status
ORDER BY table_name;
```

**預期結果**：所有表都應該有記錄（至少 0 條，表示表存在且可訪問）

---

### 步驟 4：配置環境變量

#### 創建 `.env.local` 文件：

```env
# ========================================
# 九九瓦斯行管理系統 - 環境變量配置
# ========================================

# 🌐 應用程式配置
NEXT_PUBLIC_APP_URL=http://localhost:9999
NODE_ENV=development
PORT=9999

# 🔐 Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2

# 資料庫連接（需要 Supabase 數據庫密碼）
# 獲取方式：Supabase Dashboard → Settings → Database → Database password
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR_PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres

# 🔑 JWT 配置
JWT_SECRET=9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY=

# 🤖 GLM AI 配置（可選，用於 AI 功能）
# GLM_API_KEYS=your_key1,your_key2,your_key3
# GLM_API_KEY=your_key1
# GLM_MODEL=glm-4-flash

# 📱 LINE Bot 配置（可選，用於 LINE Bot 功能）
# LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
# LINE_CHANNEL_SECRET=your_channel_secret

# 🎤 Azure TTS 配置（可選，用於語音功能）
# AZURE_TTS_KEY=your_azure_tts_key
# AZURE_TTS_REGION=eastasia
# AZURE_TTS_VOICE=zh-TW, JennyNeural

# 🎙️ Deepgram 配置（可選，用於語音識別）
# DEEPGRAM_API_KEY=your_deepgram_api_key
# DEEPGRAM_MODEL=base
```

**⚠️ 重要**：
- 將 `[YOUR_PASSWORD]` 替換為您的 Supabase 數據庫密碼
- 不要將 `.env.local` 提交到 Git（已在 `.gitignore` 中）

---

### 步驟 5：更新 Prisma Schema（如果需要）

如果 Prisma Schema 需要更新以匹配 Supabase：

```bash
# 生成 Prisma Client
npm run db:generate

# 推送 Schema 到 Supabase（如果需要）
npm run db:push
```

---

### 步驟 6：測試本地連接

```bash
# 啟動開發服務器
npm run dev

# 訪問應用
# http://localhost:9999

# 測試功能：
# 1. 登入功能
# 2. 數據查詢（客戶列表、產品列表等）
# 3. API 端點
```

---

### 步驟 7：準備 Vercel 部署

#### 7.1 更新 vercel.json

已自動生成 `vercel.migration.json`，可以參考或直接使用。

#### 7.2 配置 Vercel 環境變量

在 Vercel Dashboard → 項目 → Settings → Environment Variables 中添加：

```
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres
JWT_SECRET=9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY=
```

#### 7.3 部署到 Vercel

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入 Vercel
vercel login

# 部署
vercel --prod
```

---

## 📊 數據完整性檢查

### 當前數據狀態

| 表名稱 | 當前記錄數 | 預期記錄數 | 狀態 |
|--------|-----------|-----------|------|
| User | 4 | 4+ | ✅ |
| ProductCategory | 4 | 4+ | ✅ |
| Product | 21 | 18+ | ✅ |
| Inventory | 21 | 19+ | ✅ |
| CustomerGroup | 5 | 4+ | ✅ |
| LineGroup | 3 | 2+ | ✅ |
| LineMessage | 2 | 2+ | ✅ |
| Customer | 0 | 0+ | ⚠️ 待導入 |
| GasOrder | 0 | 0+ | ⚠️ 待導入 |
| GasOrderItem | 0 | 0+ | ⚠️ 待導入 |
| 其他表 | 0 | 0+ | ⚠️ 待導入 |

**總計**：已導入 **60 條核心記錄**，還有更多業務數據待導入。

---

## 🔑 需要的憑證清單

### ✅ 已提供的憑證

- **Supabase Publishable Key**: `sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ`
- **Supabase Secret Key**: `sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2`
- **Supabase Legacy Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### ⚠️ 還需要的憑證

1. **Supabase 數據庫密碼**
   - 獲取方式：Supabase Dashboard → Settings → Database → Database password
   - 用於：`DATABASE_URL` 和 `DIRECT_URL`

2. **GLM API Keys**（可選，用於 AI 功能）
   - 獲取方式：https://open.bigmodel.cn/usercenter/apikeys
   - 用於：AI 對話、智能助手

3. **LINE Bot 憑證**（可選，用於 LINE Bot 功能）
   - 獲取方式：https://developers.line.biz/
   - 用於：LINE Bot 對話、群組管理

4. **Azure TTS Key**（可選，用於語音功能）
   - 獲取方式：https://portal.azure.com/
   - 用於：文字轉語音

5. **Deepgram API Key**（可選，用於語音識別）
   - 獲取方式：https://console.deepgram.com/
   - 用於：語音轉文字

---

## 🛠️ 自動化腳本使用

### 完整遷移腳本

```powershell
# 設置憑證
$env:SUPABASE_ANON_KEY = "sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ"
$env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2"

# 運行完整遷移
.\scripts\complete-migration.ps1 -GenerateVercelConfig
```

### 僅檢查憑證

```powershell
.\scripts\auto-migrate-to-supabase.ps1
```

---

## ✅ 遷移完成檢查清單

完成所有步驟後，請逐一確認：

- [ ] SQL 文件已成功在 Supabase SQL Editor 中執行
- [ ] 沒有錯誤消息
- [ ] 所有表都有數據（至少 0 條記錄）
- [ ] 環境變量已配置（`.env.local`）
- [ ] 本地測試通過（`npm run dev`）
- [ ] Vercel 環境變量已配置
- [ ] Vercel 部署成功
- [ ] 生產環境功能正常

---

## 📝 文件位置

```
項目根目錄/
├── scripts/
│   ├── auto-migrate-to-supabase.js      # Node.js 自動化腳本
│   ├── auto-migrate-to-supabase.ps1     # PowerShell 自動化腳本
│   └── complete-migration.ps1           # 完整遷移腳本
├── backups/migration/
│   ├── gas-management-20251229-222610.sql  # 原始導出文件
│   ├── CREDENTIALS_CHECKLIST.md            # 憑證檢查清單
│   ├── SUPABASE_DATA_IMPORT_GUIDE.md       # 數據導入指南
│   └── AUTO_MIGRATION_GUIDE.md             # 自動化遷移指南（本文件）
└── .env.local.template                     # 環境變量模板
```

---

## 🆘 遇到問題？

### 問題 1：SQL 導入失敗

**解決方案**：
1. 檢查 SQL 文件編碼（必須是 UTF-8）
2. 檢查 Supabase 連接是否正常
3. 嘗試分段導入（先導入表結構，再導入數據）

### 問題 2：環境變量未生效

**解決方案**：
1. 確保 `.env.local` 文件在項目根目錄
2. 重啟開發服務器（`npm run dev`）
3. 檢查環境變量名稱是否正確

### 問題 3：Vercel 部署失敗

**解決方案**：
1. 檢查構建日誌
2. 確認所有環境變量已配置
3. 檢查 `vercel.json` 配置是否正確

---

## 🎉 完成！

完成所有步驟後，您的系統將：
- ✅ 在 Supabase 雲端運行
- ✅ 100% 免費
- ✅ 更穩定、更快速
- ✅ 自動擴展、自動備份
- ✅ 零維護成本

**享受雲端部署的便利吧！** 🚀

---

Made with ❤️ by BossJy-99 Team
