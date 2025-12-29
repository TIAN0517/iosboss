# API 問題修復報告

## 📊 問題診斷

### 問題現象
- AI Provider 顯示 `Available: false`
- API 請求使用本地回退模式
- 容器內環境變量為空或只有 2 個字符

### 根本原因
**環境變量未正確傳遞到 Docker 容器**

1. **`.env.docker` 文件存在** ✅
   - 包含 `GLM_API_KEYS` 和 `GLM_API_KEY`
   - 包含其他必要的配置

2. **`app` 服務缺少 `env_file` 配置** ❌
   - `docker-compose.yml` 中只有 `cloudflared` 服務配置了 `env_file`
   - `app` 服務依賴 shell 環境變量，但可能未設置
   - 導致環境變量使用默認值（空字符串）

3. **結果**：
   - `GLM_API_KEYS` 和 `GLM_API_KEY` 為空
   - `apiKeys.length === 0`
   - `isAvailable()` 返回 `false`
   - AI Provider 不可用

---

## 🔧 修復方案

### 修復內容

在 `docker-compose.yml` 的 `app` 服務中添加 `env_file` 配置：

```yaml
app:
  # ... 其他配置 ...
  
  # 明確指定環境變量文件（Windows 兼容）
  env_file:
    - .env.docker
  
  environment:
    # ... 環境變量配置 ...
```

### 修復原理

1. **`env_file` 配置**：
   - Docker Compose 會自動從 `.env.docker` 文件讀取環境變量
   - 優先級：`env_file` > `environment` 中的 `${VAR:-default}`

2. **環境變量傳遞流程**：
   ```
   .env.docker 文件
   ↓
   env_file 配置
   ↓
   Docker 容器環境變量
   ↓
   Next.js 應用 process.env
   ↓
   AI Provider 初始化
   ```

---

## ✅ 修復驗證

### 驗證步驟

1. **重啟 Docker 服務**
   ```bash
   docker-compose restart app
   # 或
   docker-compose up -d app
   ```

2. **檢查環境變量**
   ```bash
   docker exec jyt-gas-app sh -c "printenv | grep GLM_"
   ```
   預期輸出：
   ```
   GLM_API_KEYS=key1,key2,key3
   GLM_API_KEY=key1
   GLM_MODEL=glm-4-flash
   NEXT_AI_PROVIDER=glm-commercials
   ```

3. **檢查應用日誌**
   ```bash
   docker logs --tail 20 jyt-gas-app
   ```
   預期輸出：
   ```
   [統一 AI 提供商] 已初始化 GLM 商業版 (增強): 多個 Keys=3
   [多 Key GLM Provider] 已初始化，共 3 個 Key
   ```

4. **測試 API**
   - 打開應用界面
   - 使用 AI 助手功能
   - 發送測試消息
   - 應該看到 `Available: true` 和實際的 AI 響應

---

## 📋 日誌分析結果

### 假設評估

| 假設 | 狀態 | 證據 |
|------|------|------|
| **A: API 路由請求處理** | ✅ 正常 | 請求正確解析，參數正確 |
| **B: AI Provider 可用性** | ❌ **問題** | `Available: false`，環境變量為空 |
| **C: API 請求執行** | ⏸️ 未執行 | 因為 Provider 不可用，未發送請求 |
| **D: 錯誤處理** | ✅ 正常 | 正確使用本地回退 |
| **E: 環境變量配置** | ❌ **問題** | 環境變量未傳遞到容器 |
| **F: API 請求重試機制** | ⏸️ 未執行 | 因為 Provider 不可用，未發送請求 |

### 關鍵日誌證據

```
=== AI API 收到請求 ===
Message: ping
Provider: GLM 多 Key
Available: false  ← 問題所在
Stream: false
AI 提供商不可用，使用本地回應
```

容器內環境變量檢查：
```
GLM_API_KEYS length: 2  ← 只有 2 個字符（空字符串）
GLM_API_KEY length: 2   ← 只有 2 個字符（空字符串）
NEXT_AI_PROVIDER:       ← 為空
```

---

## 🎯 修復效果

### 修復前
- ❌ AI Provider 不可用
- ❌ 使用本地回退模式
- ❌ 無法調用 GLM API

### 修復後（預期）
- ✅ AI Provider 可用
- ✅ 正確讀取 API Keys
- ✅ 可以調用 GLM API
- ✅ 支持多 Key 輪換

---

## 📝 後續建議

### 1. 環境變量管理
- ✅ 使用 `.env.docker` 文件統一管理環境變量
- ✅ 在 `docker-compose.yml` 中明確配置 `env_file`
- ⚠️ 不要將敏感信息提交到 Git（使用 `.gitignore`）

### 2. 健康檢查
- 考慮添加環境變量驗證的健康檢查
- 確保關鍵環境變量存在且非空

### 3. 日誌監控
- 監控 AI Provider 初始化日誌
- 監控 API 請求成功/失敗率
- 監控環境變量配置狀態

---

## 🔍 相關文件

- `docker-compose.yml` - Docker Compose 配置
- `.env.docker` - 環境變量文件
- `src/lib/ai-provider-unified.ts` - AI Provider 初始化邏輯
- `src/app/api/ai/chat/route.ts` - API 路由處理

---

## ✅ 修復完成

**修復時間**：2025-12-29 01:00

**修復狀態**：✅ 已完成

**下一步**：請重啟 Docker 服務並驗證修復效果。
