# 🔧 修復 Vercel DATABASE_URL 錯誤

## ❌ 錯誤訊息

```
環境變數"DATABASE_URL"引用了不存在的金鑰"database-url"。
```

## ✅ 解決方法

### 原因

這個錯誤是因為在 Vercel Dashboard 中配置了 `DATABASE_URL` 環境變數，但它引用了另一個不存在的環境變數 `database-url`。

### 重要：我們不需要 DATABASE_URL！

**因為我們使用 Supabase**，所以：
- ✅ 不需要 `DATABASE_URL`（直接數據庫連接）
- ✅ 使用 Supabase 的 REST API（通過 `NEXT_PUBLIC_SUPABASE_URL` 和 API Keys）

---

## 🛠️ 修復步驟

### 方法 1：刪除 DATABASE_URL（推薦）⭐

1. **在 Vercel Dashboard 中**：
   - 進入專案「老闆」或「bossai-ten」
   - 點擊「Settings」→「Environment Variables」

2. **找到 `DATABASE_URL` 環境變數**
   - 如果存在，點擊右側的「刪除」按鈕（減號圖標）
   - 刪除它

3. **確認其他環境變數**：
   - 確保以下環境變數存在（不需要 DATABASE_URL）：
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
     - `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
     - `SUPABASE_JWT_SECRET`
     - `GLM_API_KEYS`
     - `GLM_API_KEY`

### 方法 2：如果必須保留 DATABASE_URL

如果您確實需要 `DATABASE_URL`（例如 Prisma 使用），請：

1. **在 Vercel Dashboard 中**：
   - 進入「Settings」→「Environment Variables」
   - 找到 `DATABASE_URL`

2. **修改配置**：
   - 不要使用引用（如 `$database-url`）
   - 直接設置完整的 Supabase 數據庫連接字符串：
     ```
     DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres
     ```
   - **注意**：需要替換 `[YOUR_PASSWORD]` 為實際的 Supabase 數據庫密碼

---

## ✅ 推薦配置（不需要 DATABASE_URL）

對於 Next.js + Supabase 項目，只需要以下環境變數：

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

**不需要**：
- ❌ `DATABASE_URL`
- ❌ `database-url`

---

## 🚀 修復後部署

修復環境變數後：

1. **返回部署頁面**
2. **修改輸入框**：刪除 URL，輸入 `main`
3. **點擊「建立部署」按鈕**
4. **等待部署完成**

---

## 📋 檢查清單

修復後確認：

- [ ] `DATABASE_URL` 已刪除（或已修復為直接值，不是引用）
- [ ] 所有 Supabase 環境變數都已配置
- [ ] 所有 GLM API 環境變數都已配置
- [ ] 輸入框內容是 `main`（不是 GitHub URL）
- [ ] 點擊「建立部署」按鈕

---

**記住**：我們使用 Supabase，不需要 `DATABASE_URL`！刪除它即可解決錯誤。
