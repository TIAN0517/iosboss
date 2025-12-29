# Supabase RLS 策略配置指南

## ⚠️ 重要說明

由於 Supabase 的 RLS 策略語法限制，建議**在 Supabase Dashboard 的 SQL Editor 中手動執行**完整的 RLS 配置。

## 📋 執行步驟

### 方法一：使用 Supabase Dashboard（推薦）⭐

1. **訪問 SQL Editor**
   ```
   https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/sql
   ```

2. **打開完整配置文件**
   - 文件：`backups/migration/supabase-complete-setup.sql`
   - 複製全部內容
   - 粘貼到 SQL Editor
   - 點擊「Run」執行

3. **處理錯誤**
   - 如果出現語法錯誤，請逐個執行策略
   - 參考下面的簡化版本

### 方法二：使用簡化策略（如果完整版本失敗）

在 Supabase Dashboard 中，為每個表手動創建策略：

#### User 表策略

```sql
-- 啟用 RLS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- 允許所有用戶查看（簡化版）
CREATE POLICY "users_select_all" ON "User"
FOR SELECT
USING (true);
```

#### Customer 表策略

```sql
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_all" ON "Customer"
FOR ALL
USING (true);
```

#### Product 表策略

```sql
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_all" ON "Product"
FOR ALL
USING (true);
```

#### Inventory 表策略

```sql
ALTER TABLE "Inventory" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_all" ON "Inventory"
FOR ALL
USING (true);
```

#### GasOrder 表策略

```sql
ALTER TABLE "GasOrder" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_all" ON "GasOrder"
FOR ALL
USING (true);
```

## ✅ 配置完成檢查

執行以下查詢驗證 RLS 是否已啟用：

```sql
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('User', 'Customer', 'Product', 'Inventory', 'GasOrder')
ORDER BY tablename;
```

所有表的 `rowsecurity` 應該為 `true`。
