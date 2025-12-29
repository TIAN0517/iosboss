# .env 文件配置檢查指南

## ✅ Supabase 配置正確格式

### 標準配置格式

```env
# ========================================
# Supabase 配置
# ========================================

# Supabase 專案 URL
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co

# Supabase Anon Key（公開金鑰，用於前端）
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbWx0a3NicGR5bmRvaXNucWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTM0NDYsImV4cCI6MjA4MjU4OTQ0Nn0.7-xtopwRK9-Bq04hb4Ntftz5EaSQiyNtX4Yd6m_LizM

# Supabase Service Role Key（服務角色金鑰，用於後端）
# ⚠️ 重要：此密鑰具有完整權限，請勿在前端使用
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2

# 或者使用新的 Publishable Key（推薦）
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
```

---

## ✅ 配置檢查清單

### 1. URL 格式檢查

**✅ 正確格式：**
```env
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
```

**❌ 錯誤格式：**
```env
# 缺少 https://
NEXT_PUBLIC_SUPABASE_URL=mdmltksbpdyndoisnqhy.supabase.co

# 多了斜線
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co/

# 包含路徑
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co/api
```

---

### 2. Anon Key 格式檢查

**✅ 正確格式：**
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbWx0a3NicGR5bmRvaXNucWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTM0NDYsImV4cCI6MjA4MjU4OTQ0Nn0.7-xtopwRK9-Bq04hb4Ntftz5EaSQiyNtX4Yd6m_LizM
```

**特徵：**
- ✅ 以 `eyJ` 開頭（Base64 編碼的 JWT）
- ✅ 包含三個部分，用 `.` 分隔
- ✅ 長度約 200-300 字符
- ✅ 沒有引號（除非值中包含空格）

**❌ 錯誤格式：**
```env
# 缺少等號
NEXT_PUBLIC_SUPABASE_ANON_KEY eyJhbGc...

# 值被引號包圍（如果值本身沒有空格，不需要引號）
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."

# 值不完整（被截斷）
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

---

### 3. Service Role Key 格式檢查

**✅ 正確格式（新格式）：**
```env
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2
```

**✅ 正確格式（舊格式）：**
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbWx0a3NicGR5bmRvaXNucWh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAxMzQ0NiwiZXhwIjoyMDgyNTg5NDQ2fQ.xxxxx
```

**特徵：**
- ✅ 新格式：以 `sb_secret_` 開頭
- ✅ 舊格式：以 `eyJ` 開頭（JWT 格式）
- ✅ 長度約 50-300 字符
- ✅ 沒有引號（除非值中包含空格）

**❌ 錯誤格式：**
```env
# 值為空
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=

# 值為占位符（未替換）
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=****

# 值不完整
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW...
```

---

### 4. Publishable Key 格式檢查（可選）

**✅ 正確格式：**
```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
```

**特徵：**
- ✅ 以 `sb_publishable_` 開頭
- ✅ 長度約 50-100 字符
- ✅ 可以安全地在前端使用

---

## 🔍 常見配置錯誤

### 錯誤 1：變數名稱錯誤

**❌ 錯誤：**
```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

**✅ 正確：**
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**說明：** Next.js 需要 `NEXT_PUBLIC_` 前綴才能在客戶端訪問。

---

### 錯誤 2：值包含空格或特殊字符

**❌ 錯誤：**
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (請替換為實際值)
```

**✅ 正確：**
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**說明：** 值不應包含註釋或額外的空格。

---

### 錯誤 3：使用引號不當

**❌ 錯誤：**
```env
NEXT_PUBLIC_SUPABASE_URL="https://mdmltksbpdyndoisnqhy.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."
```

**✅ 正確：**
```env
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**說明：** 如果值本身不包含空格，不需要引號。只有在值包含空格時才需要引號。

---

### 錯誤 4：缺少必要的變數

**❌ 錯誤：**
```env
# 只有 URL，沒有 Key
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
```

**✅ 正確：**
```env
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**說明：** 至少需要 URL 和 Anon Key 才能連接 Supabase。

---

## 🧪 配置驗證方法

### 方法 1：使用 Node.js 腳本驗證

創建 `scripts/verify-env.js`：

```javascript
// scripts/verify-env.js
require('dotenv').config();

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const optionalVars = [
  'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
];

console.log('🔍 檢查環境變數配置...\n');

// 檢查必需的變數
let hasErrors = false;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.error(`❌ ${varName}: 未設置`);
    hasErrors = true;
  } else if (value.includes('****') || value.includes('your_') || value.trim() === '') {
    console.error(`❌ ${varName}: 值為占位符或空值`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}: 已設置 (長度: ${value.length})`);
  }
});

// 檢查可選變數
console.log('\n📋 可選變數：');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value && !value.includes('****') && value.trim() !== '') {
    console.log(`✅ ${varName}: 已設置 (長度: ${value.length})`);
  } else {
    console.log(`⚠️  ${varName}: 未設置（可選）`);
  }
});

// 驗證 URL 格式
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url) {
  try {
    new URL(url);
    console.log(`\n✅ URL 格式正確: ${url}`);
  } catch (e) {
    console.error(`\n❌ URL 格式錯誤: ${url}`);
    hasErrors = true;
  }
}

// 驗證 Anon Key 格式
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (anonKey) {
  if (anonKey.startsWith('eyJ') && anonKey.split('.').length === 3) {
    console.log(`✅ Anon Key 格式正確 (JWT)`);
  } else if (anonKey.startsWith('sb_publishable_')) {
    console.log(`✅ Anon Key 格式正確 (Publishable Key)`);
  } else {
    console.error(`❌ Anon Key 格式不正確`);
    hasErrors = true;
  }
}

// 驗證 Service Role Key 格式
const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey) {
  if (serviceKey.startsWith('sb_secret_')) {
    console.log(`✅ Service Role Key 格式正確 (新格式)`);
  } else if (serviceKey.startsWith('eyJ') && serviceKey.split('.').length === 3) {
    console.log(`✅ Service Role Key 格式正確 (舊格式 JWT)`);
  } else {
    console.error(`❌ Service Role Key 格式不正確`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.log('\n❌ 配置檢查失敗，請修復上述錯誤');
  process.exit(1);
} else {
  console.log('\n✅ 所有配置檢查通過！');
  process.exit(0);
}
```

**執行驗證：**
```bash
node scripts/verify-env.js
```

---

### 方法 2：在代碼中測試連接

創建 `scripts/test-supabase-connection.js`：

```javascript
// scripts/test-supabase-connection.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少必要的環境變數');
  console.error('請設置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 測試 Supabase 連接...\n');
  
  try {
    // 測試查詢 User 表
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ 連接失敗：', error.message);
      console.error('詳細錯誤：', error);
      process.exit(1);
    }
    
    console.log('✅ 連接成功！');
    console.log(`📊 查詢結果：找到 ${data.length} 條記錄`);
    
    if (data.length > 0) {
      console.log('👤 示例數據：', JSON.stringify(data[0], null, 2));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 發生錯誤：', err.message);
    process.exit(1);
  }
}

testConnection();
```

**執行測試：**
```bash
node scripts/test-supabase-connection.js
```

---

## 📋 配置檢查清單

在提交或部署前，請確認：

- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已設置且格式正確
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已設置且格式正確
- [ ] `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` 已設置（如果需要在後端使用）
- [ ] 所有值都不包含占位符（如 `****`、`your_xxx`）
- [ ] 所有值都不包含註釋或額外的空格
- [ ] URL 以 `https://` 開頭
- [ ] Anon Key 是完整的 JWT 或 Publishable Key
- [ ] Service Role Key 是完整的 Secret Key 或 JWT
- [ ] `.env` 文件已添加到 `.gitignore`（不會提交到 Git）

---

## 🚨 安全提醒

1. **不要提交 `.env` 到 Git**
   - 確保 `.env` 在 `.gitignore` 中
   - 使用 `.env.example` 作為模板

2. **Service Role Key 安全**
   - ❌ 不要在前端代碼中使用
   - ❌ 不要提交到 Git
   - ✅ 僅在後端 API 中使用

3. **定期更換密鑰**
   - 如果密鑰洩露，立即在 Supabase Dashboard 中重新生成

---

## 📞 需要幫助？

如果配置仍有問題，請：
1. 檢查 Supabase Dashboard：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/settings/api
2. 查看 Supabase 文檔：https://supabase.com/docs/guides/getting-started/local-development#environment-variables
3. 運行驗證腳本：`node scripts/verify-env.js`

---

**配置檢查完成！** ✅
