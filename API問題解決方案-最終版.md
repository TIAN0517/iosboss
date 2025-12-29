# API 問題解決方案 - 最終版

## 🔍 問題診斷總結

### 關鍵發現

1. **調試日誌顯示**：
   - `hasGLM_API_KEYS: true` ✅
   - `hasGLM_API_KEY: true` ✅
   - `apiKeysCount: 3` ✅（在 `initializeProvider` 中）
   - 成功創建 `MultiKeyGLMProvider` ✅

2. **容器內環境變量檢查**：
   - `GLM_API_KEYS` 長度為 2（空字符串）❌

3. **容器狀態**：
   - 容器未重新構建（啟動時間：68.6 分鐘前）❌

### 問題分析

**Next.js 在 standalone 模式下的環境變量處理**：

Next.js 在構建時會將環境變量內嵌到代碼中，但**服務器端環境變量**（不以 `NEXT_PUBLIC_` 開頭）應該在**運行時**從 `process.env` 讀取。

**當前情況**：
- 應用在運行時能讀取到環境變量（可能是構建時內嵌的，或者從其他地方讀取的）
- 但容器內環境變量為空（`env_file` 配置未生效，因為容器未重新創建）

---

## 🔧 完整解決方案

### 步驟 1: 確保容器重新創建

**必須執行**，因為：
1. `env_file` 配置只在容器創建時生效
2. 新的調試日誌需要重新構建才能看到

```bash
# 方法 1: 強制重新構建和創建（推薦）
docker-compose build app
docker-compose up -d --force-recreate app

# 方法 2: 完全重啟（如果方法 1 無效）
docker-compose down
docker-compose up -d --build

# 方法 3: 刪除並重建（最徹底）
docker-compose rm -f app
docker-compose build app
docker-compose up -d app
```

### 步驟 2: 驗證環境變量傳遞

```bash
# 檢查容器內環境變量
docker exec jyt-gas-app sh -c "printenv | grep GLM_"

# 應該看到實際值（不是空字符串）
```

### 步驟 3: 檢查應用日誌

```bash
# 查看詳細的調試日誌
docker logs --tail 100 jyt-gas-app | grep -i "初始化\|MultiKey\|apiKeys\|過濾\|GLM_API\|Key 長度"

# 應該看到：
# [初始化] GLM_API_KEYS 原始值長度: 149
# [初始化] 解析後的 apiKeys 數量: 3
# [MultiKeyGLMProvider] 接收到的 apiKeys 數量: 3
# [多 Key GLM Provider] 已初始化，共 3 個 Key
```

### 步驟 4: 測試 AI API

1. 打開應用界面
2. 進入 AI 助手功能
3. 發送測試消息（例如："你好"）
4. 檢查響應：
   - ✅ 應該看到 `Available: true`
   - ✅ 應該收到實際的 AI 響應（不是本地回退）

---

## 📋 已完成的修復

### 1. Docker Compose 配置修復
- ✅ 添加了 `env_file` 配置
- ✅ 移除了 `environment` 中對 `GLM_API_KEYS` 和 `GLM_API_KEY` 的設置

### 2. 環境變量解析增強
- ✅ 增強了環境變量解析邏輯（過濾過短的 key）
- ✅ 添加了詳細的調試日誌

### 3. 錯誤處理增強
- ✅ 在構造函數中添加了警告日誌
- ✅ 記錄過濾掉的無效 keys

---

## 🎯 預期結果

修復後應該看到：

1. **環境變量檢查**：
   ```
   GLM_API_KEYS=26cd829bd2b44c6f8ae8...（有實際值，長度 > 100）
   ```

2. **應用日誌**：
   ```
   [初始化] GLM_API_KEYS 原始值長度: 149
   [初始化] 解析後的 apiKeys 數量: 3
   [MultiKeyGLMProvider] 接收到的 apiKeys 數量: 3
   [多 Key GLM Provider] 已初始化，共 3 個 Key
   ```

3. **API 響應**：
   ```
   Available: true
   Provider: GLM-4.7 多 Key (3 個 Key)
   ```

---

## ⚠️ 重要提示

### Next.js 環境變量處理

- **客戶端環境變量**（`NEXT_PUBLIC_*`）：在構建時內嵌到代碼中
- **服務器端環境變量**（如 `GLM_API_KEYS`）：在運行時從 `process.env` 讀取

**這意味著**：
- ✅ 服務器端環境變量可以在運行時通過 `env_file` 傳遞
- ✅ 不需要重新構建 Docker 映像（但需要重新創建容器）
- ✅ 只需要重新創建容器即可應用 `env_file` 配置

### Docker Compose 環境變量優先級

1. **`environment` 中的顯式設置**（最高優先級）
2. **`environment` 中的變量引用**（如 `${VAR:-default}`）
3. **`env_file` 中的配置**（較低優先級）
4. **Shell 環境變量**（最低優先級）

**當前配置**：
- ✅ 已移除 `environment` 中對 `GLM_API_KEYS` 和 `GLM_API_KEY` 的設置
- ✅ 使用 `env_file` 從 `.env.docker` 讀取
- ✅ 其他 GLM 配置（如 `GLM_MODEL`）保留在 `environment` 中

---

## 📝 相關文件

- `docker-compose.yml` - Docker Compose 配置（已修復）
- `.env.docker` - 環境變量文件（包含 API Keys）
- `src/lib/ai-provider-unified.ts` - AI Provider 初始化邏輯（已增強）
- `src/app/api/ai/chat/route.ts` - API 路由處理

---

## ✅ 修復狀態

**修復時間**：2025-12-29 09:20

**修復狀態**：✅ 配置和代碼已修復，等待容器重新構建

**下一步**：請執行 `docker-compose build app && docker-compose up -d --force-recreate app` 重新構建容器。
