"""
休假表解析與查詢系統
解析群組發布的休假表，支持查詢功能
"""
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

# 記錄檔案路徑
SCHEDULE_FILE = Path("/app/data/leave_schedule.json")

# 確保目錄存在
SCHEDULE_FILE.parent.mkdir(parents=True, exist_ok=True)


class LeaveSchedule:
    """休假表管理器"""

    def __init__(self):
        self.schedule: Dict[str, List[dict]] = {}  # {"115-01": [{name, station, dates, reason}]}
        self._load_schedule()

    def _load_schedule(self):
        """從檔案載入休假表"""
        if not SCHEDULE_FILE.exists():
            return

        try:
            data = json.loads(SCHEDULE_FILE.read_text(encoding="utf-8"))
            self.schedule = data.get("schedule", {})
        except Exception as e:
            print(f"載入休假表失敗：{e}")
            self.schedule = {}

    def _save_schedule(self):
        """保存休假表到檔案"""
        try:
            data = {"schedule": self.schedule}
            SCHEDULE_FILE.write_text(
                json.dumps(data, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as e:
            print(f"保存休假表失敗：{e}")

    def parse_announcement(self, text: str) -> str:
        """
        解析休假表公告

        格式範例：
        115年 元月 休假表
        吉安站
        阿銘1/9、1/16、1/23、1/30
        阿毛1/1、1/19、1/26、1/27
        阿樂1/7（醫院）1/8 爸爸植物人在醫院
        小玉1/17、1/18、1/25、1/27

        美崙站
        阿賢1/3、1/13、1/25、
        小魏1/5、1/6、1/17、
        美美1/3、1/10、1/11、1/24
        """
        lines = text.strip().split('\n')

        # 解析年月
        year_month = None
        for line in lines:
            if "年" in line and "月" in line and "休假表" in line:
                match = re.search(r'(\d+)年\s*(\d+)月', line)
                if match:
                    year = int(match.group(1))
                    month = int(match.group(2))
                    year_month = f"{year}-{month:02d}"
                break

        if not year_month:
            # 預設當月
            now = datetime.now()
            year_month = f"{now.year - 1911}-{now.month:02d}"

        current_station = None
        added_count = 0

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 檢查是否為站名（以"站"結尾）
            if line.endswith("站") or line.endswith("站："):
                current_station = line.replace("：", "").replace(":", "")
                continue

            # 解析休假人員
            # 格式：姓名1/9、1/16、1/23、1/30
            # 或：姓名1/7（醫院）1/8 爸爸植物人在醫院

            # 提取姓名（中文字開頭）
            name_match = re.match(r'([\u4e00-\u9fff]+)', line)
            if not name_match:
                continue

            name = name_match.group(1)

            # 提取日期和原因
            # 找所有日期格式：1/9、1/16
            dates = re.findall(r'(\d{1,2}/\d{1,2})', line)

            # 提取原因（括號內或日期後的中文）
            reason = ""
            reason_match = re.search(r'（([^）]+)）|\(([^\)]+)\)', line)
            if reason_match:
                reason = reason_match.group(1) or reason_match.group(2)
            else:
                # 檢查日期後是否有原因說明
                parts = re.split(r'\d+/\d+', line)
                for part in parts[1:]:  # 跳過第一部分（姓名）
                    part = part.strip(' 、')
                    if part and re.search(r'[\u4e00-\u9fff]', part):
                        reason = part
                        break

            # 記錄休假
            if dates:
                if year_month not in self.schedule:
                    self.schedule[year_month] = []

                self.schedule[year_month].append({
                    "name": name,
                    "station": current_station or "未指定",
                    "dates": dates,
                    "reason": reason
                })
                added_count += 1

        if added_count > 0:
            self._save_schedule()

        return self.format_confirmation(year_month, added_count)

    def get_leave_by_date(self, date_str: str) -> str:
        """
        查詢指定日期的休假人員

        格式：查詢 1/15 或 查詢 115-01 1/15
        """
        # 解析日期
        parts = date_str.split()
        if len(parts) >= 2:
            year_month = parts[0]
            date = parts[1]
        else:
            # 預設當月
            now = datetime.now()
            year_month = f"{now.year - 1911}-{now.month:02d}"
            date = parts[0] if parts else ""

        if not date:
            return "❌ 請提供日期，例如：查詢 1/15"

        # 查找休假人員
        if year_month not in self.schedule:
            return f"📅 {year_month} 尚無休假記錄"

        leave_people = []
        for record in self.schedule[year_month]:
            if date in record["dates"]:
                leave_people.append({
                    "name": record["name"],
                    "station": record["station"],
                    "reason": record["reason"]
                })

        if not leave_people:
            return f"📅 {year_month} {date} 無人休假"

        # 格式化結果
        lines = [f"📅 {year_month} {date} 休假人員\n", "=" * 40]
        for person in leave_people:
            station_info = f"（{person['station']}）" if person['station'] != "未指定" else ""
            reason_info = f" - {person['reason']}" if person['reason'] else ""
            lines.append(f"👤 {person['name']}{station_info}{reason_info}")

        return "\n".join(lines)

    def get_leave_by_person(self, name: str) -> str:
        """
        查詢某人的休假日期

        格式：查詢 阿銘
        """
        now = datetime.now()
        year_month = f"{now.year - 1911}-{now.month:02d}"

        if year_month not in self.schedule:
            return f"📅 {year_month} 尚無休假記錄"

        # 查找該人員的休假
        person_records = []
        for record in self.schedule[year_month]:
            if name in record["name"] or record["name"] in name:
                person_records.append(record)

        if not person_records:
            return f"👤 {name} 在 {year_month} 無休假記錄"

        # 格式化結果
        lines = [f"👤 {name} 的休假日期\n", "=" * 40]
        for record in person_records:
            dates_str = "、".join(record["dates"])
            station_info = f"\n🏢 站別：{record['station']}" if record['station'] != "未指定" else ""
            reason_info = f"\n📋 原因：{record['reason']}" if record['reason'] else ""
            lines.append(f"📅 日期：{dates_str}{station_info}{reason_info}")

        return "\n".join(lines)

    def get_monthly_summary(self, year_month: str = None) -> str:
        """
        取得該月休假總表

        格式：休假總表 或 休假總表 115-01
        """
        if not year_month:
            now = datetime.now()
            year_month = f"{now.year - 1911}-{now.month:02d}"

        if year_month not in self.schedule:
            return f"📅 {year_month} 尚無休假記錄"

        # 按站別分組
        by_station: Dict[str, List[dict]] = {}
        for record in self.schedule[year_month]:
            station = record["station"]
            if station not in by_station:
                by_station[station] = []
            by_station[station].append(record)

        # 格式化結果
        lines = [f"📅 {year_month} 休假總表\n", "=" * 40]

        for station, records in by_station.items():
            lines.append(f"\n🏢 {station}")
            for record in records:
                dates_str = "、".join(record["dates"])
                reason_info = f"（{record['reason']}）" if record['reason'] else ""
                lines.append(f"  👤 {record['name']}：{dates_str} {reason_info}")

        # 統計
        total_people = len(self.schedule[year_month])
        total_days = sum(len(r["dates"]) for r in self.schedule[year_month])
        lines.append(f"\n📊 統計：{total_people} 人，共 {total_days} 天休假")

        return "\n".join(lines)

    def format_confirmation(self, year_month: str, count: int) -> str:
        """格式化確認訊息"""
        return f"""✅ 休假表已記錄

📅 月份：{year_month}
👥 休假人數：{count} 人

💡 可用指令：
• 查詢 1/15 - 查詢指定日期休假人員
• 查詢 阿銘 - 查詢某人休假日期
• 休假總表 - 查看整月休假"""


def handle_leave_command(text: str) -> Optional[str]:
    """
    處理休假相關指令

    Returns:
        回應內容，如果不是休假指令則返回 None
    """
    text = text.strip()

    # 檢查是否為休假表（包含"年"和"休假表"）
    if "年" in text and "休假表" in text:
        schedule_mgr = LeaveSchedule()
        return schedule_mgr.parse_announcement(text)

    # 查詢指定日期
    if text.startswith("查詢 ") or text.startswith("查詢"):
        schedule_mgr = LeaveSchedule()
        query = text.replace("查詢 ", "").replace("查詢", "")

        # 檢查是否為人名查詢（全中文字）
        if query and re.search(r'^[\u4e00-\u9fff]+$', query):
            return schedule_mgr.get_leave_by_person(query)
        else:
            # 日期查詢
            return schedule_mgr.get_leave_by_date(query)

    # 休假總表
    if text in ["休假總表", "本月休假", "休假表"]:
        schedule_mgr = LeaveSchedule()
        return schedule_mgr.get_monthly_summary()

    # 不是休假指令
    return None


# 全局實例
_schedule_instance = None


def get_schedule_manager() -> LeaveSchedule:
    """獲取全局休假表管理器"""
    global _schedule_instance
    if _schedule_instance is None:
        _schedule_instance = LeaveSchedule()
    return _schedule_instance


if __name__ == "__main__":
    # 測試
    test_text = """
    115年 元月 休假表
    吉安站
    阿銘1/9、1/16、1/23、1/30
    阿毛1/1、1/19、1/26、1/27
    阿樂1/7（醫院）1/8 爸爸植物人在醫院
    小玉1/17、1/18、1/25、1/27

    美崙站
    阿賢1/3、1/13、1/25、
    小魏1/5、1/6、1/17、
    美美1/3、1/10、1/11、1/24
    """

    mgr = LeaveSchedule()
    result = mgr.parse_announcement(test_text)
    print(result)
    print("\n" + mgr.get_leave_by_date("1/9"))
    print("\n" + mgr.get_leave_by_person("阿樂"))
