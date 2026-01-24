# Supabase CLI 配置指南

## 🔑 您提供的 CLI 訪問令牌

```
sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c
```

---

## 📋 CLI 訪問令牌說明

### 用途
- ✅ Supabase CLI 工具認證
- ✅ 命令行操作（部署、遷移、管理）
- ✅ 自動化腳本和 CI/CD
- ✅ 本地開發環境管理

### 安全性
- ⚠️ **個人訪問令牌**：具有您的帳號權限
- ⚠️ **請勿公開分享**：不要提交到 Git
- ⚠️ **定期輪換**：建議定期更換

---

## 🔧 配置步驟

### 步驟 1：安裝 Supabase CLI

#### Windows（使用 PowerShell）

```powershell
# 使用 Scoop 安裝（推薦）
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 或使用 npm 安裝
npm install -g supabase
```

#### Mac/Linux

```bash
# 使用 Homebrew（Mac）
brew install supabase/tap/supabase

# 或使用 npm
npm install -g supabase
```

### 步驟 2：登入 Supabase CLI

```bash
# 使用您的訪問令牌登入
supabase login --token sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c
```

**預期輸出**：
```
✅ Logged in as your-email@example.com
```

### 步驟 3：鏈接專案

```bash
# 鏈接到您的 Supabase 專案
supabase link --project-ref mdmltksbpdyndoisnqhy
```

**預期輸出**：
```
✅ Linked to project mdmltksbpdyndoisnqhy
```

### 步驟 4：驗證連接

```bash
# 檢查連接狀態
supabase status
```

**預期輸出**：
```
Project: mdmltksbpdyndoisnqhy
API URL: https://mdmltksbpdyndoisnqhy.supabase.co
```

---

## 💻 常用 CLI 命令

### 數據庫管理

```bash
# 查看數據庫狀態
supabase db status

# 拉取遠程數據庫結構
supabase db pull

# 推送本地遷移到遠程
supabase db push

# 重置數據庫
supabase db reset
```

### 遷移管理

```bash
# 創建新遷移
supabase migration new migration_name

# 列出所有遷移
supabase migration list

# 應用遷移
supabase migration up
```

### 函數管理

```bash
# 列出 Edge Functions
supabase functions list

# 部署 Edge Function
supabase functions deploy function_name

# 調用 Edge Function
supabase functions invoke function_name
```

### 日誌查看

```bash
# 查看 API 日誌
supabase logs --type api

# 查看數據庫日誌
supabase logs --type db

# 查看實時日誌
supabase logs --follow
```

---

## 🔐 環境變數配置

### 方法 1：使用環境變數（推薦）

在 `.env` 文件中添加：

```env
# Supabase CLI 訪問令牌
SUPABASE_ACCESS_TOKEN=sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c
```

然後在腳本中使用：

```bash
export SUPABASE_ACCESS_TOKEN=sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c
supabase login --token $SUPABASE_ACCESS_TOKEN
```

### 方法 2：直接使用令牌

```bash
supabase login --token sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c
```

---

## 🚀 自動化腳本示例

### 創建自動化遷移腳本

**文件**：`scripts/auto-migrate-with-cli.sh`

```bash
#!/bin/bash

# 設置訪問令牌
export SUPABASE_ACCESS_TOKEN=sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c

# 登入
supabase login --token $SUPABASE_ACCESS_TOKEN

# 鏈接專案
supabase link --project-ref mdmltksbpdyndoisnqhy

# 應用遷移
supabase db push

# 驗證
supabase db status
```

**Windows PowerShell 版本**：`scripts/auto-migrate-with-cli.ps1`

```powershell
# 設置訪問令牌
$env:SUPABASE_ACCESS_TOKEN = "sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c"

# 登入
supabase login --token $env:SUPABASE_ACCESS_TOKEN

# 鏈接專案
supabase link --project-ref mdmltksbpdyndoisnqhy

# 應用遷移
supabase db push

# 驗證
supabase db status
```

---

## 📝 完整配置清單

### CLI 配置

- [ ] Supabase CLI 已安裝
- [ ] 使用訪問令牌登入成功
- [ ] 專案鏈接成功
- [ ] 可以執行 CLI 命令

### 環境變數配置

- [ ] `SUPABASE_ACCESS_TOKEN` 已設置（可選）
- [ ] 令牌已保存在安全位置

---

## 🎯 使用場景

### 場景 1：本地開發

```bash
# 啟動本地 Supabase（包含所有服務）
supabase start

# 停止本地 Supabase
supabase stop
```

### 場景 2：數據庫遷移

```bash
# 從遠程拉取最新結構
supabase db pull

# 創建新遷移
supabase migration new add_new_table

# 應用遷移
supabase db push
```

### 場景 3：函數部署

```bash
# 部署 Edge Function
supabase functions deploy my-function

# 調用函數測試
supabase functions invoke my-function
```

---

## 🔒 安全建議

1. **令牌管理**：
   - ✅ 保存在 `.env` 文件中
   - ✅ 添加到 `.gitignore`
   - ❌ 不要提交到 Git
   - ❌ 不要分享給他人

2. **令牌輪換**：
   - 定期在 Supabase Dashboard 中重新生成
   - 更新所有使用該令牌的地方

3. **權限控制**：
   - 僅授予必要的權限
   - 使用最小權限原則

---

## 📞 需要幫助？

如果在使用 CLI 時遇到問題：

1. **查看 Supabase CLI 文檔**：
   - https://supabase.com/docs/reference/cli

2. **檢查 CLI 版本**：
   ```bash
   supabase --version
   ```

3. **查看幫助**：
   ```bash
   supabase --help
   supabase <command> --help
   ```

---

**配置完成日期**：2025-12-29  
**CLI 訪問令牌**：`sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c`
