# Supabase API 金鑰更新指南

## 🔑 新的 API 金鑰信息

### 專案信息
- **專案網址**：`https://mdmltksbpdyndoisnqhy.supabase.co`
- **可發布的 API 金鑰**：`sb_publishable_EviKlKgPnLtGeaDs8SVysQ_bzavSNr9`

---

## 📋 API 金鑰類型說明

### 1. Publishable Key（可發布金鑰）⭐ 推薦使用

**您的新金鑰**：`sb_publishable_EviKlKgPnLtGeaDs8SVysQ_bzavSNr9`

**特點**：
- ✅ 可以安全地在瀏覽器中使用
- ✅ 受 Row Level Security (RLS) 保護
- ✅ 適合前端應用程序
- ✅ 可以公開使用（在 RLS 啟用的情況下）

**使用場景**：
- 前端 React/Next.js 應用
- 客戶端數據查詢
- 用戶認證
- 公開 API 調用

---

### 2. Legacy Anon Key（舊版匿名金鑰）

**舊金鑰**：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**特點**：
- ⚠️ 舊版格式（JWT 格式）
- ✅ 功能與 Publishable Key 相同
- ⚠️ Supabase 建議使用新的 Publishable Key

**建議**：逐步遷移到新的 Publishable Key

---

### 3. Service Role Key（服務角色金鑰）

**金鑰**：`sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2`

**特點**：
- ⚠️ **高度敏感**：擁有完整權限
- ⚠️ 可以繞過 RLS
- ✅ 僅限於後端服務器使用
- ❌ 不要在前端使用

**使用場景**：
- 後端 API 路由
- 管理員操作
- 服務器端數據處理

---

## 🔧 更新配置

### 在 .env 文件中更新

```env
# ========================================
# Supabase 配置（更新版）
# ========================================

# Supabase 專案 URL
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co

# Supabase Publishable Key（推薦使用，用於前端）
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_EviKlKgPnLtGeaDs8SVysQ_bzavSNr9

# Supabase Anon Key（舊版，可選，用於兼容性）
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbWx0a3NicGR5bmRvaXNucWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTM0NDYsImV4cCI6MjA4MjU4OTQ0Nn0.7-xtopwRK9-Bq04hb4Ntftz5EaSQiyNtX4Yd6m_LizM

# Supabase Service Role Key（用於後端）
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2

# Supabase JWT Secret（用於簽署和驗證 JWT）
SUPABASE_JWT_SECRET=JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==
```

---

## 💻 在代碼中使用

### 前端使用（推薦使用 Publishable Key）

```typescript
// lib/supabase-client.ts
import { createClient } from '@supabase/supabase-js'

// 優先使用 Publishable Key，如果沒有則使用 Anon Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### 後端使用（使用 Service Role Key）

```typescript
// app/api/admin/route.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!

// 使用 Service Role Key 創建管理員客戶端
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  // 這個客戶端可以繞過 RLS
  const { data, error } = await supabaseAdmin
    .from('User')
    .select('*')
  
  return Response.json({ data, error })
}
```

---

## 🔐 API 閘道保護說明

根據您提供的信息，您的 API 受 API 閘道保護，這意味著：

### 保護機制
- ✅ 每次請求都需要 API 金鑰
- ✅ 防止未授權訪問
- ✅ 提供額外的安全層

### 使用方式
1. **在請求頭中包含 API 金鑰**：
   ```typescript
   const response = await fetch('https://mdmltksbpdyndoisnqhy.supabase.co/rest/v1/User', {
     headers: {
       'apikey': 'sb_publishable_EviKlKgPnLtGeaDs8SVysQ_bzavSNr9',
       'Authorization': `Bearer sb_publishable_EviKlKgPnLtGeaDs8SVysQ_bzavSNr9`
     }
   })
   ```

2. **使用 Supabase 客戶端庫（自動處理）**：
   ```typescript
   // Supabase 客戶端庫會自動處理 API 金鑰
   const { data } = await supabase
     .from('User')
     .select('*')
   ```

---

## ✅ 配置檢查清單

完成以下配置：

- [ ] 在 `.env` 文件中添加 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] 更新前端代碼使用新的 Publishable Key
- [ ] 確認 RLS 策略已配置（保護數據安全）
- [ ] 測試 API 連接是否正常
- [ ] 驗證數據訪問權限是否正確

---

## 🧪 驗證新配置

### 方法 1：使用驗證腳本

```bash
# 驗證環境變數
node scripts/verify-env.js

# 測試連接
node scripts/test-supabase-connection.js
```

### 方法 2：在代碼中測試

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mdmltksbpdyndoisnqhy.supabase.co',
  'sb_publishable_EviKlKgPnLtGeaDs8SVysQ_bzavSNr9'
)

// 測試查詢
const { data, error } = await supabase
  .from('User')
  .select('*')
  .limit(1)

console.log('測試結果:', data, error)
```

---

## 📊 API 金鑰對比

| 特性 | Publishable Key | Legacy Anon Key | Service Role Key |
|------|----------------|-----------------|------------------|
| **格式** | `sb_publishable_...` | `eyJ...` (JWT) | `sb_secret_...` |
| **前端使用** | ✅ 推薦 | ✅ 可用 | ❌ 禁止 |
| **後端使用** | ✅ 可用 | ✅ 可用 | ✅ 推薦 |
| **RLS 保護** | ✅ 受保護 | ✅ 受保護 | ❌ 可繞過 |
| **公開使用** | ✅ 安全 | ✅ 安全 | ❌ 不安全 |
| **權限** | 受限（受 RLS 限制） | 受限（受 RLS 限制） | 完整權限 |

---

## 🎯 推薦配置方案

### 前端配置
```typescript
// 使用 Publishable Key（推薦）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)
```

### 後端配置
```typescript
// 使用 Service Role Key（管理員操作）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)
```

---

## 📝 更新步驟總結

1. **更新 .env 文件**：添加新的 Publishable Key
2. **更新代碼**：優先使用 Publishable Key
3. **測試連接**：驗證新 Key 是否正常工作
4. **逐步遷移**：從 Legacy Anon Key 遷移到 Publishable Key

---

**配置更新日期**：2025-12-29  
**新 Publishable Key**：`sb_publishable_EviKlKgPnLtGeaDs8SVysQ_bzavSNr9`
