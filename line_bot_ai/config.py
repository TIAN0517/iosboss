"""
LINE Bot AI 配置文件
包含所有金鑰與設定
"""
import os
from typing import Optional
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

class Config:
    """應用配置類"""

    # ========== FastAPI 伺服器設定 ==========
    APP_NAME: str = "LINE Bot AI Service"
    APP_VERSION: str = "1.0.0"
    HOST: str = os.getenv("FASTAPI_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("FASTAPI_PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

    # ========== LINE Bot 設定 ==========
    LINE_CHANNEL_ACCESS_TOKEN: str = os.getenv(
        "LINE_CHANNEL_ACCESS_TOKEN",
        ""
    )
    LINE_CHANNEL_SECRET: str = os.getenv(
        "LINE_CHANNEL_SECRET",
        ""
    )

    # ========== GLM-4.7 AI 設定 ==========
    GLM_API_KEY: str = os.getenv("GLM_API_KEY", "")
    GLM_API_KEYS: list[str] = [
        k.strip() for k in os.getenv("GLM_API_KEYS", "").split(",")
        if k.strip()
    ] or [os.getenv("GLM_API_KEY", "")]

    # GLM 模型設定
    GLM_MODEL: str = os.getenv("GLM_MODEL", "glm-4.7-coding-max")
    GLM_FALLBACK_MODEL: str = os.getenv("GLM_FALLBACK_MODEL", "glm-4-flash")
    GLM_API_BASE: str = os.getenv("GLM_API_BASE", "https://open.bigmodel.cn/api/paas/v4/")
    GLM_TIMEOUT: int = int(os.getenv("GLM_TIMEOUT", "60"))
    GLM_MAX_RETRIES: int = int(os.getenv("GLM_MAX_RETRIES", "3"))

    # ========== 語音辨識 (ASR) 設定 ==========
    ASR_PROVIDER: str = os.getenv("ASR_PROVIDER", "eightwai")  # eightwai | google | azure
    EIGHTWAI_ASR_API_KEY: str = os.getenv("EIGHTWAI_ASR_API_KEY", "")
    EIGHTWAI_ASR_API_URL: str = os.getenv(
        "EIGHTWAI_ASR_API_URL",
        "https://api.eightwai.com/v1/audio/transcriptions"
    )
    ASR_LANGUAGE: str = os.getenv("ASR_LANGUAGE", "zh-TW")
    ASR_ENABLE_PUNCTUATION: bool = True

    # ========== 語音合成 (TTS) 設定 ==========
    TTS_PROVIDER: str = os.getenv("TTS_PROVIDER", "eightwai")  # eightwai | google | azure
    EIGHTWAI_TTS_API_KEY: str = os.getenv("EIGHTWAI_TTS_API_KEY", "")
    EIGHTWAI_TTS_API_URL: str = os.getenv(
        "EIGHTWAI_TTS_API_URL",
        "https://api.eightwai.com/v1/audio/speech"
    )
    TTS_VOICE: str = os.getenv("TTS_VOICE", "zh-TW-HsiaoChenNeural")
    TTS_SPEED: float = float(os.getenv("TTS_SPEED", "1.0"))
    TTS_OUTPUT_FORMAT: str = "mp3"

    # ========== ZhipuAI SDK 設定 (替代方案) ==========
    ZHIPU_API_KEY: str = os.getenv("ZHIPU_API_KEY", "")

    # ========== 會話管理設定 ==========
    SESSION_TTL: int = int(os.getenv("SESSION_TTL", "1800"))  # 30分鐘
    MAX_HISTORY_LENGTH: int = int(os.getenv("MAX_HISTORY_LENGTH", "20"))
    ENABLE_STREAMING: bool = os.getenv("ENABLE_STREAMING", "True").lower() == "true"

    # ========== 資料庫連線 (可選) ==========
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL")

    # ========== 臨時目錄設定 ==========
    TMP_AUDIO_DIR: str = os.getenv("TMP_AUDIO_DIR", "temp_audio")

    # ========== 日誌設定 ==========
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/app.log")

    # ========== 安全設定 ==========
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALLOWED_ORIGINS: list[str] = [
        origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    ]

    # ========== 功能開關 ==========
    ENABLE_VOICE_INPUT: bool = os.getenv("ENABLE_VOICE_INPUT", "True").lower() == "true"
    ENABLE_VOICE_OUTPUT: bool = os.getenv("ENABLE_VOICE_OUTPUT", "True").lower() == "true"
    ENABLE_RICH_MENU: bool = os.getenv("ENABLE_RICH_MENU", "True").lower() == "true"

    @classmethod
    def validate(cls) -> bool:
        """驗證必要配置是否完整"""
        errors = []

        if not cls.LINE_CHANNEL_ACCESS_TOKEN:
            errors.append("缺少 LINE_CHANNEL_ACCESS_TOKEN")

        if not cls.LINE_CHANNEL_SECRET:
            errors.append("缺少 LINE_CHANNEL_SECRET")

        if not any(cls.GLM_API_KEYS):
            errors.append("缺少 GLM_API_KEY 或 GLM_API_KEYS")

        if errors:
            print("❌ 配置驗證失敗：")
            for error in errors:
                print(f"   - {error}")
            return False

        return True

    def __repr__(self) -> str:
        return (
            f"<Config "
            f"LINE_Bot={'✓' if self.LINE_CHANNEL_ACCESS_TOKEN else '✗'} "
            f"GLM_AI={'✓' if any(self.GLM_API_KEYS) else '✗'} "
            f"ASR={self.ASR_PROVIDER} "
            f"TTS={self.TTS_PROVIDER}"
            f">"
        )


# 全局配置實例
config = Config()

if __name__ == "__main__":
    print("📋 配置檢查：")
    print(f"   {config}")
    print(f"\n驗證結果：{'✅ 通過' if config.validate() else '❌ 失敗'}")
