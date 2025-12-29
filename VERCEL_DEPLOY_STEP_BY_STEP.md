# 🚀 Vercel 部署完整步驟指南

## 📍 當前位置

您現在在 Vercel 的「網域」頁面。部署需要到**專案設置**或**部署頁面**。

---

## 🎯 部署步驟（按順序執行）

### 步驟 1：進入專案設置

1. **點擊左側導航欄的「專案」或「Projects」**
2. **選擇您的專案**（例如：`bossai-ten` 或 `bossaigas`）
3. **進入專案主頁**

---

### 步驟 2：配置環境變數（重要！）

1. **在專案頁面，點擊「Settings」（設置）**
2. **點擊左側的「Environment Variables」（環境變數）**
3. **添加以下環境變數**：

#### 方法 A：批量導入（推薦）⭐

1. **打開項目中的 `vercel-env-variables.txt` 文件**
2. **複製全部內容**（不包括註釋行，只複製 `KEY=value` 格式的行）
3. **在 Vercel 環境變數頁面**：
   - 點擊「導入.env 或貼上上面的.env檔案內容」
   - 粘貼內容
   - 點擊「導入」

#### 方法 B：手動添加

逐個添加以下環境變數：

**Supabase 配置**：
```
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2
SUPABASE_JWT_SECRET=JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==
```

**GLM AI 配置**：
```
GLM_API_KEYS=vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn
GLM_API_KEY=vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn
```

**系統配置**：
```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

4. **為每個環境變數選擇環境**：
   - ✅ Production（生產環境）
   - ✅ Preview（預覽環境）
   - ✅ Development（開發環境）

5. **點擊「Save」（保存）**

---

### 步驟 3：部署

#### 方法 A：自動部署（如果已連接 GitHub）⭐

1. **確保代碼已推送到 GitHub**
   ```bash
   git add .
   git commit -m "準備部署到 Vercel"
   git push origin main
   ```

2. **Vercel 會自動檢測並部署**
   - 在專案頁面的「Deployments」標籤查看部署狀態
   - 等待部署完成（約 2-5 分鐘）

#### 方法 B：手動部署

1. **在專案頁面，點擊「Deployments」標籤**
2. **點擊「Redeploy」或「Deploy」按鈕**
3. **選擇分支**（通常是 `main` 或 `master`）
4. **點擊「Deploy」**
5. **等待部署完成**

---

### 步驟 4：驗證部署

1. **等待部署完成**（狀態顯示為「Ready」）
2. **點擊部署的 URL**（例如：`https://bossai-ten.vercel.app`）
3. **確認網站可以正常訪問**
4. **測試主要功能**：
   - 首頁正常加載
   - 可以查詢數據
   - AI 功能正常（如果配置了 GLM API Key）

---

## 📋 部署檢查清單

在部署前，確認：

- [ ] 環境變數已全部添加
- [ ] 所有環境變數值都完整（沒有截斷）
- [ ] 代碼已推送到 GitHub（如果使用自動部署）
- [ ] `vercel.json` 文件已存在（已自動創建）

---

## 🔍 常見問題

### Q1: 找不到部署按鈕？

**A**: 
- 確保您在專案主頁，不是網域頁面
- 點擊「Deployments」標籤
- 如果沒有部署記錄，點擊「Deploy」按鈕

### Q2: 部署失敗？

**A**: 
- 檢查環境變數是否完整
- 查看部署日誌中的錯誤信息
- 確認 `package.json` 中有 `build` 腳本

### Q3: 網站可以訪問但功能不正常？

**A**: 
- 檢查環境變數是否正確配置
- 確認 Supabase 連接是否正常
- 查看瀏覽器控制台的錯誤信息

---

## 🎯 快速部署命令（使用 CLI）

如果您想使用命令行部署：

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入 Vercel
vercel login

# 部署到生產環境
vercel --prod
```

---

## ✅ 部署完成後

部署成功後，您將獲得：

- ✅ 生產環境 URL（例如：`https://bossai-ten.vercel.app`）
- ✅ 自動 HTTPS 證書
- ✅ 全球 CDN 加速
- ✅ 自動擴展

---

## 📞 需要幫助？

如果遇到問題：

1. **查看部署日誌**：在 Vercel Dashboard → Deployments → 點擊部署記錄 → 查看日誌
2. **檢查環境變數**：確認所有變數都已正確配置
3. **參考文檔**：
   - `QUICK_VERCEL_DEPLOY.md` - 快速部署指南
   - `FINAL_AUTO_DEPLOY_COMPLETE.md` - 完整部署總結

---

**記住**：最重要的是配置環境變數！部署本身很簡單，但環境變數必須正確配置才能正常工作。
