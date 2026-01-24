# 九九瓦斯行管理系統 - Supabase 配置指南

## ✅ 配置完成

您已成功添加 Supabase API 密鑰到環境變量中：

```
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbWx0a3NicGR5bmRvaXNucWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTM0NDYsImV4cCI6MjA4MjU4OTQ0Nn0.7xtopwRK9-Bq04hb4Ntftz5EaSQiyNtX4Yd6m_LizM1Ssff4GYhKEFAjjKWM2yGXW0u'
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=****（服務角色金鑰）
```

---

## 🔧 配置說明

### 1. Supabase 專案資訊
```
專案 ID：mdmltksbpdyndoisnqhy
專案 URL：https://mdmltksbpdyndoisnqhy.supabase.co
數據庫：PostgreSQL 15.1.13
區域：Southeast Asia (Singapore)
```

### 2. 環境變量說明

#### NEXT_PUBLIC_SUPABASE_URL
- **用途**：Supabase 專案 URL
- **安全性**：可公開（前端使用）
- **使用方式**：
  ```typescript
  import { createClient } from '@supabase/supabase-js'
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  ```

#### NEXT_PUBLIC_SUPABASE_ANON_KEY
- **用途**：匿名訪問金鑰
- **安全性**：可公開（前端使用）
- **限制**：
  - 僅可讀取公開表的數據
  - 需要配置 Row Level Security (RLS) 策略
  - 適合讀取、插入、更新、刪除
- **使用方式**：
  ```typescript
  // 查詢示例
  const { data, error } = await supabase
    .from('User')
    .select('*')
  
  // 插入示例
  const { error: insertError } = await supabase
    .from('User')
    .insert({
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'hashedpassword'
    })
  ```

#### NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
- **用途**：服務角色金鑰（管理員級）
- **安全性**：⚠️ **高度敏感**
- **權限**：
  - 繞過 Row Level Security (RLS)
  - 可執行管理員操作（CRUD）
  - 可管理 RLS 策略
  - 可執行 SQL 查詢
- **使用場景**：
  ```typescript
  // 建立 Supabase 客戶端（使用 Service Role Key）
  import { createClient } from '@supabase/supabase-js'
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: true,
        storageKey: 'supabase-auth-token'
      }
    }
  )
  
  // 示例：執行管理員操作
  const { data, error } = await supabase
    .from('User')
    .update({ role: 'admin' })
    .eq('id', 'user-123')
  ```
- **注意事項**：
  - ❌ 不要在前端代碼中使用此密鑰
  - ❌ 不要將此密鑰提交到 Git
  - ✅ 應該在後端 API 中使用
  - ✅ 應該通過環境變量注入到後端

---

## 📋 數據庫連接測試

### 方法一：瀏覽器控制台
1. 打開瀏覽器控制台
2. 訪問 Supabase Dashboard：
   ```
   https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/sql
   ```
3. 點擊左側「SQL Editor」
4. 執行測試查詢：
   ```sql
   -- 測試查詢 User 表
   SELECT * FROM "User" LIMIT 5;
   ```
5. 查看結果
6. 確認沒有錯誤消息

### 方法二：使用 TypeScript 代碼
創建測試腳本 `test-supabase.js`：

```javascript
import { createClient } from '@supabase/supabase-js'

// 使用環境變量
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testConnection() {
  console.log('🔍 測試 Supabase 連接...')
  
  // 測試查詢 User 表
  const { data: users, error: userError } = await supabase
    .from('User')
    .select('*')
    .limit(5)
  
  if (userError) {
    console.error('❌ User 查詢失敗：', userError)
    return
  }
  
  console.log('✅ 連接成功！')
  console.log('📊 User 表記錄數：', users.length)
  console.log('👤 用戶列表：')
  users.forEach(user => {
    console.log(`  - ${user.name} (${user.role})`)
  })
  
  // 測試查詢 Product 表
  const { data: products, error: productError } = await supabase
    .from('Product')
    .select('*')
    .limit(5)
  
  if (productError) {
    console.error('❌ Product 查詢失敗：', productError)
    return
  }
  
  console.log('✅ Product 查詢成功！')
  console.log('📊 Product 表記錄數：', products.length)
  console.log('👤 產品列表：')
  products.forEach(product => {
    console.log(`  - ${product.name} (${product.code})`)
  })
  
  // 測試查詢 Inventory 表
  const { data: inventory, error: inventoryError } = await supabase
    .from('Inventory')
    .select('*')
    .limit(10)
  
  if (inventoryError) {
    console.error('❌ Inventory 查詢失敗：', inventoryError)
    return
  }
  
  console.log('✅ Inventory 查詢成功！')
  console.log('📊 Inventory 表記錄數：', inventory.length)
  console.log('📦 庫存狀態：')
  inventory.forEach(item => {
    console.log(`  - 產品: ${item.productid}, 庫存: ${item.quantity}`)
  })
  
  console.log('🎉 所有測試完成！')
}

testConnection().catch(error => {
  console.error('❌ 測試失敗：', error)
})

// 執行測試
// node test-supabase.js
```

---

## 🔐 安全性配置

### Row Level Security (RLS) 策略

為了確保數據安全，需要在 Supabase 中為每個表配置 RLS 策略：

#### 1. User 表（用戶表）
```sql
-- 啟用策略：僅允許用戶查看自己的資料
CREATE POLICY "users_select_own" ON "User"
FOR SELECT
USING (auth.uid())
TO public
WITH CHECK (auth.uid() = id);

-- 啟用策略：僅允許管理員更新用戶角色
CREATE POLICY "users_update_admin" ON "User"
FOR UPDATE
USING (auth.jwt())
TO public
WITH CHECK (auth.jwt()->>'role' = 'admin');

-- 啟用策略：僅允許管理員刪除用戶
CREATE POLICY "users_delete_admin" ON "User"
FOR DELETE
USING (auth.jwt())
TO public
WITH CHECK (auth.jwt()->>'role' = 'admin');
```

#### 2. Customer 表（客戶表）
```sql
-- 啟用策略：允許所有認證用戶查看客戶資料
CREATE POLICY "customers_read_all" ON "Customer"
FOR SELECT
USING (auth.uid())
TO public
WITH CHECK (true);

-- 啟用策略：僅允許管理員修改客戶資料
CREATE POLICY "customers_update_admin" ON "Customer"
FOR UPDATE
USING (auth.jwt())
TO public
WITH CHECK (auth.jwt()->>'role' = 'admin');
```

#### 3. GasOrder 表（訂單表）
```sql
-- 啟用策略：允許所有認證用戶查看訂單資料
CREATE POLICY "orders_read_all" ON "GasOrder"
FOR SELECT
USING (auth.uid())
TO public
WITH CHECK (true);

-- 啟用策略：僅允許管理員更新訂單狀態
CREATE POLICY "orders_update_admin" ON "GasOrder"
FOR UPDATE
USING (auth.jwt())
TO public
WITH CHECK (auth.jwt()->>'role' = 'admin');
```

#### 4. Product 表（產品表）
```sql
-- 啟用策略：允許所有認證用戶查看產品資料
CREATE POLICY "products_read_all" ON "Product"
FOR SELECT
USING (auth.uid())
TO public
WITH CHECK (true);

-- 啟用策略：僅允許管理員修改產品資料
CREATE POLICY "products_update_admin" ON "Product"
FOR UPDATE
USING (auth.jwt())
TO public
WITH CHECK (auth.jwt()->>'role' = 'admin');
```

#### 5. Inventory 表（庫存表）
```sql
-- 啟用策略：允許所有認證用戶查看庫存資料
CREATE POLICY "inventory_read_all" ON "Inventory"
FOR SELECT
USING (auth.uid())
TO public
WITH CHECK (true);

-- 啟用策略：僅允許管理員更新庫存資料
CREATE POLICY "inventory_update_admin" ON "Inventory"
FOR UPDATE
USING (auth.jwt())
TO public
WITH CHECK (auth.jwt()->>'role' = 'admin');
```

---

## 📝 使用說明

### 前端使用（Next.js）

使用 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 和 `NEXT_PUBLIC_SUPABASE_URL`：

```typescript
// app/page.tsx 或組件中
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// 查詢客戶列表
export default async function CustomerList() {
  const { data: customers } = await supabase
    .from('Customer')
    .select('*')
    .order('createdAt', { ascending: false })  
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">客戶列表</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map(customer => (
          <div key={customer.id} className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg">{customer.name}</h3>
            <p className="text-gray-600">{customer.phone}</p>
            <p className="text-gray-600">{customer.address}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 後端 API 使用

後端應使用 `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` 進行管理員操作：

```typescript
// API 路由中
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

// 建立新用戶
export async function POST(req: Request) {
  const { username, email, password, role } = await req.json()  
  
  const { data, error } = await supabase
    .from('User')
    .insert({
      username,
      email,
      password, // 實際應該是加密後的密碼
      role: role || 'staff'
    })
  
  if (error) {
    return new Response(
      JSON.stringify({ error: '創建用戶失敗' }),
      { status: 500 }
    )
  }
  
  return new Response(
    JSON.stringify({ 
      message: '用戶創建成功',
      user: { id: data[0].id, ...data[0] }
    }),
    { status: 201 }
  )
}

// 查詢庫存
export async function GET(req: Request) {
  const { data: inventory } = await supabase
    .from('Inventory')
    .select(`
      *,
      Product (
        name,
        price
      )
    `)
    .order('quantity', { ascending: false })  
  
  if (inventory.length === 0) {
    return new Response(
      JSON.stringify({ error: '查詢失敗' }),
      { status: 500 }
    )
  }
  
  return new Response(
    JSON.stringify({ inventory }),
    { status: 200 }
  )
}
```

---

## 🚨 重要注意事項

### 1. 環境變量配置
- ✅ 已在環境變量中配置 Supabase 連接資訊
- ✅ 已配置 Anon Key（前端使用）
- ✅ 已配置 Service Role Key（後端使用）
- ⚠️ 請勿修改現有的 AI、Azure、LINE 等配置
- ⚠️ Service Role Key 僅限於後端 API 使用

### 2. 數據庫遷移狀態
- ✅ 數據表結構已創建（32 個表）
- ✅ 索引已創建（85 個索引）
- ✅ 外鍵約束已創建（25 個約束）
- 📊 已導入數據：
  - ProductCategory：4 條記錄
  - User：4 條記錄
  - Inventory：19 條記錄
  - CustomerGroup：4 條記錄
  - LineGroup：2 條記錄
  - LineMessage：2 條記錄

### 3. 安全性建議
- 🔐 確保在 Supabase Dashboard 中配置適當的 RLS 策略
- 🔐 不要在前端暴露 Service Role Key
- 🔐 使用加密後的密碼存儲用戶密碼
- 🔐 定期更換數據庫密碼和 API 密鑰
- 🔐 監控數據庫訪問日誌

### 4. 下一步操作
1. ✅ 在專案中安裝 Supabase 客戶端庫：
   ```bash
   npm install @supabase/supabase-js
   ```
2. ✅ 配置 RLS 策略（參見上文）
3. ✅ 測試數據庫連接
4. ✅ 開始開發或更新前端組件以使用 Supabase
5. ✅ 開始開發或更新後端 API 以使用 Supabase

---

## 📞 技術支援

如遇到問題，請參考：
- Supabase 文檔：https://supabase.com/docs
- Supabase 客戶端庫：https://supabase.com/docs/reference/javascript
- Supabase 客戶端庫：https://supabase.com/docs/reference/auth

---

**配置完成日期**：2025-12-29
**配置狀態**：✅ 就緒
