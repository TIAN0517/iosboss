# API 連接問題修復指南

## 🔍 問題診斷

### 當前錯誤
```
Error: 模型不存在，请检查模型代码。
```

### 可能原因
1. **模型名稱不正確**：`glm-4.7-coding-max` 可能不是有效的模型名稱
2. **API Key 權限不足**：API Key 可能沒有訪問該模型的權限
3. **API 端點錯誤**：請求的 API 端點可能不正確
4. **環境變數未正確傳遞**：容器內環境變數可能與配置不一致

---

## 🔧 修復步驟

### 步驟 1：驗證模型名稱

**檢查 GLM-4.7 支持的模型名稱**：

根據 GLM 官方文檔，正確的模型名稱應該是：
- `glm-4` - 通用模型
- `glm-4-flash` - 快速模型
- `glm-4-plus` - 增強模型
- `glm-4-alltools` - 工具調用模型

**可能的問題**：
- `glm-4.7-coding-max` 可能不是正確的模型名稱
- 應該使用 `glm-4` 或 `glm-4-flash` 作為主要模型

**修復方法**：
```bash
# 在 .env.docker 中修改
GLM_MODEL=glm-4-flash  # 或 glm-4
```

---

### 步驟 2：檢查 API Key 權限

**驗證 API Key 是否有效**：

```bash
# 測試 API Key
curl -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "glm-4-flash",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

**如果返回 401/403**：
- API Key 無效或已過期
- 需要重新生成 API Key

---

### 步驟 3：檢查 API 端點

**當前使用的端點**：
```
https://open.bigmodel.cn/api/paas/v4/chat/completions
```

**驗證端點是否正確**：
- 檢查 GLM 官方文檔確認正確的 API 端點
- 確認是否需要使用不同的端點（如 `/api/paas/v3/` 或 `/api/paas/v4/`）

---

### 步驟 4：添加詳細錯誤日誌

**在 `src/lib/ai-provider-unified.ts` 中添加**：

```typescript
async chat(message: string, history?: ChatMessage[]): Promise<ChatResponse> {
  if (!this.isAvailable()) throw new Error('沒有可用的 API Key');

  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPTS.chat },
    ...(history?.slice(-10) || []).map(msg => ({ role: msg.role, content: msg.content })),
    { role: 'user', content: message },
  ];

  for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
    try {
      const apiKey = this.getBestApiKey();
      
      // 添加詳細日誌
      console.log('[MultiKeyGLMProvider] 發送請求:', {
        model: this.config.model,
        apiKeyPrefix: apiKey.substring(0, 10) + '...',
        messageLength: message.length,
        attempt: attempt + 1,
      });

      const requestBody = {
        model: this.config.model,
        messages,
        stream: false,
        temperature: 0.8,
        max_tokens: 2000,
      };

      console.log('[MultiKeyGLMProvider] 請求體:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      console.log('[MultiKeyGLMProvider] 響應狀態:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MultiKeyGLMProvider] 錯誤響應:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }
        
        this.markKeyFailure(apiKey);

        // 詳細錯誤日誌
        console.error('[MultiKeyGLMProvider] 錯誤詳情:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error,
          model: this.config.model,
        });

        if ((response.status === 401 || response.status === 403) && attempt < this.config.maxRetries - 1) {
          this.rotateToNextKey();
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }

        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[MultiKeyGLMProvider] 成功響應:', {
        model: data.model,
        contentLength: data.choices?.[0]?.message?.content?.length || 0,
        usage: data.usage,
      });

      const content = data.choices?.[0]?.message?.content || '';
      this.markKeySuccess(apiKey);

      return {
        content,
        model: data.model || this.config.model,
        usage: data.usage,
      };
    } catch (error: any) {
      console.error(`[MultiKeyGLMProvider] 嘗試 ${attempt + 1} 失敗:`, error);
      
      if (attempt < this.config.maxRetries - 1) {
        this.rotateToNextKey();
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }

  throw new Error('所有重試都失敗了');
}
```

---

### 步驟 5：測試不同的模型名稱

**創建測試腳本**：

```typescript
// test-models.ts
const models = ['glm-4', 'glm-4-flash', 'glm-4-plus', 'glm-4-alltools'];

for (const model of models) {
  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: '測試' }],
      }),
    });

    if (response.ok) {
      console.log(`✅ ${model} - 可用`);
    } else {
      const error = await response.json();
      console.log(`❌ ${model} - ${error.error?.message || response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ ${model} - ${error.message}`);
  }
}
```

---

## 🎯 快速修復方案

### 方案 1：修改模型名稱

```bash
# 在 .env.docker 中
GLM_MODEL=glm-4-flash  # 改為支持的模型名稱
```

然後重啟服務：
```bash
docker compose restart app
```

### 方案 2：檢查 API Key 權限

1. 登入 GLM 控制台
2. 檢查 API Key 是否有權限訪問該模型
3. 如果沒有，升級 API Key 或使用其他模型

### 方案 3：使用備用模型

在代碼中添加模型回退邏輯：

```typescript
const models = ['glm-4.7-coding-max', 'glm-4-flash', 'glm-4'];

for (const model of models) {
  try {
    // 嘗試使用該模型
    const response = await fetch(..., {
      body: JSON.stringify({ model, ... }),
    });
    
    if (response.ok) {
      // 成功，使用該模型
      break;
    }
  } catch (error) {
    // 繼續嘗試下一個模型
    continue;
  }
}
```

---

## 📋 檢查清單

- [ ] 驗證模型名稱是否正確
- [ ] 檢查 API Key 是否有效
- [ ] 確認 API 端點是否正確
- [ ] 添加詳細錯誤日誌
- [ ] 測試不同的模型名稱
- [ ] 檢查環境變數是否正確傳遞
- [ ] 驗證 API Key 權限

---

## 💡 建議

1. **優先使用 `glm-4-flash`**：這是 GLM-4 系列中最穩定和快速的模型
2. **添加模型回退機制**：如果主要模型失敗，自動嘗試備用模型
3. **詳細日誌**：添加詳細的錯誤日誌以便快速定位問題
4. **測試 API Key**：在修復前先測試 API Key 是否有效
