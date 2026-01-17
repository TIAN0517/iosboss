"""
語音辨識 (ASR) 模块
支持 Eightwai、Google、Azure、Whisper 等多種 ASR 提供商
"""
import os
import tempfile
from typing import Optional
from pathlib import Path
from config import config


class ASRProvider:
    """語音辨識提供者基类"""

    def speech_to_text(self, audio_data: bytes, format: str = "m4a") -> str:
        """将語音转换为文字"""
        raise NotImplementedError


class EightwaiASR(ASRProvider):
    """Eightwai 語音辨識"""

    def __init__(self):
        self.api_key = config.EIGHTWAI_ASR_API_KEY
        self.api_url = config.EIGHTWAI_ASR_API_URL

    def speech_to_text(self, audio_data: bytes, format: str = "m4a") -> str:
        """使用 Eightwai API 进行語音辨識"""
        import requests

        # 保存到临时文件
        with tempfile.NamedTemporaryFile(
            suffix=f".{format}", delete=False
        ) as tmp_file:
            tmp_file.write(audio_data)
            tmp_path = tmp_file.name

        try:
            headers = {"Authorization": f"Bearer {self.api_key}"}

            files = {"file": (f"audio.{format}", audio_data, f"audio/{format}")}

            data = {
                "language": config.ASR_LANGUAGE,
                "enable_punctuation": str(config.ASR_ENABLE_PUNCTUATION).lower(),
            }

            response = requests.post(
                self.api_url,
                headers=headers,
                files=files,
                data=data,
                timeout=30,
            )
            response.raise_for_status()

            result = response.json()
            return result.get("text", "")

        finally:
            # 清理临时文件
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


class GoogleASR(ASRProvider):
    """Google Cloud Speech-to-Text"""

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_ASR_API_KEY", "")
        self.api_url = (
            f"https://speech.googleapis.com/v1p1beta1/speech:recognize"
            f"?key={self.api_key}"
        )

    def speech_to_text(self, audio_data: bytes, format: str = "m4a") -> str:
        """使用 Google API 进行語音辨識"""
        import base64
        import requests

        audio_base64 = base64.b64encode(audio_data).decode("utf-8")

        payload = {
            "config": {
                "encoding": "LINEAR16",
                "sampleRateHertz": 16000,
                "languageCode": config.ASR_LANGUAGE,
                "enableAutomaticPunctuation": config.ASR_ENABLE_PUNCTUATION,
            },
            "audio": {"content": audio_base64},
        }

        response = requests.post(self.api_url, json=payload, timeout=30)
        response.raise_for_status()

        result = response.json()
        if "results" in result and result["results"]:
            return result["results"][0]["alternatives"][0]["transcript"]
        return ""


class WhisperASR(ASRProvider):
    """OpenAI Whisper 本地語音辨識"""

    def __init__(self):
        self.model_size = os.getenv("WHISPER_MODEL", "base")

    def speech_to_text(self, audio_data: bytes, format: str = "m4a") -> str:
        """使用 Whisper 进行本地語音辨識"""
        try:
            import whisper
        except ImportError:
            raise ImportError("请先安装 whisper: pip install openai-whisper")

        # 保存到临时文件
        with tempfile.NamedTemporaryFile(
            suffix=f".{format}", delete=False
        ) as tmp_file:
            tmp_file.write(audio_data)
            tmp_path = tmp_file.name

        try:
            # 加载模型
            model = whisper.load_model(self.model_size)

            # 转录
            result = model.transcribe(tmp_path, language="zh")
            return result.get("text", "")

        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


class MockASR(ASRProvider):
    """模拟 ASR（用于测试）"""

    def speech_to_text(self, audio_data: bytes, format: str = "m4a") -> str:
        """返回模拟文字"""
        return "（這是模擬的語音辨識結果）"


# ASR 工厂
def create_asr_provider() -> ASRProvider:
    """根据配置创建 ASR 提供者"""
    provider = config.ASR_PROVIDER.lower()

    if provider == "eightwai":
        return EightwaiASR()
    elif provider == "google":
        return GoogleASR()
    elif provider == "whisper":
        return WhisperASR()
    else:
        print(f"⚠️  未知的 ASR 提供者: {provider}，使用 MockASR")
        return MockASR()


# 全局 ASR 实例
_asr_provider: Optional[ASRProvider] = None


def get_asr_provider() -> ASRProvider:
    """获取全局 ASR 提供者实例"""
    global _asr_provider
    if _asr_provider is None:
        _asr_provider = create_asr_provider()
    return _asr_provider


def speech_to_text(audio_data: bytes, format: str = "m4a") -> str:
    """
    語音转文字（便捷函数）

    Args:
        audio_data: 音频数据（bytes）
        format: 音频格式（m4a, mp3, wav 等）

    Returns:
        识别后的文字
    """
    provider = get_asr_provider()
    return provider.speech_to_text(audio_data, format)


def speech_to_text_from_file(audio_path: str) -> str:
    """
    从文件进行語音转文字

    Args:
        audio_path: 音频文件路径

    Returns:
        识别后的文字
    """
    with open(audio_path, "rb") as f:
        audio_data = f.read()

    # 根据扩展名判断格式
    format = Path(audio_path).suffix.lstrip(".")
    return speech_to_text(audio_data, format)


if __name__ == "__main__":
    print("🎤 测试 ASR 模块...")
    print(f"当前 ASR 提供者: {config.ASR_PROVIDER}")

    # 创建测试音频数据
    test_audio = b"fake audio data"
    try:
        result = speech_to_text(test_audio)
        print(f"✅ ASR 测试完成: {result}")
    except Exception as e:
        print(f"❌ ASR 测试失败: {e}")
