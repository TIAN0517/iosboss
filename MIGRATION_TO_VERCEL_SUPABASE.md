
# 九九瓦斯行管理系統 - Docker 到 Vercel + Supabase 遷移指南

## 📋 遷移總覽

**從：** Docker 本地部署（Docker Compose）
**到：** Vercel + Supabase 雲端部署

**費用：** $0/月（完全免費！）
**時間預計：** 30-60 分鐘
**難度：** ⭐⭐ 簡單

---

## 🎯 遷移後的優勢

| 優勢 | 說明 |
|-----|------|
| ✅ **完全免費** | Vercel + Supabase 無限額度內完全免費 |
| ✅ **更穩定** | 雲端自動擴展，99.99% 可用性 |
| ✅ **全球加速** | Vercel CDN + Supabase 全球節點 |
| ✅ **自動備份** | Supabase 自動備份，Vercel 版本控制 |
| ✅ **零維護** | 不用擔心服務器宕機、更新、監控 |
| ✅ **自動部署** | Git 推送自動部署，無需手動操作 |
| ✅ **HTTPS 自動** | 自動 SSL 證書，無需配置 |

---

## 📦 遷移前準備

### 1. 檢查當前系統狀態

```bash
# 檢查 Docker 容器是否運行
docker p

# 檢查數據庫大小
docker exec jyt-gas-postgres pg_dump -U postgres -d gas_management | wc -c
```

### 2. 確認數據庫密碼

確保您知道 PostgreSQL 密碼（默認：`Ss520520`）

### 3. 備份當前數據

```powershell
# Windows PowerShell
.\export-docker-db.ps1

# 或使用 Bash
./export-docker-db.sh
```

---

## 🚀 遷移步驟

### 第 1 步：導出 Docker 數據庫（5 分鐘）

#### Windows PowerShell：

```powershell
# 執行導出腳本
.\export-docker-db.ps1

# 輸出示例：
# ✅ 數據庫導出成功！
# 📁 文件位置: .\backups\migration\gas-management-20241229-210000.sql
# 📊 文件大小: 245.67 KB
```

#### Linux/Mac Bash：

```bash
# 執行導出腳本
./export-docker-db.sh

# 輸出示例：
# ✅ 數據庫導出成功！
# 📁 文件位置: ./backups/migration/gas-management-20241229-210000.sql
# 📊 文件大小: 245.67 KB
```

---

### 第 2 步：創建 Supabase 項目（5 分鐘）

#### 2.1 註冊 Supabase

1. 訪問：https://supabase.com
2. 點擊 "Start your project"
3. 使用 GitHub 註冊（您已有 GitHub 訂閱）

#### 2.2 創建新項目

1. 點擊 "New Project"
2. 設置項目信息：
   ```
   Name: 九九瓦斯行管理系統
   Database Password: [設置強密碼，記住它！]
   Region: Southeast Asia (Singapore)
   Pricing plan: Free
   ```
3. 點擊 "Create new project"
4. 等待 1-2 分鐘創建完成

#### 2.3 獲取數據庫連接 URL

1. 在 Supabase Dashboard 項目頁面
2. 點擊左側 "Settings" → "Database"
3. 找到 "Connection string"
4. 選擇 "URI"
5. 複製連接 URL（格式：`postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres`）
6. 保存到安全的地方

---

### 第 3 步：導入數據到 Supabase（5 分鐘）

#### Windows PowerShell：

```powershell
# 設置環境變量
$env:SUPABASE_URL = "postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"

# 導入數據
.\import-to-supabase.ps1 .\backups\migration\gas-management-20241229-210000.sql
```

#### Linux/Mac Bash：

```bash
# 設置環境變量
export SUPABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"

# 導入數據
./import-to-supabase.sh ./backups/migration/gas-management-20241229-210000.sql
```

#### 3.1 在 Supabase 運行 Prisma 遷移

1. 在 Supabase Dashboard → "SQL Editor"
2. 點擊 "New query"
3. 複製並執行以下 SQL：

```sql
-- 創建 Prisma 遷移表
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id TEXT NOT NULL,
    checksum TEXT,
    finished_at TIMESTAMP WITH TIME ZONE,
    migration_name TEXT NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    applied_steps_count INTEGER NOT NULL DEFAULT 0
);

-- 創建索引
CREATE UNIQUE INDEX IF NOT EXISTS "_prisma_migrations_id_key" ON "_prisma_migrations"("id");
```

---

### 第 4 步：部署到 Vercel（10 分鐘）

#### 4.1 註冊 Vercel

1. 訪問：https://vercel.com
2. 點擊 "Sign Up"
3. 使用 GitHub 註冊（您已有 GitHub 訂閱）

#### 4.2 導入項目

1. 點擊 "Add New Project"
2. 選擇您的 GitHub 倉庫：`媽媽ios`
3. 點擊 "Import"

#### 4.3 配置項目設置

**Framework Preset:** Next.js

**Build & Development Settings:**
```
Build Command: npm run build
Output Directory: .next
Install Command: npm install --legacy-peer-deps
```

**Environment Variables:**

點擊 "Environment Variables" → 添加以下變量：

```
# 必填
DATABASE_URL=[從 Supabase 複製的連接 URL]
DIRECT_URL=[從 Supabase 複製的連接 URL]
JWT_SECRET=9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY=

# 選填（如果您有這些服務的 API Key）
LINE_CHANNEL_ACCESS_TOKEN=[您的 LINE Token]
LINE_CHANNEL_SECRET=[您的 LINE Secret]
GLM_API_KEYS=[您的 GLM Keys]
```

**Region:** Hong Kong (hkg1) - 離台灣最近的節點

#### 4.4 開始部署

1. 點擊 "Deploy"
2. 等待 2-3 分鐘構建完成
3. 部署成功後，Vercel 會提供一個隨機 URL，例如：
   ```
   https://your-project.vercel.app
   ```

---

### 第 5 步：配置自定義域名（5 分鐘，可選）

#### 5.1 購買域名（如果沒有）

- Namesilo：約 $8/年
- GoDaddy：約 $12/年
- Cloudflare：約 $10/年

#### 5.2 添加域名到 Vercel

1. 在 Vercel Dashboard → 項目 → "Settings" → "Domains"
2. 點擊 "Add Domain"
3. 輸入域名，例如：`bossai.jy-tian.com`
4. 點擊 "Add"

#### 5.3 配置 DNS

Vercel 會提供 DNS 記錄：
```
Type: CNAME
Name: bossai
Value: cname.vercel-dns.com
```

在您的域名提供商添加此 DNS 記錄。

---

### 第 6 步：驗證部署（5 分鐘）

#### 6.1 檢查健康端點

```bash
# 測試 API 健康檢查
curl https://your-project.vercel.app/api/health

# 預期返回：
# {
#   "status": "ok",
#   "timestamp": "2024-12-29T13:00:00.000Z",
#   "database": "connected"
# }
```

#### 6.2 測試前端頁面

訪問：https://your-project.vercel.app

檢查：
- ✅ 首頁正常加載
- ✅ 登入頁面正常
- ✅ 客戶列表顯示正常
- ✅ 訂單管理正常

#### 6.3 測試 API

```bash
# 測試登入 API
curl -X POST https://your-project.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Ss520520"}'
```

---

## 🔄 回滾方案

如果部署後發現問題，可以快速回滾到 Docker：

### 1. 重新啟動 Docker

```bash
docker-compose up -d
```

### 2. 在 Vercel 回滾

1. Vercel Dashboard → 項目 → "Deployments"
2. 找到之前的部署記錄
3. 點擊右上角 "..."
4. 選擇 "Redeploy"

---

## 📊 遷移後對比

| 項目 | Docker | Vercel + Supabase |
|-----|--------|-----------------|
| **部署方式** | 本地服務器 | 雲端 Serverless |
| **數據庫** | PostgreSQL 容器 | Supabase PostgreSQL |
| **費用** | $0（但需維護） | $0（雲端托管） |
| **帶寬** | 受本地網速限制 | 全球 CDN 100GB/月 |
| **可用性** | 依賴本地機器 | 99.99% |
| **自動擴展** | ❌ 無 | ✅ 有 |
| **自動備份** | 需手動配置 | ✅ 自動 |
| **HTTPS** | 需配置證書 | ✅ 自動 |
| **維護成本** | 高（需監控、更新） | 低（零維護） |
| **更新方式** | 手動執行命令 | Git 推送自動部署 |
| **故障恢復** | 需手動操作 | 自動恢復 |
| **全球訪問** | 慢（需 Tunnel） | 快（CDN） |

---

## ✅ 遷移完成檢查清單

- [ ] Docker 數據庫已成功導出
- [ ] Supabase 項目已創建
- [ ] 數據已導入到 Supabase
- [ ] Prisma 遷移表已創建
- [ ] Vercel 項目已創建
- [ ] 環境變量已配置
- [ ] 項目已成功部署到 Vercel
- [ ] 健康檢查端點正常
- [ ] 前端頁面正常訪問
- [ ] API 接口正常工作
- [ ] 數據庫連接正常
- [ ] AI 對話功能正常
- [ ] LINE Bot 功能正常（如使用）
- [ ] 自定義域名已配置（如需要）

---

## 🆘 常見問題

### Q1：Vercel 部署失敗怎麼辦？

**A：** 檢查以下項目：
1. 確認 `package.json` 中的 `scripts.build` 正確
2. 檢查是否有語法錯誤
3. 查看 Vercel 部署日誌
4. 確認所有環境變量已設置

### Q2：數據庫連接失敗怎麼辦？

**A：**
1. 確認 Supabase 連接 URL 格式正確
2. 檢查 Supabase 項目是否已啟動
3. 在 Vercel 重新設置環境變量
4. 確認 Supabase 密碼正確

### Q3：會超過免費額度嗎？

**A：** 不會！根據您的使用量：
- Vercel 帶寬：10-30GB/月（免費 100GB）
- Vercel 執行時間：2,000-3,000 分鐘/月（免費 6,000 分鐘）
- Supabase 請求：10,000-20,000 次/月（免費 50,000 次）
- Supabase 存儲：50-100MB（免費 500MB）

### Q4：Docker 容器還需要運行嗎？

**A：** 遷移完成並驗證後，可以停止 Docker 容器：

```bash
docker-compose down
```

建議保留 7 天作為備份。

### Q5：如何更新應用？

**A：** 非常簡單！

1. 本地修改代碼
2. 提交到 Git：
   ```bash
   git add .
   git commit -m "更新功能"
   git push origin main
   ```
3. Vercel 自動檢測並部署

不需要任何額外操作！

### Q6：Cloudflare Tunnel 還需要嗎？

**A：** 不需要！Vercel 自動提供 HTTPS 和全球訪問。

---

## 📞 獲取幫助

如果在遷移過程中遇到問題：

1. **查看 Vercel 部署日誌**
   - Vercel Dashboard → 項目 → "Deployments" → 點擊最新部署

2. **查看 Supabase 日誌**
   - Supabase Dashboard → 項目 → "Logs"

3. **測試數據庫連接**
   ```bash
   # 測試 Supabase 連接
   psql [您的-SUPABASE-URL] -c "SELECT 1"
   ```

---

## 🎉 恭喜！

完成遷移後，您的系統將：
- ✅ 在雲端運行
- ✅ 100% 免費
- ✅ 更穩定、更快速
- ✅ 自動擴展、自動備份
- ✅ 零維護成本

**享受雲端部署的便利吧！** 🚀

---

## 📝 版本歷史

- v1.0 - 初始遷移指南（2024-12-29）
