"""
LINE Bot AI Service - FastAPI 主入口
九九瓦斯行 LINE Bot + GLM-4.7 MAX

功能：
- 帝皇瓦斯行群組：彈性上下班 + 打卡記錄
- 員工群組：休假圖片辨識 + 自動入庫
"""
import os
import json
import hmac
import hashlib
import base64
from typing import Dict
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import requests

from app.prompt_loader import PROMPTS
from app.ai_handler import ask_glm
from app.attendance import get_attendance_manager, DIHUANG_GROUP_ID
from app.leave_schedule import handle_leave_command
from app.leave_requests import get_leave_manager
from app.image_ocr import get_ocr
from app.voice import text_to_speech
from app.employee import handle_employee_command
from app.knowledge import handle_knowledge_command, get_knowledge_menu
from app.sync import (
    get_today_orders,
    get_pending_orders,
    search_customer,
    get_low_inventory,
    get_today_revenue,
    format_sync_status,
)

# ==================== 配置 ====================
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")

LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply"

# 群組 ID 配置（從環境變量讀取）
ZHANG_GROUP_ID = os.getenv("ZHANG_GROUP_ID", "C986ae8b3208735b53872a6d609a7bbe7")  # 張家群組（老闆）

HEADERS = {
    "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

# 会话存储（简单内存存储）
sessions: Dict[str, list[dict]] = {}

# 打卡管理器
attendance_mgr = get_attendance_manager()

# 休假管理器
leave_mgr = get_leave_manager()

# OCR 辨識器
ocr = get_ocr()

# 員工群組 ID（待設定）
EMPLOYEE_GROUP_ID = os.getenv("EMPLOYEE_GROUP_ID", "")


# ==================== 工具函数 ====================
def verify_signature(body: bytes, signature: str) -> bool:
    """验证 LINE Signature"""
    if not LINE_CHANNEL_SECRET:
        return True  # 开发环境跳过

    # 計算 HMAC-SHA256
    hash_digest = hmac.new(
        LINE_CHANNEL_SECRET.encode("utf-8"),
        body,
        hashlib.sha256
    ).digest()

    # LINE 的 signature 是 base64 編碼的 hex digest
    # 將我們計算的 hash 轉換為 base64
    expected_signature = base64.b64encode(hash_digest).decode("utf-8")

    # 比較 signature
    return hmac.compare_digest(expected_signature, signature) if signature else False


def should_reply(event: dict) -> bool:
    """
    判断是否该回复

    规则：
    - 私聊 → 一律回
    - 帝皇瓦斯行群組 → 一律回（支援打卡）
    - 張家群組 → 一律回（老闆群組）
    - 員工群組 → 一律回（員工專用）
    - 其他群组/房间 → 必须叫"瓦斯助手"
    """
    source = event.get("source", {})
    msg = event.get("message", {})
    text = msg.get("text", "")

    # 私聊 → 一定回
    if source.get("type") == "user":
        return True

    group_id = source.get("groupId", "")

    # 帝皇瓦斯行群組 → 一定回
    if group_id == DIHUANG_GROUP_ID:
        return True

    # 張家群組（老闆群組）→ 一定回
    if group_id == ZHANG_GROUP_ID:
        return True

    # 員工群組 → 一定回
    if group_id == EMPLOYEE_GROUP_ID:
        return True

    # 群组 / 房间 → 必须叫「瓦斯助手」
    if source.get("type") in ["group", "room"]:
        return "瓦斯助手" in text

    return False


def get_group_type(group_id: str) -> str:
    """
    获取群組类型

    返回：
    - "dihuang"：帝皇瓦斯行（只有打卡功能）
    - "boss"：老闆群組（張家，全功能）
    - "employee"：員工群組
    - "other"：其他
    """
    if group_id == DIHUANG_GROUP_ID:
        return "dihuang"  # 帝皇瓦斯行只有打卡

    if group_id == ZHANG_GROUP_ID:
        return "boss"  # 張家群組是老闆全功能

    if group_id == EMPLOYEE_GROUP_ID:
        return "employee"

    return "other"


def is_attendance_command(text: str) -> bool:
    """檢查是否為打卡指令"""
    keywords = ["打卡", "上班", "下班", "今天紀錄", "查詢紀錄", "本週紀錄", "打卡紀錄"]
    return any(kw in text for kw in keywords)


def line_reply(reply_token: str, text: str, voice_url: str = None, flex_message: dict = None):
    """回复 LINE 消息（支援文字、語音、Flex Message）"""
    messages = []

    # 優先發送 Flex Message（卡片樣式）
    if flex_message:
        messages.append(flex_message)

    # 如果有語音 URL，發送語音訊息
    if voice_url:
        # 構建公開 URL（透過 Cloudflare Tunnel）
        public_url = f"https://linebot.tiankai.it.com{voice_url}"

        messages.append({
            "type": "audio",
            "originalContentUrl": public_url,
            "duration": 5000  # 預估 5 秒
        })

    # 文字訊息（可選，顯示文字內容）
    if text and not flex_message:  # 如果有 Flex Message 就不發文字
        messages.append({
            "type": "text",
            "text": text
        })

    payload = {
        "replyToken": reply_token,
        "messages": messages
    }

    try:
        response = requests.post(
            LINE_REPLY_URL,
            headers=HEADERS,
            json=payload,
            timeout=10
        )

        # 檢查回應狀態
        print(f"[LINE API] 狀態碼: {response.status_code}")

        if response.status_code == 200:
            print(f"[LINE API] 成功發送")
        else:
            print(f"[LINE API] 錯誤回應: {response.status_code}")
            print(f"[LINE API] 回應內容: {response.text}")

        # 檢查回應內容
        try:
            response_data = response.json()
            if response_data.get("details"):
                print(f"[LINE API] 詳細錯誤: {json.dumps(response_data['details'], ensure_ascii=False)}")
        except:
            pass

    except Exception as e:
        print(f"[LINE API] 發送失敗: {e}")


# ==================== FastAPI 應用程式 ====================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用程式生命週期"""
    print("=" * 60)
    print("[啟動] LINE 機器人 AI 服務")
    print("=" * 60)
    print("[就緒] 服務已啟動")
    print(f"   網路掛接端點: /api/webhook/line")
    print("=" * 60)
    yield
    print("[停止] 服務已關閉")


app = FastAPI(
    title="LINE 機器人 AI 服務",
    description="九九瓦斯行 LINE 機器人 + GLM-4.7 MAX",
    version="1.0.0",
    lifespan=lifespan,
)


# ==================== 根路徑 ====================
@app.get("/")
async def root():
    """服務資訊"""
    return {
        "服務": "LINE 機器人 AI 服務",
        "狀態": "運行中",
        "端點": {
            "健康檢查": "/api/health",
            "網路掛接": "/api/webhook/line",
            "語音聊天": "/voice"
        }
    }


# ==================== 靜態檔案服務 ====================
app.mount("/static", StaticFiles(directory="app/static"), name="static")


# ==================== 語音聊天頁面 ====================
@app.get("/voice")
async def voice_chat_page():
    """語音聊天頁面"""
    return FileResponse("app/static/voice-chat.html")


# ==================== 語音聊天 API ====================
@app.post("/api/voice/chat")
async def voice_chat(request: Request):
    """語音聊天 API（優化版：更快、更準確）"""
    body = await request.json()
    message = body.get("message", "")

    if not message:
        raise HTTPException(status_code=400, detail="缺少訊息內容")

    try:
        # 使用客服 prompt
        system_prompt = PROMPTS["core"] + "\n\n" + PROMPTS["customer"]

        # 呼叫 AI
        answer = ask_glm(message, system_prompt, [])

        # 生成語音（台灣腔優化）
        voice_url = await text_to_speech(answer, voice="女聲")

        return {
            "text": answer,
            "voice_url": voice_url,
            "recognition_quality": "85%"  # Web Speech API 準確度
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/voice/chat-pro")
async def voice_chat_pro(request: Request):
    """
    專業版語音聊天 API（使用 Groq，接近豆包體驗）

    需要 GROQ_API_KEY 環境變數
    """
    from app.realtime_voice import process_realtime_voice

    # 檢查是否有 Groq API Key
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(
            status_code=400,
            detail="專業版需要 GROQ_API_KEY。免費申請：https://console.groq.com"
        )

    # 獲取音訊資料（base64 或檔案）
    body = await request.json()
    audio_data = body.get("audio")  # base64 編碼的音訊

    if not audio_data:
        raise HTTPException(status_code=400, detail="缺少音訊資料")

    try:
        import base64

        # 解碼音訊
        audio_bytes = base64.b64decode(audio_data)

        # 處理語音對話
        result = await process_realtime_voice(audio_bytes)

        return {
            "user_text": result.get("user_text", ""),
            "ai_text": result.get("ai_text", ""),
            "audio_url": result.get("audio_url", ""),
            "recognition_quality": "95%",  # Groq Whisper 準確度
            "processing_time": "<1s"  # 超快處理
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 健康檢查 ====================
@app.get("/api/health")
async def health():
    """健康檢查"""
    return {"狀態": "正常"}


# ==================== LINE 網路掛接 ====================
@app.get("/api/webhook/line")
async def line_webhook_get():
    """LINE 網路掛接 GET - 用於驗證"""
    return {"狀態": "正常"}


@app.post("/api/webhook/line")
async def line_webhook(
    request: Request,
    x_line_signature: str = Header(None)
):
    """LINE Webhook 端点 - 快速回應模式（避免超時）"""
    body = await request.body()

    # 验证签名
    if not verify_signature(body, x_line_signature):
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload = json.loads(body.decode('utf-8'))
    events = payload.get("events", [])

    # 【關鍵修復】立即返回 200，避免 LINE 超時
    # 然後在背景處理事件
    import asyncio
    asyncio.create_task(process_events_background(events))

    return {"狀態": "正常"}


async def process_events_background(events: list):
    """背景處理 LINE 事件（避免阻塞 webhook 回應）"""
    for event in events:
        # 記錄所有事件詳情（用於抓取群組 ID）
        source = event.get("source", {})
        source_type = source.get("type")
        group_id = source.get("groupId")
        room_id = source.get("roomId")
        user_id = source.get("userId")

        print("=" * 60)
        print(f"[事件] 收到事件: {event.get('type')}")
        print(f"   來源類型: {source_type}")
        print(f"   完整 source: {json.dumps(source, ensure_ascii=False)}")
        if group_id:
            print(f"   [群組] 群組 ID: {group_id}")
        if room_id:
            print(f"   [房間] 房間 ID: {room_id}")
        if user_id:
            print(f"   [用戶] 用戶 ID: {user_id}")
        else:
            print(f"   [警告] 沒有用戶 ID！")

        message = event.get("message", {})
        if message.get("type") == "text":
            print(f"   [訊息] 訊息: {message.get('text')}")
        elif message.get("type") == "image":
            print(f"   [圖片] 圖片訊息")
        print("=" * 60)

        # 只處理訊息事件
        if event.get("type") != "message":
            continue

        # 判斷是否該回覆
        if not should_reply(event):
            continue

        message = event["message"]
        reply_token = event["replyToken"]
        message_type = message["type"]

        # ==================== 處理圖片訊息（休假申請） ====================
        if message_type == "image":
            # 只在員工群組處理圖片
            source = event.get("source", {})
            group_id = source.get("groupId", "")

            if group_id == EMPLOYEE_GROUP_ID:
                user_id = source.get("userId") or source.get("user_id", "")
                image_url = message.get("originalContentUrl", "")

                if image_url:
                    # 嘗試 OCR 辨識
                    line_reply(reply_token, "🔄 正在辨識休假圖片，請稍候...")
                    try:
                        ocr_result = ocr.recognize_leave_image(image_url)

                        if "error" in ocr_result:
                            line_reply(reply_token, f"❌ 辨識失敗：{ocr_result['error']}")
                        else:
                            # 建立休假申請
                            leave_request = leave_mgr.create_request(
                                user_id=user_id,
                                user_name=ocr_result.get("applicant", ""),
                                leave_type=ocr_result.get("leave_type", ""),
                                start_date=ocr_result.get("start_date", ""),
                                end_date=ocr_result.get("end_date", ""),
                                start_time=ocr_result.get("start_time", ""),
                                end_time=ocr_result.get("end_time", ""),
                                reason=ocr_result.get("reason", ""),
                                image_url=image_url,
                            )

                            reply_msg = f"✅ 休假申請已建立\n\n{leave_request.format_display()}\n\n等待老闆批准..."
                            line_reply(reply_token, reply_msg)

                    except Exception as e:
                        line_reply(reply_token, f"❌ 處理失敗：{str(e)}")
                continue

        # ==================== 處理文字訊息 ====================
        if message_type != "text":
            continue

        # 提取用戶文字（去掉"瓦斯助手"）
        user_text = message["text"].replace("瓦斯助手", "").strip()

        if not user_text:
            continue

        # 取得用戶 ID 和群組 ID
        # LINE API 使用 userId (駝峰式)，不是 user_id
        source = event.get("source", {})
        user_id = source.get("userId") or source.get("user_id", "")
        group_id = source.get("groupId", "")

        # ==================== 帝皇瓦斯行打卡功能 ====================
        if group_id == DIHUANG_GROUP_ID:
            # 打卡指令處理
            if is_attendance_command(user_text):
                reply_msg = ""

                if "上班" in user_text or "打卡" in user_text:
                    reply_msg = attendance_mgr.clock_in(user_id)

                elif "下班" in user_text:
                    reply_msg = attendance_mgr.clock_out(user_id)

                elif "今天紀錄" in user_text or "查詢紀錄" in user_text or "打卡紀錄" in user_text:
                    reply_msg = attendance_mgr.get_today_records(group_id)

                elif "本週紀錄" in user_text:
                    reply_msg = attendance_mgr.get_week_records(group_id)

                line_reply(reply_token, reply_msg)
                continue

            # 帝皇瓦斯行使用特殊 prompt
            system_prompt = (
                PROMPTS["core"]
                + "\n\n"
                + PROMPTS["dihuang"]
            )

        # ==================== 群組權限分類處理 ====================
        group_type = get_group_type(group_id)

        # ==================== 張家群組 - 老闆全功能 ====================
        if group_type == "boss":  # 張家群組
            # 同步狀態查詢
            if "同步狀態" in user_text or "連線狀態" in user_text:
                reply_msg = format_sync_status()
                line_reply(reply_token, reply_msg)
                continue

            # 今日訂單查詢
            elif "今日訂單" in user_text or "今天訂單" in user_text:
                reply_msg = get_today_revenue()
                line_reply(reply_token, reply_msg)
                continue

            # 待處理訂單
            elif "待處理" in user_text or "pending" in user_text.lower():
                reply_msg = get_pending_orders()
                line_reply(reply_token, reply_msg)
                continue

            # 客戶搜尋（格式：客戶 [關鍵字]）
            elif user_text.startswith("客戶 "):
                keyword = user_text[3:].strip()
                if keyword:
                    reply_msg = search_customer(keyword)
                    line_reply(reply_token, reply_msg)
                    continue

            # 庫存查詢
            elif "庫存" in user_text or "存貨" in user_text:
                reply_msg = get_low_inventory()
                line_reply(reply_token, reply_msg)
                continue

            # 營收統計
            elif "營收" in user_text or "營業額" in user_text:
                reply_msg = get_today_revenue()
                line_reply(reply_token, reply_msg)
                continue

            # 休假表查詢（老闆也可以查看）
            leave_reply = handle_leave_command(user_text)
            if leave_reply:
                line_reply(reply_token, leave_reply)
                continue

            # 老闆群組使用特殊 prompt
            system_prompt = (
                PROMPTS["core"]
                + "\n\n"
                + PROMPTS["dihuang"]
            )

        # ==================== 員工群組 - 員工自助功能 ====================
        elif group_id == EMPLOYEE_GROUP_ID:
            # 檢查員工指令（返回卡片）
            employee_reply, employee_card = handle_employee_command(user_text)
            if employee_card:
                line_reply(reply_token, None, flex_message=employee_card)
                continue
            if employee_reply:
                line_reply(reply_token, employee_reply)
                continue

            # 檢查休假表指令（記錄或查詢）
            leave_reply = handle_leave_command(user_text)
            if leave_reply:
                line_reply(reply_token, leave_reply)
                continue

            # 檢查請假和借支申請
            from app.employee import handle_employee_request
            request_reply = handle_employee_request(user_text, user_id, leave_mgr=None)
            if request_reply:
                line_reply(reply_token, request_reply)
                continue

            # 瓦斯維修教學查詢
            knowledge_reply = handle_knowledge_command(user_text)
            if knowledge_reply:
                line_reply(reply_token, knowledge_reply)
                continue

            # 員工群組使用客服 prompt
            system_prompt = (
                PROMPTS["core"]
                + "\n\n"
                + PROMPTS["customer"]
            )

        else:
            # 其他群組使用客服 prompt
            system_prompt = (
                PROMPTS["core"]
                + "\n\n"
                + PROMPTS["customer"]
            )

        # 清除歷史記錄指令
        if user_text in ["/clear", "/清除"]:
            sessions.pop(user_id, None)
            line_reply(reply_token, "🔄 對話已清除")
            continue

        # 取得歷史記錄
        history = sessions.get(user_id, [])

        # 呼叫 AI
        print(f"[AI] 呼叫 AI: user_text='{user_text}', user_id='{user_id}'")
        try:
            answer = ask_glm(user_text, system_prompt, history)
            print(f"[AI] 回應: {answer[:50]}...")

            # 【快速回覆】先送文字，避免 reply token 超時
            line_reply(reply_token, answer)
            print(f"[發送] 已回覆給用戶（文字模式）")

            # 【背景生成】語音在背景生成（使用 Push API 發送）
            async def generate_voice_bg():
                try:
                    voice_url = await text_to_speech(answer, voice="女聲")
                    print(f"[語音] 已生成: {voice_url}")
                    # 使用 Push API 發送語音（需要 user_id 或 group_id）
                    from app.voice import LINE_PUSH_URL
                    voice_payload = {
                        "to": source.get("groupId") or source.get("userId"),
                        "messages": [
                            {
                                "type": "audio",
                                "originalContentUrl": voice_url,
                                "duration": 5000  # 預估 5 秒
                            }
                        ]
                    }
                    requests.post(LINE_PUSH_URL, headers=HEADERS, json=voice_payload, timeout=5)
                    print(f"[語音] 已推送到群組")
                except Exception as e:
                    print(f"[語音] 背景生成失敗: {e}")

            # 在背景執行（不阻塞主流程）
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                loop.create_task(generate_voice_bg())
            except RuntimeError:
                # 沒有運行中的 loop，忽略語音
                pass

            # 更新歷史記錄
            if user_id not in sessions:
                sessions[user_id] = []
            sessions[user_id].extend([
                {"role": "user", "content": user_text},
                {"role": "assistant", "content": answer}
            ])

            # 限制歷史記錄長度
            if len(sessions[user_id]) > 20:
                sessions[user_id] = sessions[user_id][-20:]

        except Exception as e:
            print(f"[錯誤] AI 處理失敗: {e}")
            line_reply(reply_token, "⚠️ 目前系統忙碌，請稍後再試。")

    return {"狀態": "正常"}


# ==================== 打卡紀錄 API（勞基法要求） ====================
@app.get("/api/attendance/today")
async def get_attendance_today():
    """獲取今天的打卡紀錄（API 查詢）"""
    records = attendance_mgr.get_today_records(DIHUANG_GROUP_ID)
    return {
        "date": attendance_mgr.records[0].date if attendance_mgr.records else "",
        "records": records,
        "purpose": "勞基法上下班紀錄"
    }


@app.get("/api/attendance/week")
async def get_attendance_week():
    """獲取本週的打卡紀錄（API 查詢）"""
    records = attendance_mgr.get_week_records(DIHUANG_GROUP_ID)
    return {
        "records": records,
        "purpose": "勞基法上下班紀錄"
    }


@app.get("/api/attendance/all")
async def get_attendance_all():
    """獲取所有打卡紀錄（API 查詢）"""
    from datetime import datetime

    return {
        "group_id": DIHUANG_GROUP_ID,
        "group_name": "帝皇瓦斯行",
        "total_records": len(attendance_mgr.records),
        "records": [r.to_dict() for r in attendance_mgr.records],
        "exported_at": datetime.now().isoformat(),
        "purpose": "勞基法上下班紀錄"
    }


# ==================== 測試端點 ====================
@app.post("/api/test/chat")
async def test_chat(request: Request):
    """測試 AI 聊天"""
    body = await request.json()
    message = body.get("message", "")

    if not message:
        raise HTTPException(status_code=400, detail="缺少訊息內容")

    try:
        system_prompt = PROMPTS["core"] + "\n\n" + PROMPTS["customer"]
        answer = ask_glm(message, system_prompt, [])
        return {"訊息": message, "回應": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("FASTAPI_PORT", "9999"))  # 默認 9999，與 Docker 一致
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
