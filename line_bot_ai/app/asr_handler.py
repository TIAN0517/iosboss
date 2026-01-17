"""
ASR 语音转文字处理器
支持 Whisper 和 Eightwai
"""
import os
import tempfile
from typing import Optional


class ASRHandler:
    """ASR 处理器基类"""

    def transcribe(self, audio_data: bytes, format: str = "m4a") -> str:
        """将音频转换为文字"""
        raise NotImplementedError


class WhisperASR(ASRHandler):
    """Whisper 本地 ASR（推荐）"""

    def __init__(self):
        self.model_size = os.getenv("WHISPER_MODEL", "base")
        self._model = None

    @property
    def model(self):
        """延迟加载模型"""
        if self._model is None:
            try:
                import whisper
                self._model = whisper.load_model(self.model_size)
            except ImportError:
                raise ImportError("Whisper 未安装，运行: pip install openai-whisper")
        return self._model

    def transcribe(self, audio_data: bytes, format: str = "m4a") -> str:
        """使用 Whisper 转录"""
        # 保存到临时文件
        with tempfile.NamedTemporaryFile(suffix=f".{format}", delete=False) as f:
            f.write(audio_data)
            temp_path = f.name

        try:
            result = self.model.transcribe(temp_path, language="zh")
            return result.get("text", "").strip()
        finally:
            os.unlink(temp_path)


class EightwaiASR(ASRHandler):
    """Eightwai API ASR"""

    def __init__(self):
        self.api_key = os.getenv("EIGHTWAI_ASR_API_KEY", "")
        self.api_url = os.getenv(
            "EIGHTWAI_ASR_API_URL",
            "https://api.eightwai.com/v1/audio/transcriptions"
        )

    def transcribe(self, audio_data: bytes, format: str = "m4a") -> str:
        """使用 Eightwai API 转录"""
        import requests

        if not self.api_key:
            raise ValueError("缺少 EIGHTWAI_ASR_API_KEY")

        headers = {"Authorization": f"Bearer {self.api_key}"}

        files = {
            "file": (f"audio.{format}", audio_data, f"audio/{format}")
        }

        data = {
            "language": "zh",
            "enable_punctuation": "true",
        }

        response = requests.post(
            self.api_url,
            headers=headers,
            files=files,
            data=data,
            timeout=30,
        )
        response.raise_for_status()

        return response.json().get("text", "").strip()


class MockASR(ASRHandler):
    """模拟 ASR（测试用）"""

    def transcribe(self, audio_data: bytes, format: str = "m4a") -> str:
        """返回模拟文字"""
        return "（模拟语音：请问瓦斯桶怎么换？）"


# ASR 工厂
def create_asr() -> ASRHandler:
    """根据配置创建 ASR 处理器"""
    provider = os.getenv("ASR_PROVIDER", "whisper").lower()

    if provider == "whisper":
        return WhisperASR()
    elif provider == "eightwai":
        return EightwaiASR()
    else:
        return MockASR()


# 全局 ASR 实例
_asr: Optional[ASRHandler] = None


def get_asr() -> ASRHandler:
    """获取全局 ASR 处理器"""
    global _asr
    if _asr is None:
        _asr = create_asr()
    return _asr


def speech_to_text(audio_data: bytes, format: str = "m4a") -> str:
    """
    语音转文字（便捷函数）

    Args:
        audio_data: 音频数据
        format: 音频格式

    Returns:
        识别后的文字
    """
    asr = get_asr()
    return asr.transcribe(audio_data, format)


if __name__ == "__main__":
    print("🎙 测试 ASR 模块...")
    print(f"当前 ASR 提供者: {os.getenv('ASR_PROVIDER', 'whisper')}")
    print("✅ ASR 模块加载成功")
