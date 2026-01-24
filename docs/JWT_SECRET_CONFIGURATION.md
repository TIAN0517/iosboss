# Supabase JWT Secret 配置指南

## 🔑 您提供的 JWT Secret

```
JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==
```

## 📋 JWT Secret 說明

**JWT Secret** 是 Supabase 用來簽署和驗證 JSON Web Tokens (JWT) 的密鑰。

### 用途
- ✅ 簽署用戶認證令牌
- ✅ 驗證 API 請求的合法性
- ✅ 保護 Supabase Auth 功能

### 重要性
- ⚠️ **高度敏感**：請勿公開分享
- ⚠️ **不要提交到 Git**：應保存在 `.env` 文件中
- ⚠️ **定期輪換**：建議定期更換以提高安全性

---

## 🔧 配置步驟

### 步驟 1：添加到 .env 文件

在 `.env` 文件中添加以下配置：

```env
# ========================================
# Supabase JWT Secret
# ========================================

# JWT Secret（用於簽署和驗證 JWT）
SUPABASE_JWT_SECRET=JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==

# 或者如果使用 Next.js，可能需要：
NEXT_PUBLIC_SUPABASE_JWT_SECRET=JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==
```

**注意**：
- 通常 JWT Secret 不需要在客戶端使用，所以不需要 `NEXT_PUBLIC_` 前綴
- 僅在後端服務器端使用

---

### 步驟 2：在應用程序中使用

#### 後端 API 路由中使用

```typescript
// app/api/auth/verify/route.ts
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const jwtSecret = process.env.SUPABASE_JWT_SECRET

export async function POST(req: Request) {
  const { token } = await req.json()
  
  try {
    // 使用 JWT Secret 驗證令牌
    const decoded = jwt.verify(token, jwtSecret)
    
    // 或者使用 Supabase 客戶端驗證
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error) {
      return new Response(
        JSON.stringify({ error: 'Token 驗證失敗' }),
        { status: 401 }
      )
    }
    
    return new Response(
      JSON.stringify({ user, decoded }),
      { status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Token 無效' }),
      { status: 401 }
    )
  }
}
```

---

### 步驟 3：驗證配置

創建驗證腳本 `scripts/verify-jwt-secret.js`：

```javascript
require('dotenv').config()

const jwtSecret = process.env.SUPABASE_JWT_SECRET

if (!jwtSecret) {
  console.error('❌ SUPABASE_JWT_SECRET 未設置')
  process.exit(1)
}

console.log('✅ JWT Secret 已配置')
console.log(`   長度: ${jwtSecret.length} 字符`)
console.log(`   前綴: ${jwtSecret.substring(0, 10)}...`)

// 驗證格式（Base64）
const base64Regex = /^[A-Za-z0-9+/=]+$/
if (base64Regex.test(jwtSecret)) {
  console.log('✅ JWT Secret 格式正確 (Base64)')
} else {
  console.log('⚠️  JWT Secret 格式可能不正確')
}
```

執行驗證：
```bash
node scripts/verify-jwt-secret.js
```

---

## 🔐 安全建議

### 1. 密鑰管理

- ✅ 保存在 `.env` 文件中
- ✅ 添加到 `.gitignore`（確保不會提交到 Git）
- ✅ 使用環境變量注入（生產環境）
- ❌ 不要硬編碼在代碼中
- ❌ 不要提交到版本控制系統

### 2. 密鑰輪換

從您提供的圖片來看，Supabase 支持密鑰輪換：

1. **創建備用密鑰**：
   - 在 Supabase Dashboard 中點擊「建立備用密鑰」
   - 等待所有應用組件識別新密鑰

2. **旋轉密鑰**：
   - 點擊「旋轉鍵」按鈕
   - 新密鑰將成為當前密鑰

3. **撤銷舊密鑰**：
   - 等待所有令牌過期後
   - 撤銷之前使用過的密鑰

### 3. 監控和日誌

- 定期檢查 Supabase Dashboard 中的 JWT 使用情況
- 監控異常的認證請求
- 設置警報通知

---

## 📝 完整配置示例

### .env 文件配置

```env
# ========================================
# Supabase 完整配置
# ========================================

# Supabase 專案 URL
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co

# Supabase Anon Key（用於前端）
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbWx0a3NicGR5bmRvaXNucWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTM0NDYsImV4cCI6MjA4MjU4OTQ0Nn0.7-xtopwRK9-Bq04hb4Ntftz5EaSQiyNtX4Yd6m_LizM

# Supabase Service Role Key（用於後端）
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2

# Supabase JWT Secret（用於簽署和驗證 JWT）
SUPABASE_JWT_SECRET=JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==
```

---

## 🎯 配置檢查清單

完成以下檢查：

- [ ] JWT Secret 已添加到 `.env` 文件
- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] 應用程序已配置使用 JWT Secret
- [ ] 驗證腳本執行成功
- [ ] 生產環境使用環境變量注入（而非硬編碼）

---

## 📞 需要幫助？

如果在配置過程中遇到問題：

1. **查看 Supabase 文檔**：
   - JWT 配置：https://supabase.com/docs/guides/auth/jwts
   - 密鑰管理：https://supabase.com/docs/guides/auth/jwts/managing-signing-keys

2. **Supabase Dashboard**：
   - JWT 密鑰管理：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/settings/auth
   - 查看當前密鑰狀態

3. **項目文檔**：
   - 完整配置指南：`COMPLETE_SETUP_SUMMARY.md`
   - Supabase 配置：`docs/SUPABASE_CONFIGURATION_GUIDE.md`

---

**配置完成日期**：2025-12-29  
**配置狀態**：待添加到 .env 文件
