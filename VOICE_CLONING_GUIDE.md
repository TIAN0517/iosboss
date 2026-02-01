# ElevenLabs 語音克隆設定指南

## 前置準備

1. ElevenLabs 帳號：https://elevenlabs.io
2. 選擇付費方案（語音克隆需要 Creator 以上方案）
3. 準備你的語音檔案 (.wav/.mp3)

## 步驟一：上傳語音樣本

### 1. 登入 ElevenLabs 後進入 Voice Lab

```
https://elevenlabs.io/voice-lab
```

### 2. 點擊 "Add New Voice"

### 3. 上傳語音樣本要求

| 項目 | 要求 |
|------|------|
| 檔案數量 | 至少 3-5 個檔案 |
| 檔案格式 | WAV 或 MP3 |
| 音頻品質 | 44.1kHz 或 48kHz |
| 總時長 | 30 分鐘以上最佳 |
| 內容 | 清晰朗讀，無背景噪音 |
| 語言 | 全部用中文（你的瓦斯妹.wav 是中文） |

### 4. 推薦上傳的檔案

```
✅ welcome.wav          - 歡迎語
✅ 瓦斯妹.wav           - 主要參考音頻
✅ cylinder_20kg.wav    - 產品介紹
✅ safety_leak.wav      - 安全提醒
✅ emergency.wav        - 緊急狀況
```

### 5. 上傳後設定

```
Voice Name: 九九瓦斯妹 (或你想要的名称)
Labels: gas, chinese, female
Description: 九九瓦斯行的客服語音
```

## 步驟二：取得 Voice ID

上傳完成後，ElevenLabs 會產生一個 Voice ID：

```
格式: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
範例: xi5_abc123def456ghi789jkl012mno345
```

## 步驟三：更新環境變數

編輯 `.env` 檔案：

```bash
# 原本的預設語音
ELEVENLABS_VOICE=XBnrpkQkHdVjPEZ0eiP

# 改成你的瓦斯妹語音 ID
ELEVENLABS_VOICE=你的VoiceID

# 建議調整參數讓更像原聲
ELEVENLABS_STABILITY=0.3    # 較低 = 更一致的語音
ELEVENLABS_SIMILARITY=0.85  # 較高 = 更像原聲
```

## 步驟四：測試語音

重啟服務器後測試：

```bash
curl "http://localhost:9999/api/voice/chat" \
  -H "Content-Type: application/json" \
  -d '{"text":"你好，我是九九瓦斯行的語音助手！"}'
```

## 每個語音檔建議創建的 Voice

| 語音檔 | Voice Name | 用途 |
|--------|-----------|------|
| 瓦斯妹.wav | 九九瓦斯妹-主Voice | 主要客服語音 |
| emergency_gas_leak.wav | 瓦斯緊急語音 | 緊急狀況播報 |
| cylinder_20kg.wav | 產品介紹語音 | 產品說明 |

## 環境變數完整設定

```bash
# ElevenLabs 語音克隆
ELEVENLABS_API_KEYS=sk_xxx,sk_yyy,sk_zzz
ELEVENLABS_VOICE=你的瓦斯妹VoiceID
ELEVENLABS_MODEL=eleven_multilingual_v2
ELEVENLABS_STABILITY=0.3
ELEVENLABS_SIMILARITY=0.85
```

## 常見問題

### Q: 語音不像怎麼辦？
A: 增加更多樣本（至少 30 分鐘），確保錄音品質清晰。

### Q: 費用多少？
A: Creator 方案 $5/月，獲得 30,000 字元/月。

### Q: 可以用同一個 Voice ID 說不同內容嗎？
A: 可以！這就是語音克隆的優勢，同一個語音可以生成任何文字。

## API 使用範例

```typescript
// 使用瓦斯妹語音
POST /api/voice/chat
{
  "text": "20公斤瓦斯一桶720元",
  "ttsProvider": "elevenlabs",
  "voiceId": "你的VoiceID"
}
```

## 備用方案：如果 ElevenLabs 費用太高

可以使用系統預設語音（無需自定義）：
- `zh-TW-HsiaoYuNeural` - 中文女聲
- `zh-CN-XiaoxiaoNeural` - 中文女聲

在 `.env` 設定：
```bash
# 使用 Azure 預設語音（免費）
AZ_TTS_VOICE=zh-TW-HsiaoYuNeural
```
