# Netlify 部署快速指南

## 📋 部署前準備

### 1. 確認 GitHub Repository
- Repository: `csrs885588-hue/line`
- Branch: `main`
- 所有配置文件已推送

### 2. 準備 Supabase 雲端連接字符串

#### 獲取 Supabase 雲端數據庫 URL：
1. 登入 https://supabase.com/dashboard
2. 選擇您的專案：`mdmltksbpdyndoisnqhy`
3. 左側選單 → Settings → Database
4. 找到 **Connection string**
5. 選擇 **URI**
6. 複製連接字符串（格式如下）：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres
   ```

#### 獲取 Supabase 直連 URL（Direct URL）：
1. 同上頁面
2. 找到 **Connection pooling**
3. 選擇 **Transaction mode**
4. 複製直連 URL（格式如下）：
   ```
   postgresql://postgres.mdmltksbpdyndoisnqhy:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

---

## 🚀 Netlify 部署步驟

### 步驟 1：註冊 Netlify

1. 訪問：https://app.netlify.com/signup
2. 選擇 **Sign up with GitHub**
3. 授權 Netlify 訪問 GitHub
4. 完成註冊

### 步驟 2：導入 GitHub Repository

1. 進入 Netlify Dashboard
2. 點擊 **"Add new site"** → **"Import an existing project"**
3. 選擇 **GitHub**
4. 授權 Netlify 訪問您的 repositories
5. 找到並選擇：`csrs885588-hue/line`
6. 點擊 **"Import site"**

### 步驟 3：配置構建設定

#### Basic build settings：
```
Branch to deploy: main
Build command: prisma generate && npm run build
Publish directory: .next
```

#### Advanced build settings（環境變量）：

點擊 **"Advanced"** → **"New variable"**，添加以下環境變量：

```bash
# 數據庫配置（重要！替換 [YOUR-PASSWORD]）
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres.mdmltksbpdyndoisnqhy:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# JWT
JWT_SECRET=9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2
SUPABASE_JWT_SECRET=JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==
SUPABASE_ACCESS_TOKEN=sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=tdlFpMlO3GPpiFGq5yuIxcH2Y79OwwjRSE2YydguP0yb7gMbRX1XqgET0WvEM+7NvZBQ4MfJfz9xp8f8pJ9Uzsgcma55Rgc9hwNOap/NrfedXYazKLPLWDww1wPOwjMHA+mFnPOwWJmvVziHuoFaVwdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=f67b75f1f76dad8859df317743d8787c
LINE_USER_ID=U2f7655580a254b416cdb62ae3fd6bb7a
LINE_WEBHOOK_URL=https://bossai.tiankai.it.com/api/webhook/line
LINE_SKIP_SIGNATURE_VERIFY=true

# LINE 群組 ID
LINE_ADMIN_GROUP_ID=C986ae8b3208735b53872a6d609a7bbe7
LINE_DRIVER_GROUP_ID=C4bfd4b93d29f090fa2b18885d8ad7d12
LINE_SALES_GROUP_ID=C4bfd4b93d29f090fa2b18885d8ad7d12
EMPLOYEE_GROUP_ID=C4bfd4b93d29f090fa2b18885d8ad7d12
ZHANG_GROUP_ID=C986ae8b3208735b53872a6d609a7bbe7

# AI（反向代理到本地 - 使用您配置的域名）
AI_BASE_URL=https://ai.tiankai.it.com
OLLAMA_BASE_URL=https://ai.tiankai.it.com
```

### 步驟 4：部署

1. 檢查所有設定
2. 點擊 **"Deploy site"**
3. 等待構建完成（3-5 分鐘）

### 步驟 5：配置自定義域名（重要！）

**使用您已有的域名：bossai.tiankai.it.com**

1. 在 Netlify Dashboard 點擊 **"Domain management"**
2. 點擊 **"Add custom domain"**
3. 輸入：`bossai.tiankai.it.com`
4. 點擊 **"Verify"**

**DNS 設置（不變更後台 DNS）**：

只需要添加一條 CNAME 記錄：
```
Type: CNAME
Name: bossai
Value: your-site-name.netlify.app
TTL: 3600
```

⚠️ **注意**：
- 不要變更後台網站的 DNS 設置
- 只添加這條 CNAME 記錄指向 Netlify
- LINE Bot 只需要 webhook 聯通：`https://bossai.tiankai.it.com/api/webhook/line`

---

## 📝 部署後檢查清單

### 本地檢查：
- [ ] Cloudflare Tunnel 或 Nginx 反向代理正在運行
- [ ] 本地 Ollama 正在運行（`http://localhost:11434`）
- [ ] `https://ai.tiankai.it.com` 可以訪問
- [ ] 測試 AI API：`https://ai.tiankai.it.com/api/tags`

### 雲端檢查：
- [ ] Netlify 部署成功
- [ ] 網站可以訪問（`https://bossai.tiankai.it.com`）
- [ ] 環境變量正確配置
- [ ] LINE Webhook URL 已設置為 `https://bossai.tiankai.it.com/api/webhook/line`
- [ ] LINE Bot 可以接收訊息
- [ ] AI 回應正常（通過反向代理）

### 數據庫檢查：
- [ ] Supabase 數據庫連接正常
- [ ] 數據可以正確讀寫
- [ ] Prisma 遷移成功執行

---

## 🎯 總結

部署成功後：
- ✅ 雲端 24/7 可訪問（Netlify）
- ✅ LINE Bot 24/7 運行
- ✅ 數據存儲在雲端（Supabase）
- ✅ AI 功能在本地運行（通過 Nginx 反向代理）
- ✅ 使用域名：`https://bossai.tiankai.it.com`
- ✅ AI 訪問：`https://ai.tiankai.it.com`
- ✅ 後台 DNS 不變
- ✅ 總費用：$0/月（完全免費）

---

## 🔧 故障排除

### 問題 1：Prisma 構建失敗
**解決方案**：
```bash
# 在本地測試
prisma generate
npm run build
```

### 問題 2：環境變量未正確設置
**解決方案**：
1. 檢查 Netlify Dashboard → Site configuration → Environment variables
2. 確保所有必需的環境變量都已添加
3. 重新部署

### 問題 3：數據庫連接失敗
**解決方案**：
1. 確認 Supabase 雲端連接字符串正確
2. 檢查 Supabase 數據庫是否啟用
3. 確認數據庫密碼正確

### 問題 4：API 路由 404 錯誤
**解決方案**：
1. 確認 `netlify.toml` 配置正確
2. 檢查 `app/api/` 目錄結構
3. 重新部署

### 問題 5：AI 無法訪問
**解決方案**：
1. 確認 Nginx 正在運行
2. 確認 `https://ai.tiankai.it.com` 可以訪問
3. 檢查 Nginx 日誌：`C:\nginx\logs\ai-error.log`
4. 確認本地 Ollama 正在運行
