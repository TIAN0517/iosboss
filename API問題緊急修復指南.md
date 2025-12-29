# API 問題緊急修復指南

## 🚨 當前狀態

### 已完成的修復
- ✅ Docker 映像已重新構建（09:21:09，包含新的調試日誌）
- ✅ `docker-compose.yml` 配置已修復（添加了 `env_file`）
- ✅ 代碼已增強（添加了詳細調試日誌）

### 待執行的操作
- ❌ **容器未重新創建**（這是關鍵問題！）
- ❌ 容器內環境變量為空（因為 `env_file` 配置未應用）

---

## 🔧 立即執行

### 方法 1: 強制重新創建容器（推薦）

```bash
docker-compose up -d --force-recreate app
```

**這會**：
- 停止當前容器
- 使用新構建的映像創建新容器
- 應用 `env_file` 配置
- 從 `.env.docker` 讀取環境變量

### 方法 2: 完全重啟（如果方法 1 無效）

```bash
docker-compose down
docker-compose up -d
```

**這會**：
- 停止所有服務
- 刪除所有容器
- 使用新映像重新創建所有容器
- 應用所有配置

### 方法 3: 刪除並重建（最徹底）

```bash
docker-compose rm -f app
docker-compose up -d app
```

---

## ✅ 驗證步驟

### 步驟 1: 檢查容器狀態

```bash
docker ps --filter "name=jyt-gas-app" --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"
```

**預期**：容器創建時間應該是最近幾分鐘

### 步驟 2: 檢查環境變量

```bash
docker exec jyt-gas-app sh -c "printenv | grep GLM_"
```

**預期輸出**：
```
GLM_API_KEYS=26cd829bd2b44c6f8ae8...（長度 > 100）
GLM_API_KEY=26cd829bd2b44c6f8ae8...（長度 > 40）
GLM_MODEL=glm-4-flash
GLM_ENABLE_STREAMING=true
GLM_TIMEOUT=60000
NEXT_AI_PROVIDER=glm-commercials
```

### 步驟 3: 檢查應用日誌

```bash
docker logs --tail 100 jyt-gas-app | grep -i "初始化\|MultiKey\|apiKeys\|過濾\|GLM_API\|Key 長度\|接收到的\|原始值"
```

**預期輸出**：
```
[初始化] GLM_API_KEYS 原始值長度: 149
[初始化] 解析後的 apiKeys 數量: 3
[初始化] 第一個 key 長度: 49
[MultiKeyGLMProvider] 接收到的 apiKeys 數量: 3
[MultiKeyGLMProvider] 第一個 key 長度: 49
[多 Key GLM Provider] 已初始化，共 3 個 Key
```

### 步驟 4: 測試 AI API

1. 打開應用界面
2. 進入 AI 助手功能
3. 發送測試消息（例如："你好"）
4. 檢查響應：
   - ✅ 應該看到 `Available: true`
   - ✅ 應該收到實際的 AI 響應（不是本地回退）

---

## ⚠️ 為什麼必須重新創建容器？

### Docker 映像 vs 容器

- **映像（Image）**：已構建的應用代碼和依賴
- **容器（Container）**：從映像運行的實例

### 關鍵點

1. **重新構建映像** ≠ **重新創建容器**
   - 重新構建映像只是更新了代碼
   - 但容器仍在運行舊的實例

2. **`env_file` 配置只在容器創建時生效**
   - 如果容器未重新創建，`env_file` 配置不會應用
   - 環境變量不會更新

3. **`restart` 不會重新創建容器**
   - `restart` 只是重啟現有容器
   - 不會應用新的環境變量配置

### 解決方案

**必須使用 `--force-recreate` 或 `down/up`**：
- `--force-recreate`：強制重新創建容器
- `down/up`：完全重啟，確保使用新映像

---

## 📋 檢查清單

### 修復前
- [ ] Docker 映像已重新構建（✅ 已完成）
- [ ] `docker-compose.yml` 配置已修復（✅ 已完成）
- [ ] 代碼已增強（✅ 已完成）

### 修復後（需要驗證）
- [ ] 容器已重新創建（啟動時間是最近幾分鐘）
- [ ] 容器內環境變量有實際值（不是空字符串）
- [ ] 應用日誌顯示詳細的調試信息
- [ ] AI Provider 已初始化（Keys > 0）
- [ ] API 請求顯示 `Available: true`
- [ ] AI 響應是實際的 API 響應（不是本地回退）

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

## 📝 相關文件

- `docker-compose.yml` - Docker Compose 配置（已修復）
- `.env.docker` - 環境變量文件（格式正確）
- `src/lib/ai-provider-unified.ts` - AI Provider 初始化邏輯（已增強）

---

## ✅ 修復狀態

**修復時間**：2025-12-29 09:25

**修復狀態**：
- ✅ 配置和代碼已修復
- ✅ Docker 映像已重新構建
- ⚠️ **等待容器重新創建**

**下一步**：請執行 `docker-compose up -d --force-recreate app` 重新創建容器。
