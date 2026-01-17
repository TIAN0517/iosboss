"""
免費語音合成模組
使用 edge-tts（微軟 Edge TTS）
完全免費，支援繁體中文
"""
import asyncio
import os
from pathlib import Path


# ==================== 配置 ====================
# LINE Push API（用於背景推送語音）
LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"

# 輸出目錄
VOICE_OUTPUT_DIR = Path("app/static/voice")
VOICE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 可用語音（台灣腔 - 繁體中文）
VOICES = {
    # 最甜美的女聲（推薦）
    "女聲": "zh-TW-HsiaoyuNeural",        # 曉瑜 - 最甜美溫柔
    "甜美": "zh-TW-HsiaoyuNeural",        # 曉瑜 - 甜美女聲

    # 自然女聲
    "自然女聲": "zh-TW-HsiaoChenNeural",  # 曉甄 - 自然女聲

    # 台灣男聲
    "男聲": "zh-TW-YunJheNeural",          # 雲哲 - 自然男聲
}

# 甜美語音參數（更溫柔、甜美）
SWEET_PARAMS = {
    "rate": "+0%",      # 正常速度（不急促）
    "volume": "+10%",   # 稍微大聲一點
    "pitch": "+5Hz",    # 稍微高一點（更甜美）
}

# 自然語音參數（道地台灣腔）
NATURAL_PARAMS = {
    "rate": "+5%",      # 台灣說話節奏
    "volume": "+5%",    # 清晰響亮
    "pitch": "-2Hz",    # 自然音調
}

# 預設使用甜美參數
DEFAULT_PARAMS = SWEET_PARAMS


async def text_to_speech(
    text: str,
    voice: str = "女聲",
    output_filename: str = None,
    params: dict = None
) -> str:
    """
    文字轉語音（甜美版）

    Args:
        text: 要轉換的文字
        voice: 語音類型（預設甜美女聲）
        output_filename: 輸出檔名（可選）
        params: 語音參數（可選）

    Returns:
        音檔路徑（相對路徑）
    """
    import edge_tts

    # 取得語音 ID
    voice_id = VOICES.get(voice, VOICES["女聲"])

    # 使用預設甜美參數
    if params is None:
        params = DEFAULT_PARAMS

    # 生成檔名
    if not output_filename:
        import hashlib
        # 用文字內容生成唯一檔名
        text_hash = hashlib.md5(text.encode()).hexdigest()[:12]
        output_filename = f"{text_hash}.mp3"

    output_path = VOICE_OUTPUT_DIR / output_filename

    # 如果檔案已存在，直接返回
    if output_path.exists():
        return f"/static/voice/{output_filename}"

    # 生成語音（使用甜美參數）
    communicate = edge_tts.Communicate(
        text,
        voice_id,
        rate=params["rate"],
        volume=params["volume"],
        pitch=params["pitch"]
    )

    await communicate.save(str(output_path))

    return f"/static/voice/{output_filename}"


async def text_to_speech_bytes(text: str, voice: str = "女聲", params: dict = None) -> bytes:
    """
    文字轉語音（返回 bytes）- 甜美版

    Args:
        text: 要轉換的文字
        voice: 語音類型
        params: 語音參數

    Returns:
        音檔 bytes
    """
    import edge_tts

    voice_id = VOICES.get(voice, VOICES["女聲"])

    # 使用預設甜美參數
    if params is None:
        params = DEFAULT_PARAMS

    # 使用甜美參數
    communicate = edge_tts.Communicate(
        text,
        voice_id,
        rate=params["rate"],
        volume=params["volume"],
        pitch=params["pitch"]
    )

    # 收集所有音訊資料
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]

    return audio_data


def get_available_voices() -> list:
    """取得可用語音列表"""
    return list(VOICES.keys())


# ==================== 快捷函數 ====================
async def say(text: str, voice: str = "女聲") -> str:
    """
    快捷函數：文字轉語音

    Returns:
        音檔 URL 路徑
    """
    return await text_to_speech(text, voice)


if __name__ == "__main__":
    # 測試
    async def test():
        print("[測試] 生成語音...")

        result = await text_to_speech("你好，我是九九瓦斯行的語音助手")
        print(f"✅ 音檔路徑：{result}")

        # 測試 bytes
        audio_bytes = await text_to_speech_bytes("這是測試")
        print(f"✅ 音檔大小：{len(audio_bytes)} bytes")

    asyncio.run(test())
