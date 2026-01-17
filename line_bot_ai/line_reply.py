"""
LINE 回覆策略模块
处理各种类型的 LINE 消息回覆
"""
import os
import tempfile
from typing import Optional
from linebot import LineBotApi
from linebot.models import (
    TextSendMessage,
    AudioSendMessage,
    ImageSendMessage,
    VideoSendMessage,
    LocationSendMessage,
    TemplateSendMessage,
    ButtonsTemplate,
    CarouselTemplate,
    CarouselColumn,
    MessageAction,
    URIAction,
    PostbackAction,
    DatetimePickerAction,
)
from config import config
from voice_tts import text_to_speech


class LineReplyHandler:
    """LINE 回覆处理器"""

    def __init__(self):
        self.line_bot_api = LineBotApi(config.LINE_CHANNEL_ACCESS_TOKEN)
        self.tmp_audio_dir = config.TMP_AUDIO_DIR if hasattr(config, "TMP_AUDIO_DIR") else "./tmp_audio"

        # 确保临时目录存在
        os.makedirs(self.tmp_audio_dir, exist_ok=True)

    def reply_text(self, reply_token: str, text: str):
        """
        回覆文字消息

        Args:
            reply_token: LINE 回覆令牌
            text: 要回覆的文字
        """
        self.line_bot_api.reply_message(
            reply_token,
            TextSendMessage(text=text)
        )

    def reply_audio(self, reply_token: str, text: str):
        """
        回覆語音消息（先进行 TTS）

        Args:
            reply_token: LINE 回覆令牌
            text: 要转换为語音的文字
        """
        if not config.ENABLE_VOICE_OUTPUT:
            return self.reply_text(reply_token, text)

        try:
            # 生成語音
            audio_data, duration_ms = text_to_speech(text)

            # 保存到临时文件
            filename = f"reply_{reply_token[:8]}.mp3"
            filepath = os.path.join(self.tmp_audio_dir, filename)

            with open(filepath, "wb") as f:
                f.write(audio_data)

            # 构建音频 URL（假设您有一个静态文件服务）
            # 这里使用相对路径，实际部署时需要配置公网访问 URL
            audio_url = f"{self._get_base_url()}/audio/{filename}"

            self.line_bot_api.reply_message(
                reply_token,
                AudioSendMessage(
                    original_content_url=audio_url,
                    duration=duration_ms
                )
            )

        except Exception as e:
            print(f"❌ TTS 失败，回覆文字: {e}")
            self.reply_text(reply_token, text)

    def reply_text_with_audio(self, reply_token: str, text: str):
        """
        同时回覆文字和語音

        Args:
            reply_token: LINE 回覆令牌
            text: 要回覆的文字
        """
        if not config.ENABLE_VOICE_OUTPUT:
            return self.reply_text(reply_token, text)

        try:
            audio_data, duration_ms = text_to_speech(text)

            filename = f"reply_{reply_token[:8]}.mp3"
            filepath = os.path.join(self.tmp_audio_dir, filename)

            with open(filepath, "wb") as f:
                f.write(audio_data)

            audio_url = f"{self._get_base_url()}/audio/{filename}"

            self.line_bot_api.reply_message(
                reply_token,
                [
                    TextSendMessage(text=text),
                    AudioSendMessage(
                        original_content_url=audio_url,
                        duration=duration_ms
                    )
                ]
            )

        except Exception as e:
            print(f"❌ TTS 失败，仅回覆文字: {e}")
            self.reply_text(reply_token, text)

    def reply_buttons(self, reply_token: str, text: str, actions: list):
        """
        回覆按钮模板消息

        Args:
            reply_token: LINE 回覆令牌
            text: 标题文字
            actions: 按钮动作列表
        """
        template = TemplateSendMessage(
            alt_text="按钮菜单",
            template=ButtonsTemplate(
                text=text,
                actions=actions
            )
        )
        self.line_bot_api.reply_message(reply_token, template)

    def reply_carousel(self, reply_token: str, columns: list[CarouselColumn]):
        """
        回覆轮播模板消息

        Args:
            reply_token: LINE 回覆令牌
            columns: 轮播列
        """
        template = TemplateSendMessage(
            alt_text="轮播菜单",
            template=CarouselTemplate(columns=columns)
        )
        self.line_bot_api.reply_message(reply_token, template)

    def push_text(self, user_id: str, text: str):
        """
        主动推送文字消息

        Args:
            user_id: LINE 用户 ID
            text: 要推送的文字
        """
        self.line_bot_api.push_message(
            user_id,
            TextSendMessage(text=text)
        )

    def push_audio(self, user_id: str, text: str):
        """
        主动推送語音消息

        Args:
            user_id: LINE 用户 ID
            text: 要转换为語音的文字
        """
        if not config.ENABLE_VOICE_OUTPUT:
            return self.push_text(user_id, text)

        try:
            audio_data, duration_ms = text_to_speech(text)

            filename = f"push_{user_id[:8]}_{os.urandom(4).hex()}.mp3"
            filepath = os.path.join(self.tmp_audio_dir, filename)

            with open(filepath, "wb") as f:
                f.write(audio_data)

            audio_url = f"{self._get_base_url()}/audio/{filename}"

            self.line_bot_api.push_message(
                user_id,
                AudioSendMessage(
                    original_content_url=audio_url,
                    duration=duration_ms
                )
            )

        except Exception as e:
            print(f"❌ 推送語音失败: {e}")

    def _get_base_url(self) -> str:
        """获取基础 URL（用于构建音频文件 URL）"""
        # 从环境变量获取，或使用默认值
        return os.getenv("BASE_URL", "https://your-domain.com")


# 便捷函数（向后兼容）
_line_handler: Optional[LineReplyHandler] = None


def get_line_handler() -> LineReplyHandler:
    """获取全局 LINE 处理器实例"""
    global _line_handler
    if _line_handler is None:
        _line_handler = LineReplyHandler()
    return _line_handler


def reply_text(token: str, text: str):
    """回覆文字（便捷函数）"""
    get_line_handler().reply_text(token, text)


def reply_audio(token: str, text: str):
    """回覆語音（便捷函数）"""
    get_line_handler().reply_audio(token, text)


def reply_text_with_audio(token: str, text: str):
    """同时回覆文字和語音（便捷函数）"""
    get_line_handler().reply_text_with_audio(token, text)


# 创建常用按钮动作的便捷函数
def create_message_action(label: str, text: str) -> MessageAction:
    """创建消息动作"""
    return MessageAction(label=label, text=text)


def create_uri_action(label: str, uri: str) -> URIAction:
    """创建链接动作"""
    return URIAction(label=label, uri=uri)


def create_postback_action(label: str, data: str) -> PostbackAction:
    """创建回传动作"""
    return PostbackAction(label=label, data=data)


if __name__ == "__main__":
    print("📱 LINE 回覆模块测试...")
    print(f"LINE Bot 已配置: {'✓' if config.LINE_CHANNEL_ACCESS_TOKEN else '✗'}")
    print(f"語音输出: {'启用' if config.ENABLE_VOICE_OUTPUT else '禁用'}")
