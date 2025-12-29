# Ollama 雲 API 集成指南

## ✅ 已完成的功能

1. **Ollama Provider 類** - 完整的 AI 提供商實現
2. **統一集成** - 已集成到 `UnifiedAIProvider` 中
3. **串流支持** - 支持實時串流響應
4. **推理內容支持** - 支持顯示模型推理過程
5. **語音功能** - 與現有語音系統兼容

## 🚀 快速配置

### 1. 設置環境變量

在 `.env.docker` 或 `docker-compose.yml` 中添加：

```bash
# Ollama 雲 API 配置
OLLAMA_API_KEY=926d2eabf55041228a86711e33937721.vA3uh0BpteCna9DVVBaCQRQk
OLLAMA_MODEL=deepseek-v3.1:671b
OLLAMA_BASE_URL=https://ollama.com/v1
OLLAMA_TIMEOUT=60000
OLLAMA_ENABLE_STREAMING=true

# 切換到 Ollama（默認已設置）
NEXT_AI_PROVIDER=ollama
```

### 2. 推薦的模型配置

根據速度和性能，推薦以下模型：

#### 🚀 速度優先（推薦）
- `deepseek-v3.1:671b` - 速度快，性能好（默認）
- `gemini-3-pro-preview` - Google 最新模型
- `kimi-k2` - 中文優化

#### 🎯 性能優先
- `gpt-oss:120b` - 超大模型，性能最強
- `deepseek-v3.1:671b` - 平衡選擇

### 3. 查看可用模型

訪問：https://ollama.com/api/tags

或使用 API：
```bash
curl https://ollama.com/api/tags \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 📝 配置說明

### 環境變量詳解

| 變量名 | 說明 | 默認值 | 必填 |
|--------|------|--------|------|
| `OLLAMA_API_KEY` | Ollama API Key | - | ✅ |
| `OLLAMA_MODEL` | 使用的模型 | `deepseek-v3.1:671b` | ❌ |
| `OLLAMA_BASE_URL` | API 基址 | `https://ollama.com/v1` | ❌ |
| `OLLAMA_TIMEOUT` | 請求超時（毫秒） | `60000` | ❌ |
| `OLLAMA_ENABLE_STREAMING` | 啟用串流 | `true` | ❌ |
| `NEXT_AI_PROVIDER` | AI 提供商類型 | `ollama` | ❌ |

## 🎤 語音功能

Ollama 已與現有語音系統集成：

1. **語音識別（ASR）** - 使用現有的 Deepgram 或 Azure Speech
2. **語音合成（TTS）** - 使用現有的 Azure TTS 或 GLM TTS
3. **AI 處理** - 使用 Ollama 進行對話處理

### 語音流程

```
用戶語音 → ASR (Deepgram/Azure) → Ollama AI → TTS (Azure/GLM) → 語音回應
```

## 🔧 切換 AI 提供商

如果需要切換回 GLM：

```bash
NEXT_AI_PROVIDER=glm-commercials
```

或使用 Ollama：

```bash
NEXT_AI_PROVIDER=ollama
```

## 📊 性能對比

| 模型 | 速度 | 性能 | 推薦場景 |
|------|------|------|----------|
| `deepseek-v3.1:671b` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 日常對話、快速響應 |
| `gemini-3-pro-preview` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 複雜推理、專業問題 |
| `kimi-k2` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 中文優化場景 |
| `gpt-oss:120b` | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 高質量輸出 |

## 🐛 故障排除

### 問題 1: API Key 無效

**錯誤訊息**：`HTTP 401` 或 `Unauthorized`

**解決方案**：
1. 檢查 API Key 是否正確
2. 確認 API Key 未過期
3. 訪問 https://ollama.com/settings/keys 重新生成

### 問題 2: 模型不存在

**錯誤訊息**：`Model not found`

**解決方案**：
1. 檢查模型名稱是否正確
2. 訪問 https://ollama.com/search?c=cloud 查看可用模型
3. 使用正確的模型標籤（如 `deepseek-v3.1:671b`）

### 問題 3: 請求超時

**錯誤訊息**：`Request timeout`

**解決方案**：
1. 增加 `OLLAMA_TIMEOUT` 值（如 `120000`）
2. 選擇更快的模型（如 `deepseek-v3.1:671b`）
3. 檢查網絡連接

## 🎯 最佳實踐

1. **模型選擇**：根據場景選擇合適的模型
   - 日常對話：`deepseek-v3.1:671b`
   - 專業問題：`gemini-3-pro-preview`
   - 中文優化：`kimi-k2`

2. **超時設置**：根據模型速度調整
   - 快速模型：`30000` (30秒)
   - 大型模型：`120000` (120秒)

3. **串流啟用**：建議啟用以獲得更好的用戶體驗

4. **錯誤處理**：系統會自動回退到本地模式

## 📚 API 文檔

- Ollama 雲 API：https://ollama.com/v1/chat/completions
- 模型列表：https://ollama.com/search?c=cloud
- API 文檔：https://ollama.com/docs

## 🔄 更新日誌

### 2025-01-XX
- ✅ 集成 Ollama 雲 API
- ✅ 支持多模型切換
- ✅ 支持串流響應
- ✅ 支持推理內容顯示
- ✅ 與語音系統集成
