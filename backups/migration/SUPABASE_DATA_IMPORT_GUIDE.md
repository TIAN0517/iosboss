# 九九瓦斯行管理系統 - Supabase 數據導入指南

## 📋 當前狀態

✅ **已完成**：
- Docker 數據庫已成功導出
- 導出文件位置：`backups/migration/gas-management-20251229-222610.sql`
- 文件大小：62K
- Supabase 專案已創建
- 專案 ID：`mdmltksbpdyndoisnqhy`
- 專案 URL：`https://mdmltksbpdyndoisnqhy.supabase.co`

✅ **已導入**：
- 33 個資料表結構（含索引、外鍵約束）
- ProductCategory：4 條記錄
- User：4 條記錄
- CustomerGroup：4 條記錄
- ProductCategory：4 條記錄
- Product：0 條記錄
- Inventory：0 條記錄
- LineGroup：2 條記錄
- LineMessage：2 條記錄
- LineConversation：0 條記錄

⚠️ **待導入**：
- Inventory：19 條記錄（庫存數據）
- CustomerGroup：0 條記錄（已成功導入）
- 其他表的業務數據

---

## 🚀 數據導入步驟

### 方法一：使用 Supabase SQL Editor（推薦）⭐

這是最簡單、最可靠的方法！

#### 步驟：

1. **訪問 Supabase SQL Editor**
   - 打開瀏覽器，訪問：
   ```
   https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/sql
   ```

2. **打開 SQL 文件**
   - 使用文本編輯器打開文件：
   ```
   backups/migration/gas-management-20251229-222610.sql
   ```
   - 確保文件編碼為 UTF-8

3. **複製 SQL 內容**
   - 按 `Ctrl+A` 全選
   - 按 `Ctrl+C` 複製
   - 或者使用「編輯」→「全選」→「複製」

4. **粘貼到 SQL Editor**
   - 在 Supabase SQL Editor 中粘貼
   - 點擊 "Run" 按鈕或按 `Ctrl+Enter`

5. **等待導入完成**
   - 看到 "Success" 消息即表示完成
   - 通常需要 1-2 分鐘
   - 如果遇到錯誤，查看錯誤提示並修復

6. **驗證導入結果**
   - 點擊左側 "Table Editor"
   - 查看各表的記錄數量
   - 驗證數據是否正確

---

### 方法二：使用 psql 命令行

如果您熟悉命令行，可以使用 psql 直接導入。

#### Windows PowerShell：

```powershell
# 1. 下載並安裝 PostgreSQL 客戶端
# 訪問：https://www.postgresql.org/download/windows/

# 2. 獲取 Supabase 連接 URL
# 在 Supabase Dashboard → Settings → Database → Connection string
# 格式：postgresql://postgres:[PASSWORD]@aws-0-[REGION].rds.amazonaws.com:5432/postgres

# 3. 導入數據
psql "postgresql://postgres:[PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres" < backups/migration/gas-management-20251229-222610.sql
```

#### Linux/Mac Bash：

```bash
# 1. 確保已安裝 psql
# Ubuntu/Debian: sudo apt-get install postgresql-client
# macOS: brew install postgresql

# 2. 導入數據
psql "postgresql://postgres:[PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres" < backups/migration/gas-management-20251229-222610.sql
```

---

### 方法三：使用 DBeaver 或 pgAdmin

如果您喜歡圖形化工具：

1. **下載並安裝 DBeaver**
   - 網址：https://dbeaver.io/download/
   - 免費開源，跨平台

2. **連接到 Supabase**
   - Host: `db.mdmltksbpdyndoisnqhy.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres`
   - Password: 您的數據庫密碼

3. **導入 SQL 文件**
   - 右鍵點擊數據庫
   - 選擇「執行 SQL 腳本」
   - 選擇 SQL 文件：`gas-management-20251229-222610.sql`
   - 點擊「執行」

4. **等待完成並驗證**

---

## 🔍 導入後驗證

導入完成後，請檢查以下項目：

### 1. 檢查表記錄數量

在 Supabase Dashboard → SQL Editor 中執行：

```sql
-- 檢查各表的記錄數量
SELECT 
    'User' as table_name,
    COUNT(*) as record_count
FROM "User"
UNION ALL
SELECT 
    'Customer',
    COUNT(*)
FROM "Customer"
UNION ALL
SELECT 
    'Product',
    COUNT(*)
FROM "Product"
UNION ALL
SELECT 
    'ProductCategory',
    COUNT(*)
FROM "ProductCategory"
UNION ALL
SELECT 
    'Inventory',
    COUNT(*)
FROM "Inventory"
UNION ALL
SELECT 
    'CustomerGroup',
    COUNT(*)
FROM "CustomerGroup"
UNION ALL
SELECT 
    'LineGroup',
    COUNT(*)
FROM "LineGroup"
UNION ALL
SELECT 
    'LineMessage',
    COUNT(*)
FROM "LineMessage"
UNION ALL
SELECT 
    'LineConversation',
    COUNT(*)
FROM "LineConversation"
UNION ALL
SELECT 
    'GasOrder',
    COUNT(*)
FROM "GasOrder"
UNION ALL
SELECT 
    'GasOrderItem',
    COUNT(*)
FROM "GasOrderItem";
```

### 2. 預期結果

根據原始數據庫導出，應該有以下記錄：

| 表名稱 | 預期記錄數量 |
|---------|--------------|
| User | 4 |
| ProductCategory | 4 |
| Product | 18 |
| Inventory | 19 |
| CustomerGroup | 4 |
| LineGroup | 2 |
| LineMessage | 2 |
| LineConversation | 0 |
| Customer | 0-5 (測試數據) |
| GasOrder | 0-5 (測試數據) |
| GasOrderItem | 0-10 (測試數據) |

---

## ⚠️ 常見問題

### Q1：SQL 文件太大無法粘貼？

**A：**
1. 將 SQL 文件分割成多個小文件
2. 逐個導入
3. 或使用方法二（psql 命令行）

### Q2：導入時出現字符編碼錯誤？

**A：**
1. 確保 SQL 文件使用 UTF-8 編碼
2. 使用記事本或其他文本編輯器另存為 UTF-8
3. 重新導入

### Q3：某些數據已存在導致重複鍵錯誤？

**A：**
- 這是正常的！因為我們之前已經導入了部分數據
- 使用 `ON CONFLICT (id) DO NOTHING` 跳過重複記錄
- 如果仍然失敗，可以刪除重複的記錄後重新導入

### Q4：外鍵約束錯誤？

**A：**
1. 確保依賴的表已導入數據
2. 例如：Product 依賴 ProductCategory，需要先導入 ProductCategory
3. 按照正確順序導入

---

## ✅ 導入完成檢查清單

完成導入後，請逐一確認：

- [ ] SQL 文件已成功在 SQL Editor 中執行
- [ ] 沒有錯誤消息
- [ ] User 表有 4 條記錄
- [ ] ProductCategory 表有 4 條記錄
- [ ] Product 表有 18 條記錄
- [ ] Inventory 表有 19 條記錄
- [ ] CustomerGroup 表有 4 條記錄
- [ ] LineGroup 表有 2 條記錄
- [ ] LineMessage 表有 2 條記錄
- [ ] LineConversation 表為空
- [ ] 所有索引已創建
- [ ] 所有外鍵約束已創建

---

## 📝 下一步：部署到 Vercel

數據導入完成並驗證後，按照 `MIGRATION_TO_VERCEL_SUPABASE.md` 中的第 4 步部署到 Vercel。

---

## 🎉 總結

**推薦方法：使用 Supabase SQL Editor Web UI**

這是最簡單、最可靠的方法，無需安裝任何工具！

1. ✅ 打開 SQL 文件
2. ✅ 全選並複製
3. ✅ 在 SQL Editor 中粘貼
4. ✅ 點擊 Run
5. ✅ 等待完成
6. ✅ 驗證數據

**開始導入吧！** 🚀

---

Made with ❤️ by BossJy-99 Team
