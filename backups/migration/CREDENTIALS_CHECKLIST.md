# 🔑 九九瓦斯行管理系統 - 遷移憑證檢查清單

## 📋 必需憑證（必須配置）

### 1. Supabase API 金鑰 ⭐ 必需

#### 獲取方式：
1. 訪問 Supabase Dashboard：
   ```
   https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/settings/api
   ```

2. 複製以下金鑰：

#### ✅ 已提供的憑證：
- **Publishable Key**: `sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ`
- **Secret Key**: `sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2`
- **Legacy Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbWx0a3NicGR5bmRvaXNucWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTM0NDYsImV4cCI6MjA4MjU4OTQ0Nn0.7xtopwRK9-Bq04hb4Ntftz5EaSQiyNtX4Yd6m_LizM`

#### ⚠️ 還需要：
- **Service Role Key**: 請從 Supabase Dashboard 獲取（用於服務器端操作）

---

## 📋 可選憑證（功能相關）

### 2. GLM API 金鑰（AI 功能）

**用途**：AI 對話、智能助手功能

**獲取方式**：
1. 訪問：https://open.bigmodel.cn/usercenter/apikeys
2. 登入或註冊帳號
3. 創建新的 API Key
4. 複製 API Key

**配置**：
```env
GLM_API_KEYS=key1,key2,key3
GLM_API_KEY=key1
```

**狀態**：⚠️ 未配置（可選）

---

### 3. LINE Bot 憑證（LINE Bot 功能）

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

**狀態**：⚠️ 未配置（可選）

---

### 4. Azure TTS 金鑰（語音功能）

**用途**：文字轉語音、語音回覆

**獲取方式**：
1. 訪問：https://portal.azure.com/
2. 創建語音服務資源
3. 複製 API Key

**配置**：
```env
AZURE_TTS_KEY=your_azure_tts_key
AZURE_TTS_REGION=eastasia
```

**狀態**：⚠️ 未配置（可選）

---

### 5. Deepgram API 金鑰（語音識別）

**用途**：語音轉文字、實時語音識別

**獲取方式**：
1. 訪問：https://console.deepgram.com/
2. 註冊帳號並創建 API Key
3. 複製 API Key

**配置**：
```env
DEEPGRAM_API_KEY=your_deepgram_api_key
```

**狀態**：⚠️ 未配置（可選）

---

## 🔧 配置方式

### 方法 1：環境變量（推薦）

#### Windows PowerShell：
```powershell
$env:SUPABASE_ANON_KEY="sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ"
$env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2"
$env:GLM_API_KEYS="your_glm_key1,your_glm_key2"
```

#### Linux/Mac Bash：
```bash
export SUPABASE_ANON_KEY="sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ"
export SUPABASE_SERVICE_ROLE_KEY="sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2"
export GLM_API_KEYS="your_glm_key1,your_glm_key2"
```

### 方法 2：.env 文件（開發環境）

創建 `.env.local` 文件：
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2

# GLM AI
GLM_API_KEYS=your_glm_key1,your_glm_key2

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret

# Azure TTS
AZURE_TTS_KEY=your_azure_key
AZURE_TTS_REGION=eastasia

# Deepgram
DEEPGRAM_API_KEY=your_deepgram_key
```

### 方法 3：Vercel 環境變量（生產環境）

1. 訪問 Vercel Dashboard
2. 進入項目設置 → Environment Variables
3. 添加所有需要的環境變量

---

## ✅ 憑證檢查腳本

### 使用自動化腳本檢查：

#### Windows PowerShell：
```powershell
.\scripts\auto-migrate-to-supabase.ps1
```

#### Node.js：
```bash
node scripts/auto-migrate-to-supabase.js
```

---

## 📊 當前憑證狀態

| 憑證名稱 | 狀態 | 用途 |
|---------|------|------|
| **Supabase URL** | ✅ 已配置 | 數據庫連接 |
| **Supabase Publishable Key** | ✅ 已配置 | 客戶端操作 |
| **Supabase Secret Key** | ✅ 已配置 | 服務器端操作 |
| **Supabase Legacy Anon Key** | ✅ 已配置 | 兼容性 |
| **GLM API Keys** | ⚠️ 未配置 | AI 功能（可選） |
| **LINE Channel Token** | ⚠️ 未配置 | LINE Bot（可選） |
| **LINE Channel Secret** | ⚠️ 未配置 | LINE Bot（可選） |
| **Azure TTS Key** | ⚠️ 未配置 | 語音功能（可選） |
| **Deepgram API Key** | ⚠️ 未配置 | 語音識別（可選） |

---

## 🚀 下一步

1. **配置 Supabase Service Role Key**（如果還沒有）
   - 訪問：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/settings/api
   - 複製 Service Role Key

2. **運行自動化檢查腳本**
   ```powershell
   .\scripts\auto-migrate-to-supabase.ps1
   ```

3. **導入數據到 Supabase**
   - 使用 Supabase SQL Editor
   - 或使用自動化導入腳本

4. **配置可選憑證**（如果需要對應功能）
   - GLM API Keys（AI 功能）
   - LINE Bot 憑證（LINE Bot 功能）
   - Azure TTS Key（語音功能）
   - Deepgram API Key（語音識別）

---

## 📝 注意事項

1. **安全性**：
   - ⚠️ 不要將 `.env` 文件提交到 Git
   - ⚠️ Service Role Key 具有管理員權限，請謹慎使用
   - ⚠️ 生產環境請使用強密碼

2. **憑證輪換**：
   - 定期更新 API 金鑰
   - 如果憑證洩露，立即重新生成

3. **備份**：
   - 保存憑證到安全的地方
   - 使用密碼管理器存儲

---

Made with ❤️ by BossJy-99 Team
