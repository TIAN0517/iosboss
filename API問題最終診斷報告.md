# API 問題最終診斷報告

## 🔍 問題分析

### 發現的矛盾

1. **調試日誌顯示**：
   - `hasGLM_API_KEYS: true` ✅
   - `hasGLM_API_KEY: true` ✅
   - `apiKeysCount: 3` ✅（在 `initializeProvider` 中）
   - 成功創建 `MultiKeyGLMProvider` ✅

2. **應用日誌顯示**：
   - `[統一 AI 提供商] 已初始化 GLM 商業版 (增強): 多個 Keys=0` ❌
   - `Available: false` ❌

3. **容器環境變量檢查**：
   - `GLM_API_KEYS` 長度為 2（空字符串）❌

### 問題根源

**環境變量在傳遞過程中被過濾掉了**

在 `MultiKeyGLMProvider` 構造函數中：
```typescript
this.config = {
  apiKeys: config.apiKeys.filter(k => k.trim().length > 0),
  // ...
};
```

如果傳入的 `apiKeys` 中的 key 在 `trim()` 後長度為 0，會被過濾掉。

**可能的原因**：
1. 環境變量值包含不可見字符（空格、換行符等）
2. 環境變量值在傳遞過程中損壞
3. 環境變量格式問題（引號、轉義字符等）

---

## 🔧 修復方案

### 方案 1: 增強環境變量解析（推薦）

在 `initializeProvider` 中增強環境變量解析邏輯：

```typescript
case 'glm-commercials':
  if (process.env.GLM_API_KEYS) {
    apiKeys = process.env.GLM_API_KEYS
      .split(',')
      .map(key => key.trim())
      .filter(key => key.length > 0)
      .filter(key => {
        // 過濾掉明顯無效的 key（如只有空白字符）
        const trimmed = key.trim();
        return trimmed.length > 10; // API Key 通常至少 20 字符
      });
  }
```

### 方案 2: 添加調試日誌

在 `MultiKeyGLMProvider` 構造函數中添加詳細日誌：

```typescript
constructor(config: MultiKeyGLMConfig) {
  console.log('[MultiKeyGLMProvider] 接收到的 apiKeys:', config.apiKeys);
  console.log('[MultiKeyGLMProvider] apiKeys 長度:', config.apiKeys.length);
  
  this.config = {
    apiKeys: config.apiKeys.filter(k => {
      const trimmed = k.trim();
      const isValid = trimmed.length > 0;
      if (!isValid) {
        console.warn('[MultiKeyGLMProvider] 過濾掉無效 key:', k);
      }
      return isValid;
    }),
    // ...
  };
  
  console.log('[MultiKeyGLMProvider] 過濾後的 apiKeys 長度:', this.config.apiKeys.length);
}
```

### 方案 3: 檢查環境變量格式

確保 `.env.docker` 文件中的格式正確：

```bash
# ✅ 正確格式
GLM_API_KEYS=key1,key2,key3

# ❌ 錯誤格式
GLM_API_KEYS="key1,key2,key3"  # 有引號
GLM_API_KEYS= key1,key2,key3   # 有前導空格
GLM_API_KEYS=key1, key2, key3  # 有空格（會被 trim，但可能導致問題）
```

---

## 📋 驗證步驟

### 步驟 1: 檢查環境變量原始值

```bash
# 在容器內檢查環境變量的原始值
docker exec jyt-gas-app sh -c "echo \"GLM_API_KEYS=[\$GLM_API_KEYS]\""
```

### 步驟 2: 檢查環境變量長度和字符

```bash
# 檢查環境變量的詳細信息
docker exec jyt-gas-app sh -c "echo \$GLM_API_KEYS | od -c | head -20"
```

### 步驟 3: 在應用中添加調試日誌

在 `initializeProvider` 中添加：

```typescript
console.log('[初始化] GLM_API_KEYS 原始值:', JSON.stringify(process.env.GLM_API_KEYS));
console.log('[初始化] GLM_API_KEYS 長度:', process.env.GLM_API_KEYS?.length);
console.log('[初始化] 分割後的 keys:', apiKeys);
console.log('[初始化] 每個 key 的長度:', apiKeys.map(k => k.length));
```

---

## 🎯 預期修復效果

修復後應該看到：
- ✅ `apiKeysCount: 3`（在 `initializeProvider` 中）
- ✅ `[多 Key GLM Provider] 已初始化，共 3 個 Key`（在構造函數中）
- ✅ `Available: true`
- ✅ API 請求成功

---

## 📝 下一步

1. 添加詳細的調試日誌以追蹤環境變量傳遞過程
2. 檢查環境變量的原始值和格式
3. 增強環境變量解析邏輯
4. 驗證修復效果
