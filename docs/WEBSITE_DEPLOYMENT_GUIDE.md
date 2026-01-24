# 網站部署完整指南

## 🎯 部署目標

將九九瓦斯行管理系統部署到 Vercel，讓網站可以在互聯網上訪問。

---

## 📋 部署前準備

### 1. 確保本地配置完成

在部署之前，請確保：

- [x] Supabase 數據庫已配置
- [x] 環境變數已配置（.env 文件）
- [x] 本地開發環境可以正常運行
- [x] 所有依賴已安裝

**驗證方法**：
```bash
# 1. 檢查配置
node scripts/verify-all-config.js

# 2. 測試本地運行
npm run dev
# 訪問 http://localhost:9999 確認正常
```

---

## 🚀 部署到 Vercel

### 步驟 1：準備代碼

#### 1.1 確保代碼已提交到 Git

```bash
# 檢查 Git 狀態
git status

# 如果有未提交的更改，提交它們
git add .
git commit -m "配置 Supabase 和環境變數"
```

#### 1.2 推送到 GitHub

```bash
# 推送到 GitHub（如果還沒有）
git push origin main
```

---

### 步驟 2：創建 Vercel 專案

#### 2.1 訪問 Vercel

1. 訪問：https://vercel.com
2. 使用 GitHub 帳號登入
3. 點擊「Add New Project」

#### 2.2 導入專案

1. **選擇倉庫**：選擇您的 GitHub 倉庫
2. **配置專案**：
   - **Framework Preset**：Next.js
   - **Root Directory**：`./`（項目根目錄）
   - **Build Command**：`npm run build`（自動檢測）
   - **Output Directory**：`.next`（自動檢測）
   - **Install Command**：`npm install`（自動檢測）

3. **環境變數配置**（重要！）：
   點擊「Environment Variables」，添加以下變數：

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_EviKlKgPnLtGeaDs8SVysQ_bzavSNr9
   NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2
   SUPABASE_JWT_SECRET=JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==
   ```

   **重要**：
   - 每個環境變數都要單獨添加
   - 選擇「Production」、「Preview」、「Development」三個環境
   - 點擊「Save」保存

4. **部署**：
   - 點擊「Deploy」按鈕
   - 等待部署完成（約 2-5 分鐘）

---

### 步驟 3：驗證部署

#### 3.1 檢查部署狀態

1. 在 Vercel Dashboard 中查看部署狀態
2. 確認部署成功（綠色勾號）

#### 3.2 訪問網站

1. 點擊部署的網站 URL（格式：`https://your-project.vercel.app`）
2. 確認網站可以正常訪問
3. 測試主要功能：
   - 首頁加載
   - 數據查詢
   - API 端點

#### 3.3 檢查環境變數

1. 在 Vercel Dashboard 中：
   - 進入專案設置
   - 點擊「Environment Variables」
   - 確認所有變數都已設置

---

## 🔧 配置自定義域名（可選）

### 步驟 1：添加域名

1. 在 Vercel Dashboard 中：
   - 進入專案設置
   - 點擊「Domains」
   - 輸入您的域名（如 `gas.yourdomain.com`）

### 步驟 2：配置 DNS

根據 Vercel 的提示配置 DNS 記錄：
- **A Record** 或 **CNAME Record**
- 指向 Vercel 提供的地址

---

## 📊 部署後檢查清單

### 功能檢查

- [ ] 網站可以正常訪問
- [ ] 首頁正常加載
- [ ] 所有頁面可以訪問
- [ ] API 端點正常工作
- [ ] 數據庫連接正常
- [ ] 用戶認證功能正常（如適用）
- [ ] 表單提交功能正常（如適用）

### 性能檢查

- [ ] 頁面加載速度正常
- [ ] 圖片和資源正常加載
- [ ] 沒有控制台錯誤
- [ ] 移動端顯示正常

### 安全檢查

- [ ] HTTPS 已啟用
- [ ] 環境變數已正確配置
- [ ] API 金鑰未暴露在前端代碼中
- [ ] RLS 策略已配置

---

## 🐛 常見問題

### 問題 1：部署失敗

**錯誤信息**：`Build failed`

**解決方法**：
1. 檢查構建日誌中的錯誤信息
2. 確認 `package.json` 中的構建腳本正確
3. 確認所有依賴都已安裝
4. 檢查 `next.config.mjs` 配置

### 問題 2：環境變數未生效

**症狀**：網站無法連接到 Supabase

**解決方法**：
1. 確認環境變數已在 Vercel 中設置
2. 確認變數名稱正確（注意大小寫）
3. 重新部署（環境變數更改後需要重新部署）
4. 檢查變數值是否正確（沒有多餘的空格）

### 問題 3：API 請求失敗

**錯誤信息**：`Failed to fetch` 或 `401 Unauthorized`

**解決方法**：
1. 確認 Supabase URL 和 Key 正確
2. 確認 RLS 策略已配置
3. 檢查 API 端點的認證邏輯
4. 查看瀏覽器控制台的錯誤信息

---

## 🎉 部署完成標誌

當以下所有項目都完成時，部署才算成功：

### ✅ 本地環境
- [x] 本地開發服務器可以正常運行
- [x] 可以連接到 Supabase
- [x] 所有功能正常

### ✅ Vercel 部署
- [ ] 部署成功（無錯誤）
- [ ] 網站可以訪問
- [ ] 所有頁面正常
- [ ] API 端點正常工作
- [ ] 數據庫連接正常

### ✅ 驗證測試
- [ ] 運行最終驗證腳本通過
- [ ] 手動測試所有主要功能
- [ ] 檢查日誌無錯誤

---

## 📞 需要幫助？

如果在部署過程中遇到問題：

1. **查看 Vercel 文檔**：
   - Next.js 部署：https://vercel.com/docs/frameworks/nextjs
   - 環境變數：https://vercel.com/docs/concepts/projects/environment-variables

2. **查看項目文檔**：
   - `MIGRATION_TO_VERCEL_SUPABASE.md` - Vercel 遷移指南
   - `CONFIGURATION_COMPLETE_CHECKLIST.md` - 配置檢查清單

3. **檢查日誌**：
   - Vercel Dashboard → Deployments → 選擇部署 → Logs
   - Supabase Dashboard → Logs

---

**部署完成後，您的網站就可以在互聯網上訪問了！** 🎊
