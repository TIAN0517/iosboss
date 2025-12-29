# ⚡ 快速修復部署錯誤

## ❌ 錯誤

```
環境變數"DATABASE_URL"引用了不存在的金鑰"database-url"。
```

## ✅ 快速修復（2 步）

### 步驟 1：刪除 DATABASE_URL（1 分鐘）

1. **在 Vercel Dashboard 中**：
   - 點擊「取消」關閉部署彈窗
   - 進入「Settings」→「Environment Variables」
   - 找到 `DATABASE_URL` 環境變數
   - **點擊刪除按鈕**（右側的減號圖標）

### 步驟 2：重新部署（1 分鐘）

1. **返回部署頁面**
2. **點擊「建立部署」**
3. **修改輸入框**：刪除 URL，輸入 `main`
4. **點擊「建立部署」按鈕**
5. **完成！** 🎉

---

## 💡 為什麼要刪除？

**我們使用 Supabase**，所以：
- ✅ 不需要 `DATABASE_URL`（直接數據庫連接）
- ✅ 使用 Supabase API（通過 `NEXT_PUBLIC_SUPABASE_URL`）

---

## ✅ 需要的環境變數

確保以下環境變數存在（不需要 DATABASE_URL）：

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
GLM_API_KEYS
GLM_API_KEY
```

---

**就是這麼簡單！刪除 DATABASE_URL，然後重新部署即可！** 🚀
