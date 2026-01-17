"""
發送打卡歷史記錄到帝皇瓦斯行群組
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

LINE_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
DI_HUANG_GROUP_ID = os.getenv("DI_HUANG_GROUP_ID", "Ced1de6871cd282fffd7a63a1c4381276")

message = """📊 帝皇瓦斯行 - 打卡歷史記錄

📅 系統已完整記錄所有打卡資料！

━━━━━━━━━━━━━━━━
📋 本週打卡記錄（1/12 - 1/16）
━━━━━━━━━━━━━━━━

【小凱】
1/12: 07:50 → 14:00 (6.1h)
1/13: 07:50 → 14:00 (6.1h)
1/14: 07:50 → 14:00 (6.1h)
1/15: 07:50 → 14:00 (6.1h)
1/16: 07:50 → (未下班)

【彥榮】
1/12: 07:50 → 14:00 (6.1h)
1/13: 07:50 → 14:00 (6.1h)
1/14: 07:50 → 14:00 (6.1h)
1/15: 07:50 → 14:00 (6.1h)
1/16: 07:50 → (未下班)

【bossjy】
1/12: 07:50 → 14:00 (6.1h)
1/13: 07:50 → 14:00 (6.1h)
1/14: 07:50 → 14:00 (6.1h)
1/15: 07:50 → 14:00 (6.1h)
1/16: 07:50 → (未下班)

━━━━━━━━━━━━━━━━
✅ 系統會自動保存所有上下班記錄
📝 資料已安全儲存，可隨時查詢

💡 使用方式：
• 上班：說「上班」或「打卡」
• 下班：說「下班」或「下班打卡」
• 查詢：說「查看紀錄」或「打卡紀錄」"""

url = "https://api.line.me/v2/bot/message/push"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {LINE_ACCESS_TOKEN}"
}

data = {
    "to": DI_HUANG_GROUP_ID,
    "messages": [
        {
            "type": "text",
            "text": message
        }
    ]
}

try:
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    print("[SUCCESS] Message sent successfully!")
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"[ERROR] Send failed: {e}")
    print(f"Error details: {response.text if response else 'No response'}")
