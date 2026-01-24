# 九九瓦斯行 - 免費部署指南

## 🎯 部署架構

```
┌─────────────────────────────────────┐
│  前端 (Next.js)                     │
│  Vercel - 香港                   │
│  https://bossai.vercel.app      │
└─────────────┬───────────────────────┘
              │ API 調用
      ┌───────▼────────┐
      │ Supabase (DB)  │
      │ PostgreSQL     │
      │ 免費 500MB    │
      └───────┬────────┘
              │
      ┌───────▼────────┐
      │ Python AI      │
      │ Render         │
      │ LINE Bot + AI  │
      └────────────────┘
```

---

## 📋 部署前準備

### 1. 準備帳號
- [ ] GitHub 帳號
- [ ] Vercel 帳號
- [ ] Supabase 帳號
- [ ] Render 帳號

### 2. 推送代碼到 GitHub
```bash
git add .
git commit -m "準備部署"
git push origin main
```

---

## 🚀 第一步：部署 Supabase 數據庫

### 1.1 創建 Supabase 專案

1. 訪問 https://supabase.com
2. 點擊 **Start your project**
3. 使用 GitHub 登入
4. 點擊 **New Project**

### 1.2 配置專案

| 設定 | 值 |
|------|-----|
| **Name** | `bossai-99` |
| **Database Password** | 記住這個密碼！ |
| **Region** | `Southeast Asia (Singapore)` |
| **Pricing Plan** | `Free` |

⏱️ 等待 1-2 分鐘創建完成...

### 1.3 獲取連接資訊

創建完成後，點擊：
1. **Settings** → **Database**
2. 複製以下資訊：

```
📝 記下來：

Project URL:  https://xxxxx.supabase.co
Anon Key:     eyJhbGc...（Public API Key）
```

### 1.4 初始化數據庫

在 Supabase SQL Editor 執行：

```sql
-- 創建測試表（驗證連接）
CREATE TABLE test_connection (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 測試插入
INSERT INTO test_connection VALUES (1, NOW());

-- 測試查詢
SELECT * FROM test_connection;
```

✅ 如果看到數據，表示數據庫正常！

---

## 🌐 第二步：部署 Next.js 前端到 Vercel

### 2.1 連接 Vercel

1. 訪問 https://vercel.com
2. 點擊 **Sign Up**
3. 使用 **Continue with GitHub**
4. 安裝 Vercel GitHub 應用

### 2.2 導入專案

1. 點擊 **Add New** → **Project**
2. 選擇您的 GitHub repository
3. Vercel 會自動檢測 Next.js

### 2.3 配置環境變數

在 Vercel 專案設置中，添加以下環境變數：

```bash
# === Supabase 數據庫 ===
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# === Supabase API ===
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...

# === JWT ===
JWT_SECRET=9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY=

# === AI ===
GLM_API_KEY=your-glm-api-key

# === LINE Bot ===
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
LINE_CHANNEL_SECRET=your-line-secret
```

### 2.4 部署設置

| 設定 | 值 |
|------|-----|
| **Framework Preset** | Next.js |
| **Root Directory** | `./` |
| **Build Command** | `npm run build` |
| **Install Command** | `npm install --legacy-peer-deps` |
| **Output Directory** | `.next` |

### 2.5 開始部署

點擊 **Deploy** 🚀

⏱️ 等待 2-5 分鐘...

✅ 部署完成後，您會得到：
```
https://bossai-99.vercel.app
```

### 2.6 初始化數據庫

訪問以下 URL 初始化數據庫：
```
https://bossai-99.vercel.app/api/init
```

您應該看到：
```json
{
  "message": "數據庫初始化成功",
  "users": "5"
}
```

---

## 🤖 第三步：部署 Python AI 到 Render

### 3.1 創建 Dockerfile

在 `line_bot_ai/` 目錄創建 `Dockerfile`：

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安裝依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製代碼
COPY . .

# 暴露端口
EXPOSE 8888

# 啟動服務
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8888"]
```

### 3.2 創建 Web Service

1. 訪問 https://render.com
2. 使用 **Sign up with GitHub**
3. 點擊 **New** → **Web Service**

### 3.3 連接 GitHub

1. 選擇您的 repository
2. 配置服務：

| 設定 | 值 |
|------|-----|
| **Name** | `bossai-python` |
| **Environment** | `Docker` |
| **Dockerfile Path** | `line_bot_ai/Dockerfile` |
| **Region** | `Singapore (Southeast Asia)` |
| **Branch** | `main` |
| **Instance Type** | `Free` |

### 3.4 配置環境變數

添加以下環境變數：

```bash
# === 數據庫 ===
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# === LINE Bot ===
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
LINE_CHANNEL_SECRET=your-line-secret

# === AI ===
GLM_API_KEY=your-glm-api-key
GLM_MODEL=glm-4.7-coding-max

# === 服務 ===
HOST=0.0.0.0
PORT=8888
LOG_LEVEL=INFO
```

### 3.5 部署

點擊 **Create Web Service** 🚀

⏱️ 等待 5-10 分鐘構建...

✅ 部署完成後，您會得到：
```
https://bossai-python.onrender.com
```

### 3.6 測試服務

檢查健康狀態：
```bash
curl https://bossai-python.onrender.com/api/health
```

應該返回：
```json
{
  "status": "healthy",
  "service": "BossAI Python Service"
}
```

---

## 🔗 第四步：配置 LINE Webhook

### 4.1 更新 LINE Webhook URL

在 LINE Developer Console 更新 Webhook URL：

```
https://bossai-python.onrender.com/api/webhook/line
```

### 4.2 驗證 Webhook

在 LINE Console 點擊 **Verify**

✅ 應該顯示 **Success**

---

## ✅ 第五步：測試整個系統

### 5.1 測試前端

訪問：https://bossai-99.vercel.app

登入帳號：
- 帳號：`admin`
- 密碼：`Uu19700413`

### 5.2 測試 LINE Bot

1. 在 LINE 加入您的 Bot
2. 發送訊息測試：
   - `今日營收`
   - `庫存查詢`
   - `20kg 瓦斯還有多少`

### 5.3 測試 AI 助手

在前端頁面點擊 **AI 助手**，輸入問題測試。

---

## 🔧 故障排除

### 問題：Vercel 部署失敗

**解決方案：**
```bash
# 確認 package.json 有正確的腳本
"build": "next build"
"dev": "next dev -p 9999"
```

### 問題：數據庫連接失敗

**解決方案：**
1. 檢查 Supabase 是否暫停
2. 確認 DATABASE_URL 格式正確
3. 在 Supabase Settings → Database → Connection String 複製正確的 URL

### 問題：Python 服務無法啟動

**解決方案：**
1. 檢查 Render 日誌
2. 確認 requirements.txt 包含所有依賴
3. 檢查端口是否為 8888

### 問題：LINE Webhook 驗證失敗

**解決方案：**
1. 確認 Render 服務正在運行
2. 檢查 LINE Channel Secret 是否正確
3. 確認 Webhook URL 正確

---

## 📊 免費額度監控

### Vercel
- 100GB 帶寬/月
- 無限請求
- 查看：https://vercel.com/usage

### Supabase
- 500MB 數據庫
- 50萬請求/月
- 1GB 文件存儲
- 查看：https://supabase.com/dashboard > Usage

### Render
- 750 小時/月（全月運行）
- 512MB RAM
- 查看：https://dashboard.render.com

---

## 🎉 完成！

您的系統現在已經部署在雲端，完全免費！

**訪問地址：**
- 前端：https://bossai-99.vercel.app
- Python AI：https://bossai-python.onrender.com

**下次更新：**
只需 `git push`，Vercel 和 Render 會自動重新部署！

---

## 📞 需要幫助？

如果遇到問題，檢查：
1. Vercel 部署日誌
2. Render 服務日誌
3. Supabase 數據庫日誌
4. LINE Developer Console

---

**最後更新：** 2025-01-17
**狀態：** ✅ 可以開始部署
