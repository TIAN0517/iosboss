"""
LINE Flex Message 卡片模組
創建漂亮的卡片樣式訊息（類似機票樣式）
"""
from typing import List, Dict


def create_menu_card(title: str, items: List[Dict], icon_emoji: str = "📋") -> dict:
    """
    創建功能選單卡片

    Args:
        title: 卡片標題
        items: 功能項目列表 [{"label": "功能名", "action": "說明", "emoji": "🔥"}]
        icon_emoji: 主要圖示

    Returns:
        Flex Message dict
    """
    # 建構按鈕項目
    action_contents = []
    for idx, item in enumerate(items[:4]):  # 最多4個項目
        action_contents.append({
            "type": "box",
            "layout": "horizontal",
            "contents": [
                {
                    "type": "text",
                    "text": item.get("emoji", "📌"),
                    "size": "sm",
                    "align": "center",
                    "gravity": "center"
                },
                {
                    "type": "text",
                    "text": item["label"],
                    "size": "sm",
                    "weight": "bold",
                    "align": "start",
                    "gravity": "center",
                    "margin": "md"
                }
            ],
            "margin": "sm" if idx > 0 else "none",
            "action": {
                "type": "message",
                "label": item["label"],
                "text": item.get("action", item["label"])
            }
        })

    return {
        "type": "flex",
        "altText": title,
        "contents": {
            "type": "bubble",
            "size": "mega",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": icon_emoji,
                                "size": "xl",
                                "align": "center"
                            },
                            {
                                "type": "text",
                                "text": title,
                                "weight": "bold",
                                "size": "xl",
                                "margin": "md",
                                "align": "center",
                                "gravity": "center"
                            }
                        ],
                        "padding": "lg",
                        "backgroundColor": "#F97316",  # 橘色背景
                        "cornerRadius": "xxl",
                        "spacing": "sm"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": action_contents,
                        "margin": "lg",
                        "spacing": "sm"
                    }
                ]
            },
            "styles": {
                "body": {
                    "backgroundColor": "#FFF7ED"  // 淡橘色背景
                }
            }
        }
    }


def create_employee_menu_card() -> dict:
    """員工功能選單卡片"""
    items = [
        {"label": "請假申請", "action": "請假教學", "emoji": "🏖️"},
        {"label": "借支申請", "action": "借支教學", "emoji": "💰"},
        {"label": "休假狀態", "action": "休假狀態", "emoji": "📊"},
        {"label": "工作提醒", "action": "工作提醒", "emoji": "⏰"},
        {"label": "知識教學", "action": "知識教學", "emoji": "📚"},
        {"label": "AI 助理", "action": "你好", "emoji": "🤖"},
    ]

    return create_menu_card("員工功能選單", items, "👷")


def create_boss_menu_card() -> dict:
    """老闆功能選單卡片"""
    items = [
        {"label": "今日訂單", "action": "今日訂單", "emoji": "🛒"},
        {"label": "營收查詢", "action": "營收", "emoji": "💰"},
        {"label": "庫存查詢", "action": "庫存", "emoji": "📦"},
        {"label": "客戶搜尋", "action": "客戶 ", "emoji": "👥"},
        {"label": "休假批准", "action": "休假申請", "emoji": "✅"},
        {"label": "同步狀態", "action": "同步狀態", "emoji": "🔄"},
    ]

    return create_menu_card("管理功能選單", items, "👔")


def create_attendance_card(record: dict) -> dict:
    """打卡記錄卡片"""
    return {
        "type": "flex",
        "altText": "打卡記錄",
        "contents": {
            "type": "bubble",
            "size": "mega",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "⏰ 打卡成功",
                        "weight": "bold",
                        "color": "#FFFFFF",
                        "size": "xl"
                    }
                ],
                "backgroundColor": "#10B981",  // 綠色
                "padding": "lg",
                "paddingTop": "xl",
                "paddingBottom": "xl"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "👤 姓名",
                                "size": "sm",
                                "color": "#666666"
                            },
                            {
                                "type": "text",
                                "text": record.get("user_name", "員工"),
                                "size": "sm",
                                "weight": "bold",
                                "align": "end"
                            }
                        ],
                        "margin": "md"
                    },
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "📅 日期",
                                "size": "sm",
                                "color": "#666666"
                            },
                            {
                                "type": "text",
                                "text": record.get("date", ""),
                                "size": "sm",
                                "weight": "bold",
                                "align": "end"
                            }
                        ],
                        "margin": "sm"
                    },
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": record.get("clock_in") and "🟢 上班" or "🔴 下班",
                                "size": "sm",
                                "color": "#666666"
                            },
                            {
                                "type": "text",
                                "text": record.get("clock_in") or record.get("clock_out", "未知"),
                                "size": "sm",
                                "weight": "bold",
                                "align": "end"
                            }
                        ],
                        "margin": "sm"
                    }
                ],
                "padding": "lg"
            },
            "styles": {
                "body": {
                    "backgroundColor": "#F0FDF4"
                }
            }
        }
    }


def create_leave_request_card(request_data: dict, user_id: str) -> dict:
    """請假申請卡片"""
    return {
        "type": "flex",
        "altText": "請假申請",
        "contents": {
            "type": "bubble",
            "size": "mega",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "📝 請假申請已提交",
                        "weight": "bold",
                        "color": "#FFFFFF",
                        "size": "xl"
                    }
                ],
                "backgroundColor": "#3B82F6",  // 藍色
                "padding": "lg"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "👤 員工",
                                "size": "sm",
                                "color": "#666666"
                            },
                            {
                                "type": "text",
                                "text": user_id[-6:],
                                "size": "sm",
                                "weight": "bold",
                                "align": "end"
                            }
                        ],
                        "margin": "md"
                    },
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "🏷️ 假別",
                                "size": "sm",
                                "color": "#666666"
                            },
                            {
                                "type": "text",
                                "text": request_data.get("leave_type", ""),
                                "size": "sm",
                                "weight": "bold",
                                "align": "end"
                            }
                        ],
                        "margin": "sm"
                    },
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "📅 天數",
                                "size": "sm",
                                "color": "#666666"
                            },
                            {
                                "type": "text",
                                "text": f"{request_data.get('days', 0)} 天",
                                "size": "sm",
                                "weight": "bold",
                                "align": "end"
                            }
                        ],
                        "margin": "sm"
                    },
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "📋 事由",
                                "size": "sm",
                                "color": "#666666"
                            },
                            {
                                "type": "text",
                                "text": request_data.get("reason", ""),
                                "size": "sm",
                                "weight": "bold",
                                "align": "end",
                                "wrap": True
                            }
                        ],
                        "margin": "sm"
                    }
                ],
                "padding": "lg"
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "⏳ 等待主管審核",
                        "size": "xs",
                        "color": "#666666",
                        "align": "center"
                    }
                ],
                "spacing": "sm",
                "padding": "sm"
            },
            "styles": {
                "body": {
                    "backgroundColor": "#EFF6FF"
                }
            }
        }
    }


def create_advance_request_card(advance_data: dict, user_id: str) -> dict:
    """借支申請卡片"""
    return {
        "type": "flex",
        "altText": "借支申請",
        "contents": {
            "type": "bubble",
            "size": "mega",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "💰 借支申請已提交",
                        "weight": "bold",
                        "color": "#FFFFFF",
                        "size": "xl"
                    }
                ],
                "backgroundColor": "#F59E0B",  // 橘色
                "padding": "lg"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "👤 員工",
                                "size": "sm",
                                "color": "#666666"
                            },
                            {
                                "type": "text",
                                "text": user_id[-6:],
                                "size": "sm",
                                "weight": "bold",
                                "align": "end"
                            }
                        ],
                        "margin": "md"
                    },
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "💵 金額",
                                "size": "sm",
                                "color": "#666666"
                            },
                            {
                                "type": "text",
                                "text": f"NT$ {advance_data.get('amount', 0):,}",
                                "size": "sm",
                                "weight": "bold",
                                "color": "#DC2626",
                                "align": "end"
                            }
                        ],
                        "margin": "sm"
                    },
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "📋 事由",
                                "size": "sm",
                                "color": "#666666"
                            },
                            {
                                "type": "text",
                                "text": advance_data.get("reason", ""),
                                "size": "sm",
                                "weight": "bold",
                                "align": "end",
                                "wrap": True
                            }
                        ],
                        "margin": "sm"
                    }
                ],
                "padding": "lg"
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "⏳ 等待主管審核",
                        "size": "xs",
                        "color": "#666666",
                        "align": "center"
                    },
                    {
                        "type": "text",
                        "text": "💡 借支將從下月薪資扣除",
                        "size": "xxs",
                        "color": "#999999",
                        "align": "center",
                        "margin": "xs"
                    }
                ],
                "spacing": "xs",
                "padding": "sm"
            },
            "styles": {
                "body": {
                    "backgroundColor": "#FFFBEB"
                }
            }
        }
    }


def send_flex_message(reply_token: str, flex_message: dict):
    """發送 Flex Message 到 LINE"""
    import os
    import requests

    LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply"
    LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")

    headers = {
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "replyToken": reply_token,
        "messages": [flex_message]
    }

    response = requests.post(LINE_REPLY_URL, headers=headers, json=payload)
    return response.status_code == 200


if __name__ == "__main__":
    # 測試卡片
    import json

    print("員工選單卡片：")
    print(json.dumps(create_employee_menu_card(), ensure_ascii=False, indent=2))

    print("\n老闆選單卡片：")
    print(json.dumps(create_boss_menu_card(), ensure_ascii=False, indent=2))
