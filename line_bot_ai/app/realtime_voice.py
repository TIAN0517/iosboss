"""
即時語音對話模組
接近豆包體驗：低延遲 + 高準確度 + 自然語音
"""
import os
import asyncio
from pathlib import Path
from typing import Optional, AsyncGenerator


# ==================== 配置 ====================
# Groq API（免費，超快）
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1"

# 使用最新模型（超快推理）
FAST_MODEL = "llama-3.3-70b-versatile"  # Groq 最新最快模型

# 語音識別配置
WHISPER_MODEL = "whisper-large-v3"  # Groq 的 Whisper


# ==================== 即時語音對話 ====================

class RealtimeVoiceChat:
    """即時語音對話類（接近豆包體驗）"""

    def __init__(self):
        self.conversation_history = []

    async def transcribe_audio(self, audio_bytes: bytes) -> Optional[str]:
        """
        超快語音識別（使用 Groq Whisper）

        Args:
            audio_bytes: 音訊資料

        Returns:
            識別的文字
        """
        try:
            import requests
            import tempfile

            # 儲存暫存檔
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            # 使用 Groq Whisper
            response = requests.post(
                f"{GROQ_API_URL}/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}"
                },
                data={
                    "model": WHISPER_MODEL,
                    "language": "zh",
                    "prompt": "瓦斯行、瓦斯桶、客戶、訂單、庫存、打卡、休假"
                },
                files={
                    "file": open(tmp_path, "rb")
                },
                timeout=10  # 10秒超時
            )

            # 清理暫存檔
            os.unlink(tmp_path)

            response.raise_for_status()
            result = response.json()

            return result.get("text")

        except Exception as e:
            print(f"語音識別錯誤: {e}")
            return None

    async def get_ai_response(self, text: str) -> str:
        """
        超快 AI 回應（使用 Groq Mixtral）

        Args:
            text: 用戶輸入

        Returns:
            AI 回應
        """
        try:
            from groq import Groq

            client = Groq(api_key=GROQ_API_KEY)

            # 加入歷史記錄
            messages = [
                {
                    "role": "system",
                    "content": "你是九九瓦斯行的智能助手。請用繁體中文回答，語氣友善專業。"
                },
                *self.conversation_history[-10:],  # 保留最近 10 輪對話
                {
                    "role": "user",
                    "content": text
                }
            ]

            response = client.chat.completions.create(
                model=FAST_MODEL,
                messages=messages,
                max_tokens=512,
                temperature=0.7,
            )

            ai_message = response.choices[0].message.content

            # 更新歷史記錄
            self.conversation_history.append({"role": "user", "content": text})
            self.conversation_history.append({"role": "assistant", "content": ai_message})

            return ai_message

        except Exception as e:
            print(f"AI 回應錯誤: {e}")
            return "抱歉，我剛才沒聽清楚，可以再說一次嗎？"

    async def text_to_speech_stream(self, text: str) -> AsyncGenerator[bytes, None]:
        """
        文字轉語音（串流生成，降低延遲）

        Args:
            text: 要轉換的文字

        Yields:
            音訊資料
        """
        try:
            import edge_tts

            voice_id = "zh-TW-HsiaoChenNeural"  # 台灣女聲

            communicate = edge_tts.Communicate(
                text,
                voice_id,
                rate="+5%",
                volume="+5%",
                pitch="-2Hz"
            )

            # 串流生成音訊
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]

        except Exception as e:
            print(f"語音合成錯誤: {e}")

    async def process_voice_input(self, audio_bytes: bytes) -> dict:
        """
        完整處理語音輸入（語音→文字→AI→語音）

        Args:
            audio_bytes: 用戶語音

        Returns:
            {
                "user_text": "用戶說的話",
                "ai_text": "AI回應",
                "audio_url": "語音檔URL"
            }
        """
        # 1. 語音識別
        user_text = await self.transcribe_audio(audio_bytes)
        if not user_text:
            return {
                "error": "語音識別失敗",
                "user_text": "",
                "ai_text": "抱歉，我沒聽清楚，可以再說一次嗎？"
            }

        # 2. AI 回應
        ai_text = await self.get_ai_response(user_text)

        # 3. 語音合成
        import hashlib
        text_hash = hashlib.md5(ai_text.encode()).hexdigest()[:12]
        audio_filename = f"{text_hash}.mp3"
        audio_path = Path(f"app/static/voice/{audio_filename}")

        # 生成語音檔
        if not audio_path.exists():
            audio_data = b""
            async for chunk in self.text_to_speech_stream(ai_text):
                audio_data += chunk

            audio_path.write_bytes(audio_data)

        return {
            "user_text": user_text,
            "ai_text": ai_text,
            "audio_url": f"/static/voice/{audio_filename}"
        }


# ==================== API 端點整合 ====================

chat_instance = RealtimeVoiceChat()


async def process_realtime_voice(audio_bytes: bytes) -> dict:
    """
    處理即時語音對話

    Args:
        audio_bytes: 音訊資料

    Returns:
        對話結果
    """
    return await chat_instance.process_voice_input(audio_bytes)


if __name__ == "__main__":
    print("即時語音對話模組")
    print("\n特性：")
    print("✓ 超快語音識別（Groq Whisper）")
    print("✓ 超快 AI 推理（Groq Mixtral）")
    print("✓ 自然台灣腔語音（edge-tts）")
    print("✓ 低延遲（接近豆包）")
    print("\n需要配置：")
    print("GROQ_API_KEY（免費註冊：https://console.groq.com）")
