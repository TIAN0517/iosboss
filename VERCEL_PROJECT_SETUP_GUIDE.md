# 🚀 Vercel 專案設置完整指南

## 📍 當前狀態

您的專案「老闆」顯示：
- ⚠️ 「無需生產部署」（No production deployment needed）
- ⚠️ 「連接 Git 倉庫」（Connect Git repository）

這表示專案還沒有連接到 Git 倉庫，所以無法自動部署。

---

## 🎯 兩種部署方式

### 方法 1：連接 Git 倉庫（推薦）⭐

**優點**：
- ✅ 自動部署（每次推送代碼自動部署）
- ✅ 版本控制
- ✅ 預覽部署（每個 PR 都有預覽）

**步驟**：

1. **點擊「連接 Git 倉庫」**
2. **選擇您的 Git 提供商**：
   - GitHub（推薦）
   - GitLab
   - Bitbucket
3. **授權 Vercel 訪問您的倉庫**
4. **選擇倉庫**：
   - 選擇您的專案倉庫（例如：`TIAN0517/bossai`）
5. **配置專案**：
   - Framework Preset: Next.js（自動檢測）
   - Root Directory: `./`（項目根目錄）
   - Build Command: `npm run build`（自動檢測）
   - Output Directory: `.next`（自動檢測）
   - Install Command: `npm install --legacy-peer-deps`
6. **配置環境變數**（重要！）：
   - 在「Environment Variables」部分添加所有環境變數
   - 參考 `vercel-env-variables.txt` 文件
7. **點擊「Deploy」**
8. **等待部署完成**

---

### 方法 2：手動部署（不使用 Git）

**適用於**：
- 快速測試
- 不想連接 Git 倉庫

**步驟**：

1. **使用 Vercel CLI**：
   ```bash
   # 安裝 Vercel CLI
   npm install -g vercel
   
   # 登入 Vercel
   vercel login
   
   # 部署到生產環境
   vercel --prod
   ```

2. **或者在 Vercel Dashboard**：
   - 點擊「新增內容...」按鈕
   - 選擇「上傳專案」或「從模板創建」
   - 上傳您的項目文件
   - 配置環境變數
   - 部署

---

## ⚠️ 重要：配置環境變數

無論使用哪種方法，都必須配置環境變數！

### 環境變數清單

在 Vercel Dashboard → 專案設置 → Environment Variables 中添加：

```
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2
SUPABASE_JWT_SECRET=JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==
GLM_API_KEYS=vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn
GLM_API_KEY=vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### 快速導入方法

1. **打開 `vercel-env-variables.txt` 文件**
2. **複製所有 `KEY=value` 格式的行**（不包括註釋）
3. **在 Vercel 環境變數頁面**：
   - 點擊「導入.env 或貼上上面的.env檔案內容」
   - 粘貼內容
   - 點擊「導入」

---

## 🔄 關於重新部署通知

如果您看到「需要重新部署才能使變更生效」的通知：

1. **確認所有環境變數都已添加**
2. **點擊「重新部署」按鈕**
3. **等待部署完成**

---

## 📋 部署檢查清單

在部署前，確認：

- [ ] Git 倉庫已連接（如果使用方法 1）
- [ ] 所有環境變數都已添加
- [ ] 環境變數值都完整（沒有截斷）
- [ ] `vercel.json` 文件已存在（已自動創建）
- [ ] `package.json` 中有 `build` 腳本

---

## ✅ 部署完成後

1. **等待部署狀態顯示為「Ready」**
2. **訪問您的網站 URL**（例如：`https://bossai-ten.vercel.app`）
3. **測試網站功能**：
   - 首頁正常加載
   - 可以查詢 Supabase 數據
   - AI 功能正常（如果配置了 GLM API Key）

---

## 🎯 推薦流程

**最簡單的方法**：

1. **點擊「連接 Git 倉庫」**
2. **選擇 GitHub 並授權**
3. **選擇您的倉庫**
4. **配置環境變數**（使用 `vercel-env-variables.txt`）
5. **點擊「Deploy」**
6. **等待部署完成**

---

## 📞 需要幫助？

如果遇到問題：

1. **查看部署日誌**：在 Deployments 標籤查看錯誤
2. **檢查環境變數**：確認所有變數都已正確配置
3. **參考文檔**：
   - `VERCEL_DEPLOY_STEP_BY_STEP.md` - 詳細部署步驟
   - `QUICK_VERCEL_DEPLOY.md` - 快速部署指南

---

**記住**：連接 Git 倉庫後，每次推送代碼都會自動部署，非常方便！
