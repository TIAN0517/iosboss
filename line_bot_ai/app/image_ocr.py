"""
圖片 OCR 辨識系統
使用 GLM-4V 或其他視覺模型辨識休假圖片
"""
import os
import requests
import re
from typing import Optional, Dict
from datetime import datetime

# GLM-4V 視覺模型配置
GLM_API_URL = os.getenv("GLM_API_URL", "https://open.bigmodel.cn/api/paas/v4/chat/completions")
GLM_MODEL = "glm-4v"  # 使用視覺模型

# GLM API Keys
def get_glm_keys() -> list[str]:
    keys = os.getenv("GLM_API_KEYS") or os.getenv("GLM_KEYS", "")
    key_list = [k.strip() for k in keys.split(",") if k.strip()]
    return key_list


class LeaveImageOCR:
    """休假圖片 OCR 辨識"""

    def __init__(self):
        self.api_keys = get_glm_keys()
        self.current_key_index = 0

    def _get_next_key(self) -> str:
        """輪流獲取 API Key"""
        if not self.api_keys:
            raise RuntimeError("沒有可用的 GLM API Key")
        key = self.api_keys[self.current_key_index]
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        return key

    def recognize_leave_image(self, image_url: str) -> Dict[str, str]:
        """
        辨識休假圖片

        Args:
            image_url: LINE 圖片 URL

        Returns:
            包含休假資訊的字典：
            {
                "leave_type": "事假",
                "start_date": "2026-01-15",
                "end_date": "2026-01-15",
                "start_time": "09:00",
                "end_time": "18:00",
                "reason": "家中有事",
                "confidence": 0.95
            }
        """
        # 1. 下載圖片
        image_data = self._download_image(image_url)
        if not image_data:
            return {"error": "圖片下載失敗"}

        # 2. 使用 GLM-4V 辨識
        prompt = self._build_ocr_prompt()
        result = self._call_glm_vision(image_data, image_url, prompt)

        # 3. 解析結果
        parsed = self._parse_ocr_result(result)
        return parsed

    def _download_image(self, image_url: str) -> Optional[bytes]:
        """從 LINE 下載圖片"""
        try:
            headers = {
                "Authorization": f"Bearer {os.getenv('LINE_CHANNEL_ACCESS_TOKEN')}"
            }
            response = requests.get(image_url, headers=headers, timeout=10)
            response.raise_for_status()
            return response.content
        except Exception as e:
            print(f"下載圖片失敗：{e}")
            return None

    def _build_ocr_prompt(self) -> str:
        """建構 OCR 提示詞"""
        return """請辨識這張休假申請圖片，並提取以下資訊（如果有的話）：

1. 假別：事假、病假、特休、公假、婚假、喪假等
2. 日期：休假日期（格式：YYYY-MM-DD）
3. 時間：開始和結束時間（格式：HH:MM）
4. 事由：請假原因
5. 申請人：姓名

請以 JSON 格式回覆：
{
  "leave_type": "假別",
  "start_date": "開始日期",
  "end_date": "結束日期",
  "start_time": "開始時間",
  "end_time": "結束時間",
  "reason": "事由",
  "applicant": "申請人姓名"
}

如果圖片中沒有某些資訊，請填空字串 ""。

注意：
- 日期必須是 YYYY-MM-DD 格式
- 時間必須是 HH:MM 格式
- 假別必須是以下之一：事假、病假、特休、公假、婚假、喪假、產假、陪產假、公傷病假
- 只回傳 JSON，不要其他文字"""

    def _call_glm_vision(self, image_data: bytes, image_url: str, prompt: str) -> str:
        """呼叫 GLM-4V 視覺模型"""
        # 使用 GLM-4V 模型
        # 由於 GLM-4V 可能需要特殊處理，這裡使用通用方式
        # 實際使用時可能需要調整

        max_retries = 3
        for attempt in range(max_retries):
            try:
                key = self._get_next_key()

                # 構建請求（使用圖片 URL）
                payload = {
                    "model": "glm-4v",  # 視覺模型
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": image_url
                                    }
                                }
                            ]
                        }
                    ],
                    "temperature": 0.3,  # 降低溫度以獲得更穩定的輸出
                }

                headers = {
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json"
                }

                response = requests.post(
                    "https://open.bigmodel.cn/api/paas/v4/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30
                )
                response.raise_for_status()

                data = response.json()
                return data["choices"][0]["message"]["content"]

            except Exception as e:
                print(f"GLM-4V 呼叫失敗（嘗試 {attempt + 1}/{max_retries}）：{e}")
                if attempt < max_retries - 1:
                    continue
                raise RuntimeError(f"GLM-4V 辨識失敗：{e}")

    def _parse_ocr_result(self, result: str) -> Dict[str, str]:
        """解析 OCR 結果"""
        try:
            # 嘗試提取 JSON
            import json

            # 尋找 JSON 區塊
            json_match = re.search(r'\{[^{}]*\}', result, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                data = json.loads(json_str)

                # 驗證假別
                valid_types = ["事假", "病假", "特休", "公假", "婚假", "喪假", "產假", "陪產假", "公傷病假"]
                if data.get("leave_type") not in valid_types:
                    data["leave_type"] = ""

                # 驗證日期格式
                for date_field in ["start_date", "end_date"]:
                    if data.get(date_field):
                        try:
                            datetime.strptime(data[date_field], "%Y-%m-%d")
                        except ValueError:
                            data[date_field] = ""

                # 驗證時間格式
                for time_field in ["start_time", "end_time"]:
                    if data.get(time_field):
                        try:
                            datetime.strptime(data[time_field], "%H:%M")
                        except ValueError:
                            data[time_field] = ""

                return data

            # 如果無法解析 JSON，返回空資料
            return {
                "leave_type": "",
                "start_date": "",
                "end_date": "",
                "start_time": "",
                "end_time": "",
                "reason": "",
                "applicant": "",
            }

        except Exception as e:
            print(f"解析 OCR 結果失敗：{e}")
            return {
                "error": f"解析失敗：{str(e)}",
                "leave_type": "",
                "start_date": "",
                "end_date": "",
                "start_time": "",
                "end_time": "",
                "reason": "",
                "applicant": "",
            }


# 全局 OCR 實例
_ocr = LeaveImageOCR()


def get_ocr() -> LeaveImageOCR:
    """獲取全局 OCR 實例"""
    return _ocr
