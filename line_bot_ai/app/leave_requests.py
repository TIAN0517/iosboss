"""
休假申請系統
支援：事假、病假、特休、公假、婚假、喪假等
自動辨識休假圖片並入庫
"""
import json
import os
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

# 員工群組 ID（待填入）
EMPLOYEE_GROUP_ID = ""

# 記錄檔案路徑
LEAVE_RECORD_FILE = Path("/app/data/leave_requests.json")

# LINE API 配置
LINE_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")
LINE_MESSAGE_API = "https://api.line.me/v2/bot/message/"

# 確保目錄存在
LEAVE_RECORD_FILE.parent.mkdir(parents=True, exist_ok=True)

# ==================== 假別定義 ====================
LEAVE_TYPES = {
    "事假": "personal",
    "病假": "sick",
    "特休": "annual",
    "公假": "official",
    "婚假": "marriage",
    "喪假": "bereavement",
    "產假": "maternity",
    "陪產假": "paternity",
    "公傷病假": "work_injury",
}


class LeaveRequest:
    """休假申請記錄"""

    def __init__(
        self,
        user_id: str,
        user_name: str = "",
        leave_type: str = "",  # 假別（事假、病假等）
        start_date: str = "",  # 開始日期 YYYY-MM-DD
        end_date: str = "",  # 結束日期 YYYY-MM-DD
        start_time: str = "",  # 開始時間 HH:MM（請假幾小時）
        end_time: str = "",  # 結束時間 HH:MM
        reason: str = "",  # 事由
        image_url: str = "",  # 休假圖片 URL
        status: str = "pending",  # pending, approved, rejected
        created_at: str = None,
        approved_by: str = "",  # 批准人 ID
        approved_at: str = "",  # 批准時間
    ):
        self.user_id = user_id
        self.user_name = user_name
        self.leave_type = leave_type
        self.start_date = start_date
        self.end_date = end_date
        self.start_time = start_time
        self.end_time = end_time
        self.reason = reason
        self.image_url = image_url
        self.status = status
        self.created_at = created_at or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.approved_by = approved_by
        self.approved_at = approved_at

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "user_name": self.user_name,
            "leave_type": self.leave_type,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "reason": self.reason,
            "image_url": self.image_url,
            "status": self.status,
            "created_at": self.created_at,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "LeaveRequest":
        return cls(
            user_id=data["user_id"],
            user_name=data.get("user_name", ""),
            leave_type=data.get("leave_type", ""),
            start_date=data.get("start_date", ""),
            end_date=data.get("end_date", ""),
            start_time=data.get("start_time", ""),
            end_time=data.get("end_time", ""),
            reason=data.get("reason", ""),
            image_url=data.get("image_url", ""),
            status=data.get("status", "pending"),
            created_at=data.get("created_at"),
            approved_by=data.get("approved_by", ""),
            approved_at=data.get("approved_at", ""),
        )

    def calculate_days(self) -> float:
        """計算休假天數"""
        if not self.start_date or not self.end_date:
            return 0

        start = datetime.strptime(self.start_date, "%Y-%m-%d")
        end = datetime.strptime(self.end_date, "%Y-%m-%d")

        # 計算日期差（加 1 因為包含當天）
        delta = (end - start).days + 1
        return delta

    def calculate_hours(self) -> float:
        """計算休假時數（請假幾小時）"""
        if not self.start_time or not self.end_time:
            return 0

        start = datetime.strptime(self.start_time, "%H:%M")
        end = datetime.strptime(self.end_time, "%H:%M")

        # 處理跨夜情況
        if end < start:
            end += timedelta(days=1)

        delta = end - start
        return round(delta.total_seconds() / 3600, 2)

    def format_display(self) -> str:
        """格式化顯示"""
        lines = [
            f"📋 休假申請單",
            f"👤 申請人：{self.user_name or self.user_id}",
            f"🏷️ 假別：{self.leave_type}",
        ]

        if self.start_date and self.end_date:
            if self.start_date == self.end_date:
                lines.append(f"📅 日期：{self.start_date}")
            else:
                lines.append(f"📅 日期：{self.start_date} ~ {self.end_date}（{self.calculate_days()} 天）")

        if self.start_time and self.end_time:
            lines.append(f"⏰ 時間：{self.start_time} ~ {self.end_time}（{self.calculate_hours()} 小時）")

        if self.reason:
            lines.append(f"📝 事由：{self.reason}")

        # 狀態顯示
        status_map = {
            "pending": "⏳ 待批准",
            "approved": "✅ 已批准",
            "rejected": "❌ 已駁回",
        }
        lines.append(f"📌 狀態：{status_map.get(self.status, self.status)}")

        if self.approved_by:
            lines.append(f"✔️ 批准人 ID：{self.approved_by}")

        return "\n".join(lines)


class LeaveManager:
    """休假申請管理器"""

    def __init__(self):
        self.requests: List[LeaveRequest] = []
        self._load_records()

    def _load_records(self):
        """從檔案載入記錄"""
        if not LEAVE_RECORD_FILE.exists():
            self.requests = []
            return

        try:
            data = json.loads(LEAVE_RECORD_FILE.read_text(encoding="utf-8"))
            self.requests = [LeaveRequest.from_dict(r) for r in data]
        except Exception as e:
            print(f"載入休假記錄失敗：{e}")
            self.requests = []

    def _save_records(self):
        """保存記錄到檔案"""
        try:
            LEAVE_RECORD_FILE.write_text(
                json.dumps([r.to_dict() for r in self.requests], ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as e:
            print(f"保存休假記錄失敗：{e}")

    def create_request(
        self,
        user_id: str,
        user_name: str = "",
        leave_type: str = "",
        start_date: str = "",
        end_date: str = "",
        start_time: str = "",
        end_time: str = "",
        reason: str = "",
        image_url: str = "",
    ) -> LeaveRequest:
        """建立新的休假申請"""
        new_request = LeaveRequest(
            user_id=user_id,
            user_name=user_name,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            start_time=start_time,
            end_time=end_time,
            reason=reason,
            image_url=image_url,
            status="pending",
        )
        self.requests.append(new_request)
        self._save_records()
        return new_request

    def get_pending_requests(self) -> List[LeaveRequest]:
        """取得所有待批准的申請"""
        return [r for r in self.requests if r.status == "pending"]

    def approve_request(self, request_index: int, approver_id: str) -> str:
        """批准休假申請"""
        pending = self.get_pending_requests()
        if 0 <= request_index < len(pending):
            req = pending[request_index]
            req.status = "approved"
            req.approved_by = approver_id
            req.approved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self._save_records()
            return f"✅ 休假申請已批准\n\n{req.format_display()}"
        return "❌ 找不到該申請"

    def reject_request(self, request_index: int, approver_id: str) -> str:
        """駁回休假申請"""
        pending = self.get_pending_requests()
        if 0 <= request_index < len(pending):
            req = pending[request_index]
            req.status = "rejected"
            req.approved_by = approver_id
            req.approved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self._save_records()
            return f"❌ 休假申請已駁回\n\n{req.format_display()}"
        return "❌ 找不到該申請"

    def get_user_requests(self, user_id: str) -> List[LeaveRequest]:
        """取得用戶的所有申請"""
        return [r for r in self.requests if r.user_id == user_id]

    def format_pending_list(self) -> str:
        """格式化待批准清單"""
        pending = self.get_pending_requests()
        if not pending:
            return "📋 目前沒有待批准的休假申請"

        lines = ["📋 待批准休假申請清單\n", "=" * 50]
        for i, req in enumerate(pending, 1):
            lines.append(f"\n【{i}】{req.user_name or req.user_id}")
            lines.append(f"   假別：{req.leave_type}")
            if req.start_date:
                lines.append(f"   日期：{req.start_date}")
                if req.end_date != req.start_date:
                    lines.append(f"   ~ {req.end_date}（{req.calculate_days()} 天）")
            if req.start_time:
                lines.append(f"   時間：{req.start_time} ~ {req.end_time}")
            lines.append(f"   事由：{req.reason or '無'}")

        return "\n".join(lines)


# 全局管理器實例
_manager = LeaveManager()


def get_leave_manager() -> LeaveManager:
    """獲取全局管理器"""
    return _manager
