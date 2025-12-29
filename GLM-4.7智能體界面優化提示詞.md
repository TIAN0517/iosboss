# GLM-4.7 智能體界面優化提示詞

## 🎯 目標

將現有的 BossJy-99 助手界面優化成類似 GLM-4.7 官方智能體界面的風格，包括：
- 更現代的視覺設計
- 思考過程顯示（Thinking Mode）
- 流式輸出動畫
- 工具調用展示
- 更流暢的交互體驗

---

## 📋 當前問題分析

### 問題 1：API 連接失敗
**症狀**：
- 用戶發送消息後收到「抱歉，AI服務暫時無法使用」
- API 返回本地回退（source: local）
- 日誌顯示「模型不存在，请检查模型代码」

**可能原因**：
1. AI Provider 初始化失敗
2. 模型名稱配置錯誤
3. API Key 驗證失敗
4. 環境變數未正確傳遞

**需要檢查**：
- `src/lib/ai-provider-unified.ts` 中的 `UnifiedAIProvider` 初始化
- 環境變數 `GLM_API_KEYS`, `GLM_MODEL`, `NEXT_AI_PROVIDER` 是否正確
- API 請求的模型名稱是否匹配 GLM-4.7 支持的模型

---

## 🎨 GLM-4.7 智能體界面特徵

### 視覺設計特點
1. **簡潔的對話氣泡**
   - 用戶消息：右側，漸變橙色/藍色
   - AI 消息：左側，白色/淺灰色背景
   - 圓角設計，iOS Messages 風格

2. **思考過程顯示**
   - 顯示 AI 的思考過程（Thinking Mode）
   - 可折疊的思考內容
   - 思考圖標和動畫

3. **流式輸出動畫**
   - 打字機效果
   - 逐字顯示動畫
   - 流暢的滾動

4. **工具調用展示**
   - 顯示 AI 使用的工具
   - 工具執行結果
   - 可展開/折疊的工具詳情

5. **狀態指示器**
   - 在線狀態（綠色圓點）
   - 輸入中動畫
   - 錯誤狀態提示

---

## 🔧 界面優化需求

### 1. 消息氣泡樣式優化

**當前樣式**（`src/components/AIAssistant.tsx` 第 296-319 行）：
```tsx
<div className={`px-4 py-2.5 shadow-sm ${
  message.role === 'user'
    ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl rounded-br-sm'
    : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100'
}`}>
```

**優化為 GLM-4.7 風格**：
```tsx
{/* 用戶消息 - 右側，漸變藍色 */}
{message.role === 'user' && (
  <div className="flex items-end gap-2 justify-end">
    <div className="max-w-[75%] bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
      <div className="text-xs text-blue-100 mt-1 opacity-70">
        {formatTime(message.timestamp)}
      </div>
    </div>
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0">
      <User className="h-4 w-4 text-white" />
    </div>
  </div>
)}

{/* AI 消息 - 左側，白色背景 */}
{message.role === 'assistant' && (
  <div className="flex items-start gap-2">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
      <Sparkles className="h-4 w-4 text-white" />
    </div>
    <div className="max-w-[75%] bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
      {/* 思考過程（如果有） */}
      {message.thinking && (
        <div className="mb-2 p-2 bg-gray-50 rounded-lg border-l-2 border-blue-500">
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>思考中...</span>
          </div>
          <div className="text-xs text-gray-500 whitespace-pre-wrap">{message.thinking}</div>
        </div>
      )}
      
      {/* 消息內容 */}
      <div className="text-sm text-gray-800 whitespace-pre-wrap">
        {isStreaming && index === messages.length - 1 ? (
          <span>{message.content}<span className="animate-pulse">▊</span></span>
        ) : (
          message.content
        )}
      </div>
      
      {/* 時間戳 */}
      <div className="text-xs text-gray-400 mt-1">
        {formatTime(message.timestamp)}
      </div>
    </div>
  </div>
)}
```

---

### 2. 思考過程顯示

**添加思考模式支持**：

```tsx
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  thinking?: string  // 新增：思考過程
  toolCalls?: Array<{  // 新增：工具調用
    name: string
    arguments: any
    result?: any
  }>
  isStreaming?: boolean
}

// 在 handleSend 中處理思考過程
const handleSend = async () => {
  // ... 現有代碼 ...
  
  try {
    // 使用流式 API 獲取思考過程
    const stream = await aiManager.chatStream(currentInput, conversationHistory)
    
    let fullContent = ''
    let thinkingContent = ''
    
    for await (const chunk of stream) {
      if (chunk.type === 'thinking') {
        thinkingContent += chunk.text || ''
        // 更新消息顯示思考過程
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1]
          if (lastMsg && lastMsg.role === 'assistant') {
            return [...prev.slice(0, -1), { ...lastMsg, thinking: thinkingContent }]
          }
          return prev
        })
      } else if (chunk.type === 'content') {
        fullContent += chunk.text || ''
        // 更新消息內容（流式顯示）
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1]
          if (lastMsg && lastMsg.role === 'assistant') {
            return [...prev.slice(0, -1), { ...lastMsg, content: fullContent, isStreaming: true }]
          }
          return prev
        })
      }
    }
    
    // 完成後移除流式標記
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1]
      if (lastMsg && lastMsg.role === 'assistant') {
        return [...prev.slice(0, -1), { ...lastMsg, isStreaming: false }]
      }
      return prev
    })
  } catch (error) {
    // ... 錯誤處理 ...
  }
}
```

---

### 3. 流式輸出動畫

**打字機效果**：

```tsx
// 在消息顯示組件中添加打字機動畫
{message.isStreaming && (
  <div className="inline-block">
    {message.content}
    <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse" />
  </div>
)}
```

---

### 4. 工具調用展示

**顯示 AI 使用的工具**：

```tsx
{message.toolCalls && message.toolCalls.length > 0 && (
  <div className="mt-2 space-y-2">
    {message.toolCalls.map((tool, idx) => (
      <div key={idx} className="p-2 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 text-xs text-blue-700 mb-1">
          <Wrench className="h-3 w-3" />
          <span className="font-medium">使用工具: {tool.name}</span>
        </div>
        {tool.result && (
          <div className="text-xs text-gray-600 mt-1">
            {JSON.stringify(tool.result, null, 2)}
          </div>
        )}
      </div>
    ))}
  </div>
)}
```

---

### 5. 狀態指示器優化

**Header 狀態顯示**：

```tsx
<div className="flex items-center gap-2">
  <div className="relative">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
      <Sparkles className="h-5 w-5 text-white" />
    </div>
    {/* 在線狀態指示器 */}
    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
  </div>
  
  <div>
    <h3 className="text-base font-semibold text-gray-900">{AI_NAME}</h3>
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
      <span className="text-xs text-green-600">
        {isLoading ? '思考中...' : '隨時為您服務'}
      </span>
    </div>
  </div>
</div>
```

---

### 6. 輸入框優化

**GLM-4.7 風格的輸入框**：

```tsx
<div className="p-4 bg-white border-t border-gray-100">
  <div className="flex gap-2 items-end">
    {/* 輸入框 - 更圓潤的設計 */}
    <div className="flex-1 relative">
      <textarea
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
          }
        }}
        placeholder="輸入訊息..."
        className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all resize-none"
        rows={1}
        disabled={isLoading}
        style={{
          minHeight: '44px',
          maxHeight: '120px',
        }}
      />
    </div>
    
    {/* 發送按鈕 - 漸變設計 */}
    <button
      onClick={handleSend}
      disabled={!inputValue.trim() || isLoading}
      className={`p-3 rounded-xl transition-all active:scale-95 ${
        inputValue.trim() && !isLoading
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg'
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
      }`}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Send className="h-5 w-5" />
      )}
    </button>
  </div>
</div>
```

---

## 🔧 API 連接問題修復

### 問題診斷步驟

1. **檢查 AI Provider 初始化**
   ```typescript
   // 在 src/lib/ai-provider-unified.ts 中
   // 確保 UnifiedAIProvider 正確初始化
   export const aiProvider = new UnifiedAIProvider()
   ```

2. **檢查環境變數**
   ```bash
   # 在容器內檢查
   docker exec jyt-gas-app printenv | grep GLM
   ```

3. **檢查模型名稱**
   - 確認 `GLM_MODEL=glm-4.7-coding-max` 是正確的模型名稱
   - GLM-4.7 支持的模型：
     - `glm-4.7-coding-max` ✅
     - `glm-4.7` ✅
     - `glm-4-flash` ✅

4. **添加錯誤日誌**
   ```typescript
   // 在 MultiKeyGLMProvider.chat 中添加詳細日誌
   console.log('[MultiKeyGLMProvider] 發送請求:', {
     model: this.config.model,
     apiKey: apiKey.substring(0, 10) + '...',
     messageLength: message.length,
   })
   ```

---

## 📝 完整實現步驟

### 步驟 1：修復 API 連接
1. 檢查 `src/lib/ai-provider-unified.ts` 中的初始化邏輯
2. 確認環境變數正確傳遞
3. 添加詳細的錯誤日誌
4. 測試 API 連接

### 步驟 2：更新消息接口
1. 在 `src/components/AIAssistant.tsx` 中更新 `Message` 接口
2. 添加 `thinking` 和 `toolCalls` 字段
3. 添加 `isStreaming` 狀態

### 步驟 3：實現思考過程顯示
1. 更新 `handleSend` 函數支持流式 API
2. 處理 `thinking` 類型的 chunk
3. 在 UI 中顯示思考過程

### 步驟 4：優化視覺設計
1. 更新消息氣泡樣式
2. 添加工具調用展示
3. 優化狀態指示器
4. 改進輸入框設計

### 步驟 5：添加動畫效果
1. 實現打字機效果
2. 添加思考動畫
3. 優化滾動行為

---

## 🎯 預期效果

優化後的界面應該：
- ✅ 類似 GLM-4.7 官方智能體界面
- ✅ 顯示思考過程（如果啟用）
- ✅ 流式輸出動畫
- ✅ 工具調用展示
- ✅ 更流暢的交互體驗
- ✅ 現代化的視覺設計

---

## 📋 檢查清單

- [ ] 修復 API 連接問題
- [ ] 更新消息接口定義
- [ ] 實現思考過程顯示
- [ ] 優化消息氣泡樣式
- [ ] 添加工具調用展示
- [ ] 實現流式輸出動畫
- [ ] 優化狀態指示器
- [ ] 改進輸入框設計
- [ ] 測試所有功能
- [ ] 優化性能

---

## 💡 提示

1. **優先修復 API 連接**：確保 AI 服務正常工作後再優化界面
2. **漸進式優化**：先修復功能，再優化視覺
3. **保持兼容性**：確保現有功能不受影響
4. **測試流式輸出**：確保思考過程和流式輸出正常工作
