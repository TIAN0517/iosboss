"""
員工群組功能模組
提供員工自助服務功能
"""
from typing import Optional
from datetime import datetime
import re


def get_employee_menu() -> str:
    """獲取員工功能菜單"""
    return """👋 員工功能菜單

請選擇功能：
1️⃣ 請假申請 - 事假、病假申請
2️⃣ 借支申請 - 薪資預借申請
3️⃣ 休假狀態 - 查看我的申請狀態
4️⃣ 工作提醒 - 今日工作事項提醒
5️⃣ 知識教學 - 瓦斯維修專業知識
6️⃣ AI 助理 - 瓦斯相關問題諮詢

💡 快速申請範例：
• 「請事假 3天 因為家裡有事」
• 「請病假 1天 發燒看醫生」
• 「借支 5000元 因為緊急用」

📚 知識教學關鍵字：
• 安全 - 瓦斯安全檢查
• 瓦斯爐 - 爐具故障排除
• 熱水器 - 熱水器維修
• 換桶 - 瓦斯桶更換
• 緊急 - 緊急狀況處理
• 收費 - 服務收費標準"""


def parse_leave_request(text: str) -> Optional[dict]:
    """
    解析請假申請文字

    支持格式：
    - 請事假 3天 因為家裡有事
    - 請病假 1天 發燒看醫生
    - 事假申請 5天 家裡有重要事情

    Returns:
        dict with leave_type, days, reason or None
    """
    # 匹配請假格式
    patterns = [
        r'請(事假|病假|特休|公假|婚假|喪假)\s+(\d+)\s*天?\s*(.*)',
        r'(事假|病假|特休|公假|婚假|喪假)申請\s+(\d+)\s*天?\s*(.*)',
    ]

    for pattern in patterns:
        match = re.match(pattern, text)
        if match:
            leave_type = match.group(1)
            days = int(match.group(2))
            reason = match.group(3).strip() or "未填寫原因"
            return {
                "leave_type": leave_type,
                "days": days,
                "reason": reason
            }

    return None


def parse_advance_request(text: str) -> Optional[dict]:
    """
    解析借支申請文字

    支持格式：
    - 借支 5000元 因為緊急用
    - 借款 3000 因為家裡急用

    Returns:
        dict with amount, reason or None
    """
    # 匹配借支格式
    patterns = [
        r'借支\s+(\d+)\s*元?\s*(.*)',
        r'借款\s+(\d+)\s*元?\s*(.*)',
    ]

    for pattern in patterns:
        match = re.match(pattern, text)
        if match:
            amount = int(match.group(1))
            reason = match.group(2).strip() or "未填寫原因"
            return {
                "amount": amount,
                "reason": reason
            }

    return None


def format_leave_request(leave_data: dict, user_id: str) -> str:
    """格式化請假申請"""
    return f"""📝 請假申請已提交

👤 員工 ID：{user_id[-6:]}
🏷️ 假別：{leave_data['leave_type']}
📅 天數：{leave_data['days']} 天
📋 事由：{leave_data['reason']}

⏳ 狀態：等待主管審核

💡 輸入「休假狀態」查看審核進度"""


def format_advance_request(advance_data: dict, user_id: str) -> str:
    """格式化借支申請"""
    return f"""💰 借支申請已提交

👤 員工 ID：{user_id[-6:]}
💵 金額：NT$ {advance_data['amount']:,} 元
📋 事由：{advance_data['reason']}

⏳ 狀態：等待主管審核

💡 注意：借支將從下月薪資扣除"""


def format_work_reminders() -> str:
    """格式化工作提醒"""
    today = datetime.now()

    # 根據星期幾給出不同提醒
    weekday = today.weekday()

    reminders = []

    # 基本提醒
    reminders.append("📅 每日提醒")
    reminders.append("• 上班打卡：記得準時打卡")
    reminders.append("• 佩戴安全裝備：送瓦斯時注意安全")
    reminders.append("• 客戶服務：保持友善態度")

    # 週一特別提醒
    if weekday == 0:
        reminders.append("\n📆 週一提醒")
        reminders.append("• 參加週會")
        reminders.append("• 檢查送貨車輛")

    # 週五特別提醒
    if weekday == 4:
        reminders.append("\n📆 週五提醒")
        reminders.append("• 整理本週訂單")
        reminders.append("• 休假請提前申請")

    # 月初提醒
    if today.day <= 3:
        reminders.append("\n📆 月初提醒")
        reminders.append("• 確認上月薪資")
        reminders.append("• 檢查庫存")

    return "\n".join(reminders)


def get_employee_guide() -> str:
    """獲取員工使用指南"""
    return """📘 員工使用指南

【休假申請】
📸 拍照休假單 → 上傳到群組 → 等待批准

【查詢狀態】
📋 輸入「休假狀態」→ 查看申請進度

【打卡紀錄】
🕐 輸入「我的紀錄」→ 查看本月打卡

【工作提醒】
💡 輸入「工作提醒」→ 今日工作事項

【AI 諮詢】
🤖 直接詢問瓦斯相關問題

❓ 需要協助請聯繫管理員"""


def handle_employee_command(text: str) -> tuple[Optional[str], Optional[dict]]:
    """
    處理員工指令

    Returns:
        (文字回應, Flex Message)，如果不是指令則返回 (None, None)
    """
    text = text.strip()

    # 功能菜單 - 返回卡片
    if text in ["功能", "菜單", "幫助", "help", "?", "功能表"]:
        from app.flex_cards import create_employee_menu_card
        return None, create_employee_menu_card()

    # 工作提醒
    if text in ["工作提醒", "提醒", "今日工作"]:
        return format_work_reminders(), None

    # 使用指南
    if text in ["指南", "怎麼用", "使用說明"]:
        return get_employee_guide(), None

    # 不是指令，返回 None 讓 AI 處理
    return None, None


def handle_employee_request(text: str, user_id: str, leave_mgr=None) -> Optional[str]:
    """
    處理員工申請（請假、借支）

    Returns:
        回應內容，如果不是申請則返回 None
    """
    text = text.strip()

    # 檢查請假申請
    leave_data = parse_leave_request(text)
    if leave_data and leave_mgr:
        # 使用 leave_mgr 創建申請
        return leave_mgr.create_request(
            user_id=user_id,
            leave_type=leave_data['leave_type'],
            reason=f"{leave_data['days']}天 - {leave_data['reason']}"
        )

    # 檢查借支申請
    advance_data = parse_advance_request(text)
    if advance_data:
        # TODO: 創建借支申請記錄
        return format_advance_request(advance_data, user_id)

    # 不是申請，返回 None
    return None


if __name__ == "__main__":
    print("測試員工功能模組")
    print(get_employee_menu())
    print("\n" + "="*50 + "\n")
    print(format_work_reminders())
