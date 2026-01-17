"""
語音合成 (TTS) 模块
支持 Eightwai、Google、Azure、Edge TTS 等多種 TTS 提供商
"""
import os
import tempfile
from typing import Optional
from pathlib import Path
from config import config


class TTSProvider:
    """語音合成提供者基类"""

    def text_to_speech(self, text: str) -> tuple[bytes, int]:
        """
        将文字转换为語音

        Returns:
            (audio_data, duration_ms) 音频数据和持续时间（毫秒）
        """
        raise NotImplementedError


class EightwaiTTS(TTSProvider):
    """Eightwai 語音合成"""

    def __init__(self):
        self.api_key = config.EIGHTWAI_TTS_API_KEY
        self.api_url = config.EIGHTWAI_TTS_API_URL

    def text_to_speech(self, text: str) -> tuple[bytes, int]:
        """使用 Eightwai API 进行語音合成"""
        import requests

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "tts-1",
            "input": text,
            "voice": config.TTS_VOICE,
            "speed": config.TTS_SPEED,
            "response_format": config.TTS_OUTPUT_FORMAT,
        }

        response = requests.post(
            self.api_url,
            headers=headers,
            json=payload,
            timeout=30,
        )
        response.raise_for_status()

        audio_data = response.content

        # 估算持续时间（假设平均语速 150字/分钟）
        duration_ms = int(len(text) / 150 * 60 * 1000)

        return audio_data, duration_ms


class GoogleTTS(TTSProvider):
    """Google Cloud Text-to-Speech"""

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_TTS_API_KEY", "")
        self.api_url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={self.api_key}"

    def text_to_speech(self, text: str) -> tuple[bytes, int]:
        """使用 Google API 进行語音合成"""
        import requests

        payload = {
            "input": {"text": text},
            "voice": {
                "languageCode": config.ASR_LANGUAGE,
                "name": config.TTS_VOICE,
            },
            "audioConfig": {
                "audioEncoding": "MP3",
                "speakingRate": config.TTS_SPEED,
            },
        }

        response = requests.post(self.api_url, json=payload, timeout=30)
        response.raise_for_status()

        result = response.json()
        audio_data = result.get("audioContent", "")
        duration_ms = result.get("timepoints", [{}])[-1].get("timeSeconds", 0) * 1000

        # Base64 解码
        import base64
        audio_bytes = base64.b64decode(audio_data)

        return audio_bytes, int(duration_ms)


class AzureTTS(TTSProvider):
    """Azure Cognitive Services Speech"""

    def __init__(self):
        self.api_key = os.getenv("AZURE_TTS_API_KEY", "")
        self.region = os.getenv("AZURE_TTS_REGION", "eastasia")

    def text_to_speech(self, text: str) -> tuple[bytes, int]:
        """使用 Azure API 进行語音合成"""
        import requests

        url = f"https://{self.region}.tts.speech.microsoft.com/cognitiveservices/v1"

        headers = {
            "Ocp-Apim-Subscription-Key": self.api_key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
        }

        ssml = f"""<speak version='1.0' xml:lang='zh-TW'>
            <voice xml:lang='zh-TW' xml:gender='Female' name='{config.TTS_VOICE}'>
                {text}
            </voice>
        </speak>"""

        response = requests.post(url, headers=headers, data=ssml.encode("utf-8"), timeout=30)
        response.raise_for_status()

        audio_data = response.content
        duration_ms = int(len(text) / 150 * 60 * 1000)

        return audio_data, duration_ms


class EdgeTTS(TTSProvider):
    """Microsoft Edge TTS (免费，无需 API Key)"""

    def text_to_speech(self, text: str) -> tuple[bytes, int]:
        """使用 Edge TTS 进行語音合成"""
        try:
            import edge_tts
        except ImportError:
            raise ImportError("请先安装 edge-tts: pip install edge-tts")

        import asyncio

        async def _generate():
            communicate = edge_tts.Communicate(text, config.TTS_VOICE)
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            return audio_data

        audio_data = asyncio.run(_generate())
        duration_ms = int(len(text) / 150 * 60 * 1000)

        return audio_data, duration_ms


class MockTTS(TTSProvider):
    """模拟 TTS（用于测试）"""

    def text_to_speech(self, text: str) -> tuple[bytes, int]:
        """返回模拟音频数据"""
        return b"fake audio data", 5000


# TTS 工厂
def create_tts_provider() -> TTSProvider:
    """根据配置创建 TTS 提供者"""
    provider = config.TTS_PROVIDER.lower()

    if provider == "eightwai":
        return EightwaiTTS()
    elif provider == "google":
        return GoogleTTS()
    elif provider == "azure":
        return AzureTTS()
    elif provider == "edge":
        return EdgeTTS()
    else:
        print(f"⚠️  未知的 TTS 提供者: {provider}，使用 MockTTS")
        return MockTTS()


# 全局 TTS 实例
_tts_provider: Optional[TTSProvider] = None


def get_tts_provider() -> TTSProvider:
    """获取全局 TTS 提供者实例"""
    global _tts_provider
    if _tts_provider is None:
        _tts_provider = create_tts_provider()
    return _tts_provider


def text_to_speech(text: str) -> tuple[bytes, int]:
    """
    文字转語音（便捷函数）

    Args:
        text: 要转换的文字

    Returns:
        (audio_data, duration_ms) 音频数据和持续时间
    """
    provider = get_tts_provider()
    return provider.text_to_speech(text)


def text_to_speech_file(text: str, output_path: str) -> int:
    """
    文字转語音并保存到文件

    Args:
        text: 要转换的文字
        output_path: 输出文件路径

    Returns:
        持续时间（毫秒）
    """
    audio_data, duration_ms = text_to_speech(text)

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    with open(output_path, "wb") as f:
        f.write(audio_data)

    return duration_ms


if __name__ == "__main__":
    print("🔊 测试 TTS 模块...")
    print(f"当前 TTS 提供者: {config.TTS_PROVIDER}")

    try:
        test_text = "你好，这是一段测试文字。"
        audio_data, duration = text_to_speech(test_text)
        print(f"✅ TTS 测试完成")
        print(f"   文字: {test_text}")
        print(f"   音频大小: {len(audio_data)} bytes")
        print(f"   持续时间: {duration} ms")
    except Exception as e:
        print(f"❌ TTS 测试失败: {e}")
