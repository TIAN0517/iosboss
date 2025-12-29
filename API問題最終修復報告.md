# API 問題最終修復報告

## 🔍 問題根本原因

### 發現的問題

1. **環境變量優先級衝突** ❌
   - `docker-compose.yml` 中 `environment` 部分的配置會**覆蓋** `env_file` 中的配置
   - `GLM_API_KEYS=${GLM_API_KEYS:-}` 如果 shell 環境變量不存在，會設置為**空字符串**
   - 這會覆蓋 `.env.docker` 文件中的實際值

2. **容器未重新創建** ❌
   - `env_file` 配置只在容器**創建時**生效
   - `restart` 不會重新讀取 `env_file`
   - 需要重新創建容器才能應用 `env_file` 配置

---

## 🔧 修復方案

### 修復 1: 移除 environment 中的 GLM_API_KEYS 和 GLM_API_KEY

**問題**：
```yaml
environment:
  - GLM_API_KEYS=${GLM_API_KEYS:-}  # 如果 shell 環境變量不存在，設置為空字符串
  - GLM_API_KEY=${GLM_API_KEY:-}   # 這會覆蓋 env_file 中的值
```

**修復**：
```yaml
environment:
  # GLM_API_KEYS 和 GLM_API_KEY 從 .env.docker 文件讀取
  # 不在這裡設置以避免覆蓋 env_file 中的值
  - GLM_MODEL=${GLM_MODEL:-glm-4.7-coding-max}
  - NEXT_AI_PROVIDER=${NEXT_AI_PROVIDER:-glm-commercials}
  # ... 其他配置
```

### 修復 2: 重新創建容器

**命令**：
```bash
# 方法 1: 強制重新創建（推薦）
docker-compose up -d --force-recreate app

# 方法 2: 完全重啟
docker-compose down
docker-compose up -d
```

---

## 📋 Docker Compose 環境變量優先級

### 優先級順序（從高到低）

1. **`environment` 中的顯式設置**（最高優先級）
   ```yaml
   environment:
     - GLM_API_KEYS=value1  # 這個會覆蓋 env_file 中的值
   ```

2. **`environment` 中的變量引用**
   ```yaml
   environment:
     - GLM_API_KEYS=${GLM_API_KEYS:-default}  # 如果 shell 環境變量不存在，使用 default
   ```

3. **`env_file` 中的配置**（較低優先級）
   ```yaml
   env_file:
     - .env.docker  # 這個會被 environment 覆蓋
   ```

4. **Shell 環境變量**（最低優先級）

### 最佳實踐

- ✅ **使用 `env_file` 管理敏感信息**（API Keys、密碼等）
- ✅ **不要在 `environment` 中重複設置 `env_file` 中的變量**
- ✅ **使用 `environment` 設置默認值或非敏感配置**

---

## ✅ 驗證步驟

### 步驟 1: 應用修復

修復已完成：
- ✅ 移除了 `environment` 中對 `GLM_API_KEYS` 和 `GLM_API_KEY` 的設置
- ✅ 保留了 `env_file` 配置

### 步驟 2: 重新創建容器

```bash
docker-compose up -d --force-recreate app
```

### 步驟 3: 驗證環境變量

```bash
docker exec jyt-gas-app sh -c "printenv | grep GLM_"
```

**預期輸出**：
```
GLM_API_KEYS=26cd829bd2b44c6f8ae8...（有實際值，不是空字符串）
GLM_API_KEY=26cd829bd2b44c6f8ae8...（有實際值，不是空字符串）
GLM_MODEL=glm-4-flash
GLM_ENABLE_STREAMING=true
GLM_TIMEOUT=60000
NEXT_AI_PROVIDER=glm-commercials
```

### 步驟 4: 檢查應用日誌

```bash
docker logs --tail 50 jyt-gas-app | grep -i "ai\|glm\|provider\|初始化"
```

**預期輸出**：
```
[統一 AI 提供商] 已初始化 GLM 商業版 (增強): 多個 Keys=3
[多 Key GLM Provider] 已初始化，共 3 個 Key
```

### 步驟 5: 測試 AI API

1. 打開應用界面
2. 進入 AI 助手功能
3. 發送測試消息（例如："你好"）
4. 檢查響應：
   - ✅ 應該看到 `Available: true`
   - ✅ 應該收到實際的 AI 響應（不是本地回退）

---

## 🎯 修復效果

### 修復前
- ❌ `environment` 中的空字符串覆蓋 `env_file` 中的值
- ❌ 環境變量在容器內為空
- ❌ AI Provider 不可用

### 修復後（預期）
- ✅ `env_file` 中的值正確傳遞到容器
- ✅ 環境變量在容器內有實際值
- ✅ AI Provider 可用
- ✅ API 請求成功

---

## 📝 相關文件

- `docker-compose.yml` - Docker Compose 配置（已修復）
- `.env.docker` - 環境變量文件（包含 API Keys）
- `src/lib/ai-provider-unified.ts` - AI Provider 初始化邏輯
- `src/app/api/ai/chat/route.ts` - API 路由處理

---

## ✅ 修復完成

**修復時間**：2025-12-29 09:00

**修復狀態**：✅ 已完成

**下一步**：請重新創建容器並驗證修復效果。
