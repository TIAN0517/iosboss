"""
帝皇瓦斯行 - 打卡記錄系統
符合勞基法要求，記錄每日上下班時間
"""
import json
import os
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

# 帝皇瓦斯行群組 ID（從環境變量讀取）
DIHUANG_GROUP_ID = os.getenv("DI_HUANG_GROUP_ID", "Ced1de6871cd282fffd7a63a1c4381276")

# 記錄檔案路徑（本地和 Docker 都適用）
# Docker: /app/data/attendance_records.json
# 本地: ./data/attendance_records.json
import sys
if Path("/app/data").exists():
    RECORD_FILE = Path("/app/data/attendance_records.json")
else:
    # 本地開發環境：使用相對路徑
    RECORD_FILE = Path(__file__).parent.parent / "data" / "attendance_records.json"

# LINE API 配置
LINE_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")
LINE_PROFILE_API = "https://api.line.me/v2/bot/profile/"

# 確保目錄存在
RECORD_FILE.parent.mkdir(parents=True, exist_ok=True)

# ==================== 寫死的用戶名稱對照表 ====================
# 對於無法從 LINE API 獲取名稱的用戶，使用此對照表
USER_NAME_MAP = {
    "U43906ad5ee3a884cf02cf5a4b1f2f859": "彥榮",
}


def get_line_user_name(user_id: str) -> str:
    """從 LINE API 獲取用戶顯示名稱（優先使用寫死的對照表）"""
    if not user_id:
        return ""

    # 1. 優先檢查寫死的對照表
    if user_id in USER_NAME_MAP:
        return USER_NAME_MAP[user_id]

    # 2. 嘗試從 LINE API 獲取
    if not LINE_ACCESS_TOKEN:
        return ""

    try:
        headers = {"Authorization": f"Bearer {LINE_ACCESS_TOKEN}"}
        # 降低逾時時間避免網路掛接逾時
        response = requests.get(f"{LINE_PROFILE_API}{user_id}", headers=headers, timeout=2)
        response.raise_for_status()
        data = response.json()
        return data.get("displayName", "")
    except Exception:
        # 靜默失敗，不列印錯誤避免影響網路掛接回應速度
        return ""


class AttendanceRecord:
    """單條打卡記錄"""

    def __init__(
        self,
        user_id: str,
        user_name: str = "",
        date: str = None,
        clock_in: str = None,
        clock_out: str = None,
    ):
        self.user_id = user_id
        self.user_name = user_name
        self.date = date or datetime.now().strftime("%Y-%m-%d")
        self.clock_in = clock_in  # 上班時間 HH:MM
        self.clock_out = clock_out  # 下班時間 HH:MM

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "user_name": self.user_name,
            "date": self.date,
            "clock_in": self.clock_in,
            "clock_out": self.clock_out,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "AttendanceRecord":
        return cls(
            user_id=data["user_id"],
            user_name=data.get("user_name", ""),
            date=data.get("date"),
            clock_in=data.get("clock_in"),
            clock_out=data.get("clock_out"),
        )

    def calculate_hours(self) -> Optional[float]:
        """計算工時（小時）"""
        if not self.clock_in or not self.clock_out:
            return None

        in_time = datetime.strptime(self.clock_in, "%H:%M")
        out_time = datetime.strptime(self.clock_out, "%H:%M")

        # 處理跨夜情況
        if out_time < in_time:
            out_time += timedelta(days=1)

        delta = out_time - in_time
        return round(delta.total_seconds() / 3600, 2)

    def format_display(self) -> str:
        """格式化顯示"""
        hours = self.calculate_hours()
        hours_str = f"{hours} 小時" if hours else "未下班"

        return (
            f"📅 {self.date}\n"
            f"👤 {self.user_name or self.user_id}\n"
            f"🟢 上班：{self.clock_in or '未打卡'}\n"
            f"🔴 下班：{self.clock_out or '未打卡'}\n"
            f"⏱️ 工時：{hours_str}"
        )


class AttendanceManager:
    """打卡記錄管理器"""

    def __init__(self):
        self.records: List[AttendanceRecord] = []
        self._load_records()

    def _load_records(self):
        """從檔案載入記錄"""
        if not RECORD_FILE.exists():
            self.records = []
            return

        try:
            data = json.loads(RECORD_FILE.read_text(encoding="utf-8"))
            self.records = [AttendanceRecord.from_dict(r) for r in data]
        except Exception as e:
            print(f"載入打卡記錄失敗：{e}")
            self.records = []

    def _save_records(self):
        """保存記錄到檔案"""
        try:
            RECORD_FILE.write_text(
                json.dumps([r.to_dict() for r in self.records], ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as e:
            print(f"保存打卡記錄失敗：{e}")

    def clock_in(self, user_id: str, user_name: str = "") -> str:
        """上班打卡"""
        today = datetime.now().strftime("%Y-%m-%d")
        now_time = datetime.now().strftime("%H:%M")

        # 如果沒有提供用戶名，自動從 LINE API 獲取
        if not user_name:
            user_name = get_line_user_name(user_id)

        # 檢查今天是否已打卡
        for record in self.records:
            if record.user_id == user_id and record.date == today:
                record.clock_in = now_time
                # 同時更新用戶名（如果之前沒有的話）
                if not record.user_name and user_name:
                    record.user_name = user_name
                self._save_records()
                return f"✅ 更新上班打卡成功！\n\n{record.format_display()}"

        # 新增記錄
        new_record = AttendanceRecord(
            user_id=user_id, user_name=user_name, date=today, clock_in=now_time
        )
        self.records.append(new_record)
        self._save_records()

        return f"✅ 上班打卡成功！\n\n{new_record.format_display()}"

    def clock_out(self, user_id: str, user_name: str = "") -> str:
        """下班打卡"""
        today = datetime.now().strftime("%Y-%m-%d")
        now_time = datetime.now().strftime("%H:%M")

        # 如果沒有提供用戶名，自動從 LINE API 獲取
        if not user_name:
            user_name = get_line_user_name(user_id)

        # 尋找今天的上班記錄
        for record in self.records:
            if record.user_id == user_id and record.date == today:
                record.clock_out = now_time
                # 同時更新用戶名（如果之前沒有的話）
                if not record.user_name and user_name:
                    record.user_name = user_name
                self._save_records()
                return f"✅ 下班打卡成功！\n\n{record.format_display()}"

        # 沒有上班記錄，但允許直接下班打卡
        new_record = AttendanceRecord(
            user_id=user_id, user_name=user_name, date=today, clock_out=now_time
        )
        self.records.append(new_record)
        self._save_records()

        return f"⚠️ 今天尚未上班打卡\n\n{new_record.format_display()}"

    def get_today_records(self, group_id: str = None) -> str:
        """獲取今天的打卡記錄"""
        if group_id != DIHUANG_GROUP_ID:
            return "❌ 此功能僅供帝皇瓦斯行群組使用"

        today = datetime.now().strftime("%Y-%m-%d")
        today_records = [
            r for r in self.records if r.date == today and r.clock_in
        ]

        if not today_records:
            return f"📅 {today}\n\n今天還沒有人打卡"

        # 構建顯示
        lines = [f"📅 {today} 打卡紀錄\n", "=" * 40]
        for i, record in enumerate(today_records, 1):
            lines.append(f"\n{i}. {record.user_name or record.user_id}")
            lines.append(f"   🟢 上班：{record.clock_in}")
            if record.clock_out:
                lines.append(f"   🔴 下班：{record.clock_out}")
                lines.append(f"   ⏱️ 工時：{record.calculate_hours()} 小時")
            else:
                lines.append(f"   🔴 下班：尚未打卡")

        return "\n".join(lines)

    def get_week_records(self, group_id: str = None) -> str:
        """獲取本週的打卡記錄"""
        if group_id != DIHUANG_GROUP_ID:
            return "❌ 此功能僅供帝皇瓦斯行群組使用"

        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())
        week_start_str = week_start.strftime("%Y-%m-%d")

        week_records = [
            r
            for r in self.records
            if r.date >= week_start_str and r.clock_in
        ]

        if not week_records:
            return f"📅 本週 ({week_start_str} 起) 無打卡記錄"

        # 按日期分組
        by_date: Dict[str, List[AttendanceRecord]] = {}
        for record in week_records:
            if record.date not in by_date:
                by_date[record.date] = []
            by_date[record.date].append(record)

        # 構建顯示
        lines = [f"📅 本週打卡紀錄 ({week_start_str} 起)\n", "=" * 40]
        for date in sorted(by_date.keys(), reverse=True):
            lines.append(f"\n📆 {date}")
            for record in by_date[date]:
                lines.append(f"   👤 {record.user_name or record.user_id}")
                lines.append(f"   🟢 {record.clock_in} → 🔴 {record.clock_out or '尚未下班'}")
                if record.clock_out:
                    lines.append(f"   ⏱️ {record.calculate_hours()} 小時")

        return "\n".join(lines)


# 全局管理器實例
_manager = AttendanceManager()


def get_attendance_manager() -> AttendanceManager:
    """獲取全局管理器"""
    return _manager
