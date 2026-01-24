# 升級 TTS 語音合成體驗

## 1. 問題分析
用戶反饋「為什麼還是朗讀的語音」，指的是目前使用的是瀏覽器原生的 `SpeechSynthesis` API，其效果機械、生硬，聽起來像屏幕閱讀器，與「豆包」類型的自然 AI 語音相去甚遠。

## 2. 解決方案
為了提供類似豆包的自然語音體驗，我們將引入 **Zhipu GLM (智譜 AI)** 的語音合成能力。
項目中已存在 `VITE_OPENAI_API_KEY` (對應智譜 GLM Key)，我們可以直接調用智譜的 OpenAI 兼容接口 `/audio/speech` 或其原生 TTS 接口。

根據父項目 `src/lib/voice-service.ts` 的參考實現，智譜 TTS 是可用的。

## 3. 實施計劃

### 步驟 1: 改造 `TextToSpeechService`
- 修改 `voice_assistant/src/services/textToSpeech.js`。
- 移除（或降級為備用）原有的 `window.speechSynthesis` 邏輯。
- 新增 `synthesizeWithGLM` 方法，調用 `https://open.bigmodel.cn/api/paas/v4/audio/speech`。
- 默認使用 `cogview` 相關模型或 `tts-1` (智譜兼容接口)。
- 使用音色 `tongtong` (類似豆包的可愛音色)。

### 步驟 2: 處理音頻播放
- 由於 API 返回的是音頻文件（MP3/WAV），需要使用 Web Audio API 或 HTML5 `Audio` 元素進行播放，而不是 `SpeechSynthesisUtterance`。
- 實現流式播放（如果支持）或緩衝播放。

### 步驟 3: 更新 UI 反饋
- 在等待音頻生成時，UI 應顯示「生成語音中...」或保持「思考中」狀態，避免長時間靜默。

## 4. 預期效果
- 語音將從機械的「機器人聲」變為自然的「AI 真人聲」。
- 支持更豐富的情感和語調。
