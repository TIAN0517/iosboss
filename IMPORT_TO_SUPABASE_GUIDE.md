# 導入數據到 Supabase 指南

## ❌ 問題診斷

您遇到的錯誤：
```
The term 'postgresql://...' is not recognized as a name of a cmdlet
```

**原因：** PostgreSQL 客戶端（`psql`）未安裝或不在 PATH 中

---

## 🔧 解決方案

### 方法 1：使用 Supabase Web UI 導入（最簡單）⭐ 推薦

這是最簡單的方法，無需安裝任何工具！

#### 步驟：

1. **訪問 Supabase SQL Editor**
   - 在 Supabase Dashboard 點擊 "SQL Editor"（左側菜單）

2. **複製 SQL 文件內容**
   - 打開文件：`.\backups\migration\gas-management-20251229-212901.sql`
   - 按 `Ctrl+A` 全選
   - 按 `Ctrl+C` 複製

3. **粘貼到 SQL Editor**
   - 在 SQL Editor 中粘貼
   - 點擊 "Run" 或按 `Ctrl+Enter`

4. **等待導入完成**
   - 看到 "Success" 消息即表示完成
   - 通常需要 1-2 分鐘

5. **驗證數據**
   - 點擊 "Table Editor"（左側菜單）
   - 查看所有表是否有數據

**優勢：**
- ✅ 無需安裝任何工具
- ✅ 無需命令行操作
- ✅ 有進度顯示
- ✅ 錯誤提示清晰
- ✅ 可以逐步導入（如果文件很大）

---

### 方法 2：安裝 PostgreSQL 客戶端並使用命令行

如果您想使用命令行，需要先安裝 PostgreSQL。

#### Windows 安裝：

```powershell
# 方法 1：使用 Chocolatey（推薦）
choco install postgresql

# 方法 2：下載安裝
# 1. 訪問：https://www.postgresql.org/download/windows/
# 2. 下載 PostgreSQL 安裝程序
# 3. 運行安裝程序
# 4. 添加到 PATH

# 方法 3：使用 Docker
# 如果您有 Docker，可以在 Docker 容器中使用 psql
docker run --rm -it postgres:16-alpine psql [參數]
```

#### 獲取 Supabase 連接 URL：

1. 訪問 Supabase Dashboard
2. 點擊 "Settings" → "Database"
3. 找到 "Connection string" 區塊
4. 選擇 "URI" 格式
5. 複製連接 URL（格式如下）：

```
postgresql://postgres.[PROJECT-REF].[PASSWORD]@aws-0-[REGION-1].rds.amazonaws.com:5432/postgres
```

例如：
```
postgresql://postgres.xxxx.abcd.supabase.co:5432/postgres
```

#### 使用 psql 導入：

```powershell
# 設置環境變量
$env:SUPABASE_URL = "postgresql://postgres.[PASSWORD]@db.xxx.supabase.co:5432/postgres"

# 導入數據
psql $env:SUPABASE_URL < .\backups\migration\gas-management-20251229-212901.sql

# 或者直接使用
psql "postgresql://postgres.[PASSWORD]@db.xxx.supabase.co:5432/postgres" < .\backups\migration\gas-management-20251229-212901.sql
```

---

### 方法 3：使用 DBeaver 或 pgAdmin（圖形化工具）

如果您喜歡圖形化工具，可以使用：

1. **DBeaver**（跨平台）
   - 下載：https://dbeaver.io/download/
   - 免費開源
   - 支持連接到 Supabase

2. **pgAdmin 4**（跨平台）
   - 下載：https://www.pgadmin.org/download/
   - 網頁界面管理數據庫

---

## 🔑 獲取 Supabase 連接詳細步驟

### 1. 創建 Supabase 項目

1. 訪問：https://supabase.com
2. 用 GitHub 登入
3. 點擊 "New Project"

### 2. 填寫項目信息

```
Name: 九九瓦斯行管理系統
Database Password: [設置強密碼，記住它！]
Region: Southeast Asia (Singapore) 或 Northeast Asia (Tokyo)
Pricing plan: Free
```

### 3. 獲取連接 URL

創建項目後：

1. 在 Supabase Dashboard 點擊 "SQL Editor"
2. 點擊右上角 "Quick start" 或 "Connect"
3. 選擇 "URI" 格式
4. 複製完整的連接 URL

**格式範例：**
```
Connection type: Session pooler
Connection string:
postgresql://postgres.project-ref.password@aws-0-ap-southeast-1.rds.amazonaws.com:5432/postgres
```

**注意：**
- 連接 URL 中包含：數據庫名、密碼、主機、端口
- `postgres.` 後面的部分是數據庫名
- `@` 後面的部分是 Supabase 主機
- `.co:5432/postgres` 是端口和數據庫名

---

## ✅ 導入成功後的驗證

導入成功後，在 Supabase Dashboard 檢查：

### 1. 查看 SQL Editor

- 確認 "Success" 消息
- 檢查是否有錯誤提示

### 2. 查看 Table Editor

- 點擊 "Table Editor"（左側）
- 查看所有表：User, Customer, Order, Product 等
- 點擊表名查看數據

### 3. 查看記錄數量

您應該看到：
- User 表：有管理員數據
- Customer 表：有客戶數據
- Order 表：有訂單數據
- Product 表：有產品數據

---

## 🔐 常見錯誤和解決方案

### 錯誤 1：psql command not found

**原因：** PostgreSQL 客戶端未安裝

**解決方案：**
- 使用方法 1（Supabase Web UI）- 推薦
- 或安裝 PostgreSQL 客戶端

### 錯誤 2：connection refused

**原因：** 錯誤的連接 URL 或密碼

**解決方案：**
- 重新在 Supabase Dashboard 複製連接 URL
- 檢查密碼是否正確
- 確認數據庫是否已啟動

### 錯誤 3：database "postgres" does not exist

**原因：** 連接 URL 中的數據庫名稱錯誤

**解決方案：**
- 確認數據庫名稱為 `postgres`
- 或使用 Supabase 提供的完整連接 URL

### 錯誤 4：password authentication failed

**原因：** 密碼錯誤

**解決方案：**
- 重置 Supabase 項目密碼
- 重新獲取連接 URL

---

## 🎯 推薦流程

**最簡單的方法（無需安裝工具）：**

1. ✅ 使用 Supabase SQL Editor Web UI
2. ✅ 打開 SQL 文件並複製內容
3. ✅ 粘貼到 SQL Editor
4. ✅ 點擊 "Run"
5. ✅ 等待完成

**這樣做：**
- ❌ 不需要安裝 PostgreSQL
- ❌ 不需要配置 PATH
- ❌ 不需要命令行操作
- ✅ 有清晰的錯誤提示
- ✅ 可以看到進度
- ✅ 可以隨時取消

---

## 📞 需要幫助嗎？

如果在使用 Web UI 時遇到問題：

1. **文件太大（152.43 KB）**
   - Supabase Web UI 可能有限制
   - 嘗試使用 pgAdmin 或 DBeaver
   - 或分割 SQL 文件後分批導入

2. **導入錯誤**
   - 查看 SQL Editor 的錯誤提示
   - 檢查 SQL 語法是否有問題
   - 嘗試修復後重新導入

3. **字符編碼問題**
   - 確保使用 UTF-8 編碼
   - Supabase Web UI 支持多種編碼

---

## 💡 重要提示

### 🔒 安全建議

- 不要在代碼或 GitHub 中硬編密碼
- 使用環境變量存儲敏感信息
- 導入成功後，不要分享連接 URL

### 📝 導入完成後

- 驗證所有數據是否正確
- 測試應用是否能連接到 Supabase
- 備份 Supabase 數據（定期）

---

## 🚀 現在開始導入吧！

### 推薦方法：Supabase SQL Editor（最簡單）

**步驟：**
1. 打開文件：`.\backups\migration\gas-management-20251229-212901.sql`
2. 全選並複製（`Ctrl+A`, `Ctrl+C`）
3. 訪問：https://supabase.com/dashboard/project/[PROJECT-REF]/sql
4. 點擊 "SQL Editor"
5. 粘貼並點擊 "Run"
6. 等待完成（1-2 分鐘）

**成功後，繼續按照遷移指南的第 4 步：部署到 Vercel** 🎉

---

Made with ❤️ by BossJy-99 Team
