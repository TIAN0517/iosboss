# 豆包式語音助手項目

## 🎯 項目概述
創建一個類似豆包的智能語音助手，支持語音輸入、智能對話和語音輸出。
本項目為純前端 React 應用，使用 Vite 構建，直接調用 AI API。

## 📁 項目結構
```
voice_assistant/
├── package.json                 # 項目配置
├── vite.config.js               # Vite 配置
├── index.html                   # 入口頁面
├── .env                         # 環境變量 (需自行創建)
├── .env.example                 # 環境變量示例
├── src/
│   ├── main.jsx                 # React 入口
│   ├── components/
│   │   └── VoiceAssistant.jsx   # 語音助手主組件
│   ├── services/
│   │   ├── speechRecognition.js # 語音識別 (Web Speech API)
│   │   ├── textToSpeech.js      # 語音合成 (Web Speech API)
│   │   └── aiChat.js            # AI 對話服務 (OpenAI/GLM)
│   └── styles/
│       └── VoiceAssistant.css   # 樣式文件
└── start-voice-assistant.bat    # 一鍵啟動腳本
```

## 🚀 功能特性
- 🗣️ **實時語音識別**: 使用瀏覽器原生 Web Speech API
- 🤖 **智能AI對話**: 支持 OpenAI / 智譜 GLM 等兼容接口
- 🔊 **語音合成**: 使用瀏覽器原生 Speech Synthesis API
- 💬 **多輪對話**: 支持上下文理解
- 📱 **響應式設計**: 適配移動端和桌面端

## 📋 快速開始

### 1. 安裝依賴
```bash
cd voice_assistant
npm install
```

### 2. 配置環境變量
複製 `.env.example` 為 `.env`，並填入 API Key：
```bash
# .env
VITE_OPENAI_API_KEY=your_api_key
VITE_OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
VITE_OPENAI_MODEL=glm-4.7-coding-max
```

### 3. 啟動開發服務器
```bash
npm run dev
```
或者直接運行 `start-voice-assistant.bat`。

## 🔧 技術細節
- **Frontend**: React 18 + Vite
- **Speech**: Web Speech API (無需後端)
- **AI**: 直接從前端調用 AI API (注意: 生產環境建議通過後端轉發以保護 Key，但在本本地開發版中直接調用)

## 🐛 常見問題
1. **語音識別不工作**: 請確保使用 Chrome/Edge 瀏覽器，並允許麥克風權限。
2. **API 錯誤**: 檢查 `.env` 中的 API Key 是否正確，以及是否有餘額。
3. **瀏覽器兼容性**: 推薦使用 Chrome 桌面版或 Android Chrome。iOS Safari 對 Web Speech API 支持有限。

## 📄 許可證
MIT License
