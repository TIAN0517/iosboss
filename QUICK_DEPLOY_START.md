# 快速部署指南 - 本地優先架構

## 📋 您的架構需求

✅ **本地為主** - 主數據庫在本地
✅ **雲端為輔** - 只做備份和讀取
✅ **免費部署** - Vercel + Supabase
✅ **關機保護** - 本地關機時雲端保留最後備份

## 🚀 3步驟完成部署

### 步驟 1：註冊服務（5分鐘）

#### Vercel（免費）
1. 訪問：https://vercel.com
2. 用 GitHub 登入
3. 創建帳號（免費）

#### Supabase（免費）
1. 訪問：https://supabase.com
2. 點擊 "Start your project"
3. 用 GitHub 登入
4. 創建新專案（免費）

### 步驟 2：獲取 Supabase 連接字串（2分鐘）

在 Supabase Dashboard：
1. 點擊左側 "Settings" → "Database"
2. 複製 "Connection string" → "URI" 格式
3. 複製 "Connection pooling" → "Transaction mode" 字串

```
# 格式如下：
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

4. 點擊左側 "Settings" → "API"
5. 複製以下：
```
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your-anon-key
```

### 步驟 3：部署到 Vercel（3分鐘）

#### 方法 A：使用腳本（推薦）
```bash
# 執行部署腳本
scripts\deploy-to-vercel.bat
```

#### 方法 B：手動部署
```bash
# 1. 安裝 Vercel CLI
npm i -g vercel

# 2. 登入
vercel login

# 3. 部署
vercel --prod
```

### 步驟 4：設置環境變量（2分鐘）

在 Vercel Dashboard：
1. 開啟您的專案
2. 點擊 "Settings" → "Environment Variables"
3. 添加以下變量：

```
DATABASE_URL=（從 Supabase 複製）
DIRECT_URL=（從 Supabase 複製）
NEXT_PUBLIC_SUPABASE_URL=（從 Supabase 複製）
NEXT_PUBLIC_SUPABASE_KEY=（從 Supabase 複製）

# 可選（如果需要 AI 功能）
GLM_API_KEY=your-glm-key

# 可選（如果需要 LINE Bot）
LINE_CHANNEL_ACCESS_TOKEN=your-token
LINE_CHANNEL_SECRET=your-secret
```

4. 點擊 "Save"
5. **重要**：重新部署專案（環境變量才會生效）

## 🔄 設置自動同步

### Windows 任務計劃（自動同步）

```bash
# 每天 2:00 AM 自動同步到雲端
schtasks /create /tn "BossAI-Cloud-Sync" /tr "C:\Users\tian7\OneDrive\Desktop\媽媽ios\scripts\sync-to-cloud.bat" /sc daily /st 02:00

# 查看任務
schtasks /query /tn "BossAI-Cloud-Sync"

# 刪除任務
schtasks /delete /tn "BossAI-Cloud-Sync" /f
```

## 📊 部署後檢查清單

- [ ] Vercel 部署成功，可以訪問網站
- [ ] 環境變量已設置並重新部署
- [ ] Supabase 數據庫已連接
- [ ] 自動同步任務已設置
- [ ] 本地數據可以正常讀取
- [ ] 雲端備份功能正常

## ⚠️ 重要限制

### 本地開機時
✅ 所有功能正常
✅ 自動同步到雲端
✅ LINE Bot 正常運作

### 本地關機時
✅ 可以查看網站
✅ 可以查看舊數據（雲端備份）
❌ 無法新增/修改數據
❌ 無法使用 LINE Bot 打卡

## 💰 成本監控

### 免費額度
- **Vercel**: 100GB 帶寬/月
- **Supabase**: 500MB 數據庫 + 1GB 文件

### 避免超額
1. 關閉不需要的 API 路由
2. 減少圖片上傳
3. 優化資料庫查詢
4. 定期清理舊備份

### 超額處理
如果超過免費額度：
1. Vercel: $20/100GB
2. Supabase: $25/月（8GB）

## 🔧 常見問題

### Q: 部署失敗？
A: 檢查環境變量是否正確，重新部署

### Q: 無法連接數據庫？
A: 確認 Supabase 連接字串正確

### Q: 本地關機時如何處理？
A: 雲端會顯示最後一次備份的數據（只讀模式）

### Q: 如何更新部署？
A: 只需要 git push，Vercel 會自動部署

## 📞 管理連結

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **您的應用**: https://your-app.vercel.app

## 🎉 完成！

您的應用已部署到雲端，並使用本地優先架構！
