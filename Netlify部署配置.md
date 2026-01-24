# Netlify 部署完整配置指南

## 📋 部署前準備

### 1. 檢查 GitHub Repository
- 確保所有代碼已推送到 GitHub
- Repository: `csrs885588-hue/line`
- Branch: `main`

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

#### Advanced build settings：
點擊 **"Advanced"** → **"New variable"**，添加以下環境變量：

### 🔴 必需的環境變量

#### 數據庫配置（必需）
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres.mdmltksbpdyndoisnqhy:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

#### Supabase 配置（必需）
```
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2
SUPABASE_JWT_SECRET=JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==
SUPABASE_ACCESS_TOKEN=sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c
```

#### JWT 認證（必需）
```
JWT_SECRET=9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY=
```

#### AI 配置（可選）
```
GLM_API_KEY=your-glm-api-key
```

#### LINE Bot 配置（可選）
```
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
LINE_CHANNEL_SECRET=your-line-secret
```

### 步驟 4：部署

1. 檢查所有設定
2. 點擊 **"Deploy site"**
3. 等待構建完成（3-5 分鐘）

### 步驟 5：測試部署

部署成功後：
1. 點擊提供的網站 URL（例如：`https://your-site-name.netlify.app`）
2. 測試首頁是否正常顯示
3. 測試 API 路由是否工作
4. 測試數據庫連接

---

## 🔧 常見問題解決

### 問題 1：Prisma 構建失敗
**解決方案：**
```bash
# 在本地測試
prisma generate
npm run build
```

### 問題 2：環境變量未正確設置
**解決方案：**
1. 檢查 Netlify Dashboard → Site configuration → Environment variables
2. 確保所有必需的環境變量都已添加
3. 重新部署

### 問題 3：數據庫連接失敗
**解決方案：**
1. 確認 Supabase 雲端連接字符串正確
2. 檢查 Supabase 數據庫是否啟用
3. 確認數據庫密碼正確

### 問題 4：API 路由 404 錯誤
**解決方案：**
1. 確認 `netlify.toml` 配置正確
2. 檢查 `app/api/` 目錄結構
3. 重新部署

---

## 📊 部署後驗證清單

- [ ] 網站可以正常訪問
- [ ] 首頁正確顯示
- [ ] API 路由正常工作
- [ ] 數據庫連接成功
- [ ] 環境變量正確配置
- [ ] LINE Bot webhook 可以接收訊息（如果啟用）
- [ ] AI 功能正常（如果啟用）

---

## 🔄 持續部署

Netlify 會自動監控您的 GitHub repository：
- 每次推送到 `main` branch
- Netlify 會自動重新構建和部署
- 無需手動操作

---

## 📞 技術支援

如果遇到問題：
1. 檢查 Netlify 部署日誌
2. 查看瀏覽器控制台錯誤
3. 檢查 Supabase 日誌
4. 聯繫開發團隊

---

## 🎉 完成後

部署成功後，您會獲得：
- ✅ 一個公開的網站 URL（例如：`https://your-site-name.netlify.app`）
- ✅ 24/7 可訪問的應用
- ✅ 自動 HTTPS
- ✅ 全球 CDN 加速
- ✅ 持續部署（每次推送到 GitHub 自動部署）
