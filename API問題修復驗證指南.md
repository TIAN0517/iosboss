# API 問題修復驗證指南

## 🔍 當前狀態

### 已完成的修復
- ✅ 在 `docker-compose.yml` 中添加了 `env_file` 配置
- ✅ `.env.docker` 文件存在且包含正確的環境變量

### 待驗證的問題
- ⚠️ 容器尚未重啟，修復未生效
- ⚠️ 需要重啟容器以應用 `env_file` 配置

---

## 🔧 驗證步驟

### 步驟 1: 重啟 Docker 容器

**方法 1: 僅重啟 app 服務（推薦）**
```bash
docker-compose restart app
```

**方法 2: 完全重啟（如果方法 1 無效）**
```bash
docker-compose down
docker-compose up -d
```

**方法 3: 重新創建容器（最徹底）**
```bash
docker-compose up -d --force-recreate app
```

### 步驟 2: 等待服務啟動

等待約 30-60 秒，確保容器完全啟動。

### 步驟 3: 驗證環境變量

```bash
docker exec jyt-gas-app sh -c "printenv | grep GLM_"
```

**預期輸出**：
```
GLM_API_KEYS=26cd829bd2b44c6f8ae8...（應該有實際值）
GLM_API_KEY=26cd829bd2b44c6f8ae8...（應該有實際值）
GLM_MODEL=glm-4-flash
GLM_ENABLE_STREAMING=true
GLM_TIMEOUT=60000
NEXT_AI_PROVIDER=glm-commercials
```

**如果仍然為空**：
- 檢查 `.env.docker` 文件格式
- 確認文件路徑正確
- 檢查文件權限

### 步驟 4: 檢查應用日誌

```bash
docker logs --tail 50 jyt-gas-app | grep -i "ai\|glm\|provider"
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

## 🐛 故障排除

### 問題 1: 環境變量仍然為空

**可能原因**：
1. 容器未重啟
2. `.env.docker` 文件格式錯誤
3. 文件路徑不正確

**解決方案**：
```bash
# 檢查文件是否存在
ls -la .env.docker

# 檢查文件格式（不應該有前導空格）
cat .env.docker | grep GLM_API_KEYS

# 重新創建容器
docker-compose up -d --force-recreate app
```

### 問題 2: 環境變量有值但應用仍顯示不可用

**可能原因**：
1. 應用未重新初始化
2. 環境變量格式問題（多餘空格、引號等）

**解決方案**：
```bash
# 檢查環境變量格式
docker exec jyt-gas-app sh -c "echo \$GLM_API_KEYS | wc -c"

# 重啟應用（如果支持熱重載）
docker-compose restart app

# 或完全重建
docker-compose up -d --build app
```

### 問題 3: `.env.docker` 文件格式問題

**正確格式**：
```bash
GLM_API_KEYS=key1,key2,key3
GLM_API_KEY=key1
NEXT_AI_PROVIDER=glm-commercials
```

**錯誤格式**：
```bash
# 有前導空格
 GLM_API_KEYS=key1,key2,key3

# 有引號
GLM_API_KEYS="key1,key2,key3"

# 被註釋
# GLM_API_KEYS=key1,key2,key3
```

---

## 📋 驗證檢查清單

- [ ] Docker 容器已重啟
- [ ] 環境變量在容器內有值（不是空字符串）
- [ ] 應用日誌顯示 AI Provider 已初始化
- [ ] API 請求顯示 `Available: true`
- [ ] AI 響應是實際的 API 響應（不是本地回退）

---

## 🎯 成功標誌

修復成功後，您應該看到：

1. **環境變量檢查**：
   ```
   GLM_API_KEYS=26cd829bd2b44c6f8ae8...（有實際值）
   ```

2. **應用日誌**：
   ```
   [統一 AI 提供商] 已初始化 GLM 商業版 (增強): 多個 Keys=3
   ```

3. **API 響應**：
   ```
   Available: true
   Provider: GLM-4.7 多 Key (3 個 Key)
   ```

---

## 📝 下一步

完成驗證後，如果問題已解決：
- ✅ 可以移除調試日誌（如果不再需要）
- ✅ 更新文檔記錄修復過程

如果問題仍然存在：
- 🔍 檢查 `.env.docker` 文件格式
- 🔍 檢查 Docker Compose 配置
- 🔍 檢查應用初始化邏輯
