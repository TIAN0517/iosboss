# 🔑 九九瓦斯行管理系統 - 需要的憑證清單

## ✅ 已提供的憑證

### Supabase API 金鑰

1. **Publishable Key** (已提供)
   ```
   sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
   ```

2. **Secret Key** (已提供)
   ```
   sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2
   ```

3. **Legacy Anon Key** (已提供)
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbWx0a3NicGR5bmRvaXNucWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTM0NDYsImV4cCI6MjA4MjU4OTQ0Nn0.7xtopwRK9-Bq04hb4Ntftz5EaSQiyNtX4Yd6m_LizM
   ```

---

## ⚠️ 還需要的憑證

### 1. Supabase Service Role Key（必需）⭐

**用途**：服務器端操作、數據導入

**獲取方式**：
1. 訪問：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/settings/api
2. 在 "Project API keys" 區域找到 "service_role" key
3. 點擊 "Reveal" 顯示完整 key
4. 複製完整的 key

**配置**：
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

### 2. Supabase 數據庫密碼（必需）⭐

**用途**：數據庫連接字符串

**獲取方式**：
1. 訪問：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/settings/database
2. 在 "Database password" 區域
3. 如果忘記密碼，點擊 "Reset database password"
4. 複製新密碼（請妥善保存）

**配置**：
```env
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR_PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres
```

---

### 3. GLM API Keys（可選 - AI 功能）

**用途**：AI 對話、智能助手

**獲取方式**：
1. 訪問：https://open.bigmodel.cn/usercenter/apikeys
2. 登入或註冊
3. 創建新的 API Key
4. 複製 API Key（可以創建多個，用逗號分隔）

**配置**：
```env
GLM_API_KEYS=key1,key2,key3
GLM_API_KEY=key1
```

---

### 4. LINE Bot 憑證（可選 - LINE Bot 功能）

**用途**：LINE Bot 對話、群組管理

**獲取方式**：
1. 訪問：https://developers.line.biz/
2. 創建 Provider 和 Channel
3. 複製 Channel Access Token 和 Channel Secret

**配置**：
```env
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
```

---

### 5. Azure TTS Key（可選 - 語音功能）

**用途**：文字轉語音

**獲取方式**：
1. 訪問：https://portal.azure.com/
2. 創建語音服務資源
3. 複製 API Key

**配置**：
```env
AZURE_TTS_KEY=your_azure_tts_key
AZURE_TTS_REGION=eastasia
```

---

### 6. Deepgram API Key（可選 - 語音識別）

**用途**：語音轉文字

**獲取方式**：
1. 訪問：https://console.deepgram.com/
2. 註冊並創建 API Key
3. 複製 API Key

**配置**：
```env
DEEPGRAM_API_KEY=your_deepgram_api_key
```

---

## 📋 憑證優先級

### 必需憑證（遷移必須）⭐

1. ✅ Supabase Publishable Key - **已提供**
2. ✅ Supabase Secret Key - **已提供**
3. ⚠️ **Supabase Service Role Key** - **需要提供**
4. ⚠️ **Supabase 數據庫密碼** - **需要提供**

### 可選憑證（功能相關）

- GLM API Keys（AI 功能）
- LINE Bot 憑證（LINE Bot 功能）
- Azure TTS Key（語音功能）
- Deepgram API Key（語音識別）

---

## 🔧 快速配置

### 設置環境變量（Windows PowerShell）

```powershell
# 必需憑證
$env:SUPABASE_ANON_KEY = "sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ"
$env:SUPABASE_SERVICE_ROLE_KEY = "請從 Supabase Dashboard 獲取"
$env:DATABASE_PASSWORD = "請從 Supabase Dashboard 獲取"

# 可選憑證
$env:GLM_API_KEYS = "your_glm_key1,your_glm_key2"
$env:LINE_CHANNEL_ACCESS_TOKEN = "your_line_token"
$env:LINE_CHANNEL_SECRET = "your_line_secret"
```

### 創建 .env.local 文件

```env
# 必需配置
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
SUPABASE_SERVICE_ROLE_KEY=請從 Supabase Dashboard 獲取
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.mdmltksbpdyndoisnqhy.supabase.co:5432/postgres

# 可選配置
GLM_API_KEYS=your_glm_key1,your_glm_key2
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret
```

---

## ✅ 下一步

1. **獲取 Supabase Service Role Key**
   - 訪問：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/settings/api
   - 複製 service_role key

2. **獲取 Supabase 數據庫密碼**
   - 訪問：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/settings/database
   - 複製或重置數據庫密碼

3. **運行自動化遷移腳本**
   ```powershell
   .\scripts\complete-migration.ps1
   ```

4. **導入數據到 Supabase**
   - 使用 Supabase SQL Editor
   - 文件：`backups/migration/gas-management-20251229-222610.sql`

---

## 📝 注意事項

1. **安全性**：
   - ⚠️ 不要將憑證提交到 Git
   - ⚠️ Service Role Key 具有管理員權限，請謹慎使用
   - ⚠️ 生產環境請使用強密碼

2. **憑證管理**：
   - 使用密碼管理器存儲憑證
   - 定期更新 API 金鑰
   - 如果憑證洩露，立即重新生成

---

Made with ❤️ by BossJy-99 Team
