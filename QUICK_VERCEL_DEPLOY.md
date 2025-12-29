# 🚀 快速 Vercel 部署指南

## ⚠️ 重要：不要創建新數據庫！

**您已經有一個完整的 Supabase 專案**，所有數據都已遷移完成。**不要**在 Vercel 中創建新的 Supabase 數據庫！

---

## ✅ 正確的部署步驟

### 步驟 1：跳過 Supabase 數據庫創建

在 Vercel 部署頁面中：
1. **點擊「後退」按鈕**，返回專案配置
2. **不要點擊「創造」按鈕**
3. 直接進入環境變數配置

---

### 步驟 2：配置環境變數

在 Vercel Dashboard → 專案設置 → Environment Variables 中，添加以下變數：

#### Supabase 配置（必需）

```
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2
SUPABASE_JWT_SECRET=JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==
```

#### GLM AI 配置（AI 功能必需）

```
GLM_API_KEYS=vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn
GLM_API_KEY=vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn
```

---

### 步驟 3：部署

1. 確認所有環境變數都已添加
2. 點擊「Deploy」按鈕
3. 等待部署完成（約 2-5 分鐘）

---

## 📋 您現有的 Supabase 專案

**專案 ID**: `mdmltksbpdyndoisnqhy`  
**專案 URL**: `https://mdmltksbpdyndoisnqhy.supabase.co`

**狀態**：
- ✅ 32 個表已創建
- ✅ 所有數據已導入
- ✅ RLS 策略已配置
- ✅ 權限已設置
- ✅ 連接測試成功

---

## 💡 快速導入方法

### 方法 1：使用 .env 文件導入

1. 打開 `vercel-env-variables.txt` 文件
2. 複製全部內容
3. 在 Vercel Dashboard 中：
   - 點擊「導入.env 或貼上上面的.env檔案內容」
   - 粘貼內容
   - 點擊「導入」

### 方法 2：手動添加

逐個添加上述環境變數

---

## ✅ 完成後

1. 確認所有環境變數都已添加
2. 點擊「Deploy」按鈕
3. 等待部署完成
4. 訪問您的網站 URL
5. 測試功能

---

**記住**：使用現有的 Supabase 專案，不要創建新的數據庫！
