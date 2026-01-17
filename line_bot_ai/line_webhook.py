"""
LINE Webhook 处理模块
处理来自 LINE 平台的 Webhook 事件
"""
import logging
from typing import Dict, Optional
from fastapi import APIRouter, Request, HTTPException
from linebot import WebhookParser
from linebot.exceptions import InvalidSignatureError
from linebot.models import (
    MessageEvent,
    TextMessage,
    AudioMessage,
    ImageMessage,
    VideoMessage,
    LocationMessage,
    PostbackEvent,
    FollowEvent,
    UnfollowEvent,
    JoinEvent,
    LeaveEvent,
)
from config import config
from ai_glm47 import ask_glm, get_glm_client
from line_reply import get_line_handler, reply_text, reply_audio
from prompts import DEFAULT_SYSTEM_PROMPT

# 配置日志
logging.basicConfig(level=getattr(logging, config.LOG_LEVEL))
logger = logging.getLogger(__name__)

# 创建路由器
router = APIRouter()

# 创建 Webhook 解析器
parser = WebhookParser(config.LINE_CHANNEL_SECRET)

# 会话存储（简单的内存存储，生产环境建议使用 Redis）
user_sessions: Dict[str, list[dict]] = {}


def get_user_history(user_id: str) -> list[dict]:
    """获取用户对话历史"""
    return user_sessions.get(user_id, [])


def update_user_history(user_id: str, role: str, content: str):
    """更新用户对话历史"""
    if user_id not in user_sessions:
        user_sessions[user_id] = []

    user_sessions[user_id].append({"role": role, "content": content})

    # 限制历史长度
    if len(user_sessions[user_id]) > config.MAX_HISTORY_LENGTH:
        user_sessions[user_id] = user_sessions[user_id][-config.MAX_HISTORY_LENGTH:]


def clear_user_history(user_id: str):
    """清除用户对话历史"""
    if user_id in user_sessions:
        del user_sessions[user_id]


@router.post("/api/webhook/line")
async def line_webhook(request: Request):
    """
    LINE Webhook 端点

    接收来自 LINE 平台的事件推送
    """
    # 获取请求体和签名
    body = await request.body()
    signature = request.headers.get("X-Line-Signature", "")

    # 验证签名
    try:
        events = parser.parse(body.decode("utf-8"), signature)
    except InvalidSignatureError:
        logger.error("❌ 无效的 LINE 签名")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # 处理每个事件
    for event in events:
        logger.info(f"📨 收到事件: {type(event).__name__}")

        try:
            await handle_event(event)
        except Exception as e:
            logger.error(f"❌ 处理事件失败: {e}", exc_info=True)

    return {"status": "ok"}


async def handle_event(event):
    """处理单个事件"""

    # 消息事件
    if isinstance(event, MessageEvent):
        await handle_message_event(event)

    # Postback 事件
    elif isinstance(event, PostbackEvent):
        await handle_postback_event(event)

    # 关注事件
    elif isinstance(event, FollowEvent):
        await handle_follow_event(event)

    # 取消关注事件
    elif isinstance(event, UnfollowEvent):
        await handle_unfollow_event(event)

    # 加入群组事件
    elif isinstance(event, JoinEvent):
        await handle_join_event(event)

    # 离开群组事件
    elif isinstance(event, LeaveEvent):
        await handle_leave_event(event)


async def handle_message_event(event: MessageEvent):
    """处理消息事件"""
    user_id = event.source.user_id

    # 文字消息
    if isinstance(event.message, TextMessage):
        await handle_text_message(event, user_id)

    # 語音消息
    elif isinstance(event.message, AudioMessage):
        await handle_audio_message(event, user_id)

    # 图片消息
    elif isinstance(event.message, ImageMessage):
        await handle_image_message(event, user_id)

    # 视频消息
    elif isinstance(event.message, VideoMessage):
        await handle_video_message(event, user_id)

    # 位置消息
    elif isinstance(event.message, LocationMessage):
        await handle_location_message(event, user_id)


async def handle_text_message(event: MessageEvent, user_id: str):
    """处理文字消息"""
    message_text = event.message.text.strip()
    reply_token = event.reply_token

    logger.info(f"💬 收到文字消息: {message_text}")

    # 清除历史命令
    if message_text in ["/clear", "/清除", "/重置"]:
        clear_user_history(user_id)
        reply_text(reply_token, "🔄 对话历史已清除")
        return

    # 获取对话历史
    history = get_user_history(user_id)

    # 调用 AI
    try:
        response = ask_glm(message_text, history=history, system_prompt=DEFAULT_SYSTEM_PROMPT)

        # 回覆用户
        if config.ENABLE_VOICE_OUTPUT:
            reply_audio(reply_token, response)
        else:
            reply_text(reply_token, response)

        # 更新历史
        update_user_history(user_id, "user", message_text)
        update_user_history(user_id, "assistant", response)

    except Exception as e:
        logger.error(f"❌ AI 处理失败: {e}")
        reply_text(reply_token, f"⚠️ 处理失败，请稍后再试。\n错误: {str(e)}")


async def handle_audio_message(event: MessageEvent, user_id: str):
    """处理語音消息"""
    if not config.ENABLE_VOICE_INPUT:
        reply_text(event.reply_token, "⚠️ 語音输入功能未启用")
        return

    reply_token = event.reply_token
    message_id = event.message.id

    logger.info(f"🎤 收到語音消息: {message_id}")

    try:
        # 获取音频内容
        line_handler = get_line_handler()
        message_content = line_handler.line_bot_api.get_message_content(message_id)

        # 读取音频数据
        audio_data = b""
        for chunk in message_content.iter_content():
            audio_data += chunk

        # 語音转文字
        from voice_asr import speech_to_text
        text = speech_to_text(audio_data, format="m4a")

        logger.info(f"🔊 語音识别结果: {text}")

        # 调用 AI 处理
        history = get_user_history(user_id)
        response = ask_glm(text, history=history, system_prompt=DEFAULT_SYSTEM_PROMPT)

        # 回覆
        reply_audio(reply_token, response)

        # 更新历史
        update_user_history(user_id, "user", f"[語音] {text}")
        update_user_history(user_id, "assistant", response)

    except Exception as e:
        logger.error(f"❌ 語音处理失败: {e}")
        reply_text(reply_token, f"⚠️ 語音处理失败: {str(e)}")


async def handle_image_message(event: MessageEvent, user_id: str):
    """处理图片消息"""
    reply_token = event.reply_token
    message_id = event.message.id

    logger.info(f"🖼️  收到图片消息: {message_id}")

    reply_text(reply_token, "🖼️ 收到图片！目前仅支持文字和語音对话，图片功能开发中。")


async def handle_video_message(event: MessageEvent, user_id: str):
    """处理视频消息"""
    reply_token = event.reply_token
    message_id = event.message.id

    logger.info(f"🎬 收到视频消息: {message_id}")

    reply_text(reply_token, "🎬 收到视频！目前仅支持文字和語音对话，视频功能开发中。")


async def handle_location_message(event: MessageEvent, user_id: str):
    """处理位置消息"""
    reply_token = event.reply_token
    title = event.message.title
    address = event.message.address
    latitude = event.message.latitude
    longitude = event.message.longitude

    logger.info(f"📍 收到位置消息: {title} ({address})")

    reply_text(
        reply_token,
        f"📍 收到位置信息\n"
        f"标题: {title}\n"
        f"地址: {address}\n"
        f"坐标: {latitude}, {longitude}\n\n"
        f"我可以帮您查询附近的瓦斯行服务点！"
    )


async def handle_postback_event(event: PostbackEvent):
    """处理 Postback 事件"""
    reply_token = event.reply_token
    data = event.postback.data

    logger.info(f"📎 收到 Postback: {data}")

    # 解析 Postback 数据
    if data.startswith("action:"):
        action = data[7:]
        # 处理各种动作
        if action == "clear_history":
            user_id = event.source.user_id
            clear_user_history(user_id)
            reply_text(reply_token, "🔄 对话历史已清除")
        elif action == "help":
            reply_text(reply_token, get_help_text())
        else:
            reply_text(reply_token, f"收到动作: {action}")
    else:
        reply_text(reply_token, f"收到数据: {data}")


async def handle_follow_event(event: FollowEvent):
    """处理关注事件"""
    reply_token = event.reply_token

    logger.info(f"👥 用户关注: {event.source.user_id}")

    welcome_text = (
        "👋 欢迎使用九九瓦斯行 LINE Bot！\n\n"
        "我可以帮您：\n"
        "• 查询瓦斯库存和价格\n"
        "• 安排配送服务\n"
        "• 查询订单状态\n"
        "• 解答瓦斯相关问题\n\n"
        "您可以用文字或語音与我对话。\n"
        "输入 /clear 可以清除对话历史。"
    )

    reply_text(reply_token, welcome_text)


async def handle_unfollow_event(event: UnfollowEvent):
    """处理取消关注事件"""
    user_id = event.source.user_id

    logger.info(f"👤 用户取消关注: {user_id}")

    # 清除该用户的历史记录
    clear_user_history(user_id)


async def handle_join_event(event: JoinEvent):
    """处理加入群组事件"""
    reply_token = event.reply_token

    logger.info(f"🎉 Bot 加入群组")

    reply_text(
        reply_token,
        "👋 大家好！我是九九瓦斯行助理。\n"
        "有什么需要帮助的请随时告诉我！"
    )


async def handle_leave_event(event: LeaveEvent):
    """处理离开群组事件"""
    logger.info(f"👋 Bot 离开群组")


def get_help_text() -> str:
    """获取帮助文字"""
    return (
        "📖 使用帮助\n\n"
        "支持的命令：\n"
        "• /clear 或 /清除 - 清除对话历史\n"
        "• /help - 显示此帮助\n\n"
        "支持的功能：\n"
        "• 文字对话 - 直接发送消息\n"
        "• 語音输入 - 发送語音消息\n"
        "• 語音输出 - AI 回复会以語音播放\n\n"
        "有什么问题请随时询问！"
    )


if __name__ == "__main__":
    print("📡 LINE Webhook 模块测试...")
    print(f"端点: POST /api/webhook/line")
