# 如何驗證 Supabase 配置

## 🎯 驗證方法總覽

有三種方式可以驗證 Supabase 配置是否正確：

1. **使用自動化驗證腳本**（推薦）⭐
2. **在 Supabase Dashboard 中驗證**
3. **在應用程序中測試連接**

---

## 方法一：使用自動化驗證腳本（最簡單）⭐

### 📍 驗證位置

**文件位置**：`scripts/verify-supabase-config.js`

### 🚀 執行步驟

1. **打開終端/命令行**
   - Windows: PowerShell 或 CMD
   - Mac/Linux: Terminal

2. **進入項目目錄**
   ```bash
   cd "C:\Users\tian7\OneDrive\Desktop\媽媽ios"
   ```

3. **安裝依賴（如果還沒有）**
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

4. **執行驗證腳本**
   ```bash
   node scripts/verify-supabase-config.js
   ```

### ✅ 預期輸出

如果配置正確，您應該看到：

```
🚀 九九瓦斯行管理系統 - Supabase 配置驗證
============================================================

📋 驗證環境變量配置...
  ✅ NEXT_PUBLIC_SUPABASE_URL: 已設置 (https://mdmltksbpdyndoisnqhy...)
  ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: 已設置 (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)
  ✅ NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: 已設置 (sb_secret_...)

🔌 測試 Supabase 連接...
  ✅ User 表連接成功 (4 條記錄)
  ✅ Product 表連接成功 (21 條記錄)
  ✅ Inventory 表連接成功 (21 條記錄)

🔐 驗證 RLS 策略...
  ✅ User 表 RLS 配置正常
  ✅ Customer 表 RLS 配置正常
  ✅ Product 表 RLS 配置正常
  ✅ Inventory 表 RLS 配置正常
  ✅ GasOrder 表 RLS 配置正常

📊 檢查數據完整性...
  ✅ User: 4 條記錄 (預期: 4)
  ✅ ProductCategory: 4 條記錄 (預期: 4)
  ✅ Product: 21 條記錄 (預期: 21)
  ✅ Inventory: 21 條記錄 (預期: 21)
  ✅ CustomerGroup: 5 條記錄 (預期: 5)
  ✅ LineGroup: 3 條記錄 (預期: 3)
  ✅ LineMessage: 2 條記錄 (預期: 2)

============================================================
📊 驗證結果摘要
============================================================

✅ 環境變量: 3/3 通過 (100%)
✅ 數據庫連接: 3/3 通過 (100%)
✅ RLS 策略: 5/5 通過 (100%)
✅ 數據完整性: 7/7 通過 (100%)

============================================================
總體結果: 18/18 通過 (100%)
============================================================

🎉 所有配置驗證通過！
```

### ❌ 如果出現錯誤

**錯誤 1：缺少環境變量**
```
❌ NEXT_PUBLIC_SUPABASE_URL: 未設置
```

**解決方法**：
- 檢查 `.env` 文件是否存在
- 確認環境變量名稱正確
- 確認值不為空

**錯誤 2：連接失敗**
```
❌ User 表查詢失敗: relation "User" does not exist
```

**解決方法**：
- 確認表名正確（注意大小寫）
- 確認 Supabase 專案 ID 正確
- 檢查網絡連接

**錯誤 3：RLS 策略錯誤**
```
❌ User 表 RLS 可能有問題: permission denied
```

**解決方法**：
- 執行 `backups/migration/rls-policies-simple.sql`
- 檢查策略是否正確創建

---

## 方法二：在 Supabase Dashboard 中驗證

### 📍 驗證位置

**Supabase Dashboard**：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy

### 🔍 驗證步驟

#### 1. 驗證數據庫連接

**位置**：Database → Tables

**檢查項目**：
- ✅ 所有表都存在（32 個表）
- ✅ 表中有數據（User、Product 等表有記錄）

**操作**：
1. 訪問：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/editor
2. 點擊左側「Tables」
3. 檢查表列表，確認所有表都存在
4. 點擊「User」表，查看是否有 4 條記錄
5. 點擊「Product」表，查看是否有 21 條記錄

#### 2. 驗證 RLS 策略

**位置**：Database → Tables → 選擇表 → Policies

**檢查項目**：
- ✅ 所有主要表都啟用了 RLS
- ✅ 策略已創建

**操作**：
1. 訪問：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/editor
2. 選擇「User」表
3. 點擊「Policies」標籤
4. 確認有策略存在（如 `users_select_all`）
5. 重複檢查其他主要表（Customer、Product、Inventory 等）

#### 3. 驗證 API 密鑰

**位置**：Settings → API

**檢查項目**：
- ✅ Anon Key 存在
- ✅ Service Role Key 存在

**操作**：
1. 訪問：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/settings/api
2. 確認「Project API keys」區域有密鑰
3. 確認「Secret keys」區域有 Service Role Key

#### 4. 驗證攻擊防護

**位置**：Authentication → Configuration → Attack Protection

**檢查項目**：
- ✅ 「防止使用外洩的密碼」已開啟

**操作**：
1. 訪問：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/auth/protection
2. 確認「防止使用外洩的密碼」開關為「開啟」狀態

#### 5. 使用 SQL Editor 測試查詢

**位置**：SQL Editor

**操作**：
1. 訪問：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/sql
2. 執行以下測試查詢：

```sql
-- 測試 1：查詢 User 表
SELECT * FROM "User" LIMIT 5;

-- 測試 2：查詢 Product 表
SELECT * FROM "Product" LIMIT 5;

-- 測試 3：檢查 RLS 狀態
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('User', 'Customer', 'Product', 'Inventory', 'GasOrder')
ORDER BY tablename;

-- 測試 4：檢查策略
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('User', 'Customer', 'Product', 'Inventory', 'GasOrder')
ORDER BY tablename, policyname;
```

**預期結果**：
- 查詢 1 和 2 應該返回數據
- 查詢 3 應該顯示所有表的 `rls_enabled` 為 `true`
- 查詢 4 應該顯示已創建的策略

---

## 方法三：在應用程序中測試連接

### 📍 驗證位置

**在您的 Next.js 應用程序中**

### 🔧 創建測試頁面

**文件位置**：`app/test-supabase/page.tsx`（或 `pages/test-supabase.tsx`）

**代碼**：

```typescript
'use client'

import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

export default function TestSupabase() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testConnection() {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const testResults: any = {}

      // 測試 1：查詢 User 表
      try {
        const { data, error } = await supabase
          .from('User')
          .select('*')
          .limit(5)
        
        testResults.user = {
          success: !error,
          error: error?.message,
          count: data?.length || 0,
          data: data
        }
      } catch (err: any) {
        testResults.user = {
          success: false,
          error: err.message
        }
      }

      // 測試 2：查詢 Product 表
      try {
        const { data, error } = await supabase
          .from('Product')
          .select('*')
          .limit(5)
        
        testResults.product = {
          success: !error,
          error: error?.message,
          count: data?.length || 0,
          data: data
        }
      } catch (err: any) {
        testResults.product = {
          success: false,
          error: err.message
        }
      }

      // 測試 3：查詢 Inventory 表
      try {
        const { data, error } = await supabase
          .from('Inventory')
          .select('*')
          .limit(5)
        
        testResults.inventory = {
          success: !error,
          error: error?.message,
          count: data?.length || 0,
          data: data
        }
      } catch (err: any) {
        testResults.inventory = {
          success: false,
          error: err.message
        }
      }

      setResults(testResults)
      setLoading(false)
    }

    testConnection()
  }, [])

  if (loading) {
    return <div className="p-8">正在測試連接...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase 連接測試</h1>
      
      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="font-bold">User 表測試</h2>
          {results.user?.success ? (
            <div className="text-green-600">
              ✅ 成功！找到 {results.user.count} 條記錄
            </div>
          ) : (
            <div className="text-red-600">
              ❌ 失敗：{results.user?.error}
            </div>
          )}
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold">Product 表測試</h2>
          {results.product?.success ? (
            <div className="text-green-600">
              ✅ 成功！找到 {results.product.count} 條記錄
            </div>
          ) : (
            <div className="text-red-600">
              ❌ 失敗：{results.product?.error}
            </div>
          )}
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold">Inventory 表測試</h2>
          {results.inventory?.success ? (
            <div className="text-green-600">
              ✅ 成功！找到 {results.inventory.count} 條記錄
            </div>
          ) : (
            <div className="text-red-600">
              ❌ 失敗：{results.inventory?.error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### 🚀 訪問測試頁面

1. **啟動開發服務器**
   ```bash
   npm run dev
   ```

2. **訪問測試頁面**
   ```
   http://localhost:9999/test-supabase
   ```

3. **查看結果**
   - 如果所有測試顯示 ✅，說明配置正確
   - 如果有 ❌，查看錯誤信息並修復

---

## 📋 快速驗證檢查清單

完成以下檢查，確認配置正確：

### 環境變量 ✅
- [ ] `.env` 文件存在
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已設置
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已設置
- [ ] `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` 已設置

### 數據庫 ✅
- [ ] 所有表都存在（32 個表）
- [ ] 主要表有數據（User、Product 等）
- [ ] 可以查詢數據

### RLS 策略 ✅
- [ ] 主要表已啟用 RLS
- [ ] 策略已創建
- [ ] 可以正常訪問數據

### 攻擊防護 ✅
- [ ] 「防止使用外洩的密碼」已開啟

---

## 🎯 推薦驗證流程

1. **首先**：執行自動化驗證腳本（方法一）
   ```bash
   node scripts/verify-supabase-config.js
   ```

2. **然後**：在 Supabase Dashboard 中檢查（方法二）
   - 確認數據存在
   - 確認 RLS 策略存在

3. **最後**：在應用程序中測試（方法三）
   - 創建測試頁面
   - 驗證實際使用場景

---

## 📞 需要幫助？

如果驗證失敗，請：

1. **查看錯誤信息**：根據錯誤信息定位問題
2. **檢查配置文檔**：`COMPLETE_SETUP_SUMMARY.md`
3. **查看 Supabase 日誌**：Dashboard → Logs
4. **重新執行配置步驟**：參考 `scripts/complete-supabase-setup.md`

---

**驗證完成後，您的系統就可以正常使用了！** 🎉
