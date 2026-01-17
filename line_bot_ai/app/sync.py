"""
主系統同步模組
讓 LINE Bot 可以查詢主系統數據
"""
import os
import requests
from datetime import datetime
from typing import Optional, List, Dict


# ==================== 配置 ====================
# 主系統 API 地址
MAIN_SYSTEM_URL = os.getenv("MAIN_SYSTEM_URL", "http://localhost:9999")

# API 端點
ENDPOINTS = {
    "health": f"{MAIN_SYSTEM_URL}/api/health",
    "orders": f"{MAIN_SYSTEM_URL}/api/orders",
    "customers": f"{MAIN_SYSTEM_URL}/api/customers",
    "inventory": f"{MAIN_SYSTEM_URL}/api/products",  # 用 products 代表庫存
    "checks": f"{MAIN_SYSTEM_URL}/api/checks",
    "staff": f"{MAIN_SYSTEM_URL}/api/staff",
}


# ==================== 錯誤處理 ====================
class SyncError(Exception):
    """同步錯誤"""
    pass


def check_connection() -> bool:
    """檢查主系統連線"""
    try:
        response = requests.get(ENDPOINTS["health"], timeout=5)
        data = response.json()
        return data.get("database") == "connected"
    except Exception:
        return False


# ==================== 訂單查詢 ====================
def get_today_orders() -> Dict:
    """獲取今日訂單"""
    try:
        today = datetime.now().strftime("%Y-%m-%d")

        response = requests.get(
            ENDPOINTS["orders"],
            params={"date": today},
            timeout=10
        )
        response.raise_for_status()

        orders = response.json()

        # 統計
        total = len(orders)
        pending = len([o for o in orders if o.get("status") == "pending"])
        completed = len([o for o in orders if o.get("status") == "completed"])

        # 計算金額
        total_amount = sum(o.get("totalAmount", 0) for o in orders)

        return {
            "success": True,
            "date": today,
            "total": total,
            "pending": pending,
            "completed": completed,
            "amount": total_amount,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def get_pending_orders() -> str:
    """獲取待處理訂單（格式化顯示）"""
    try:
        response = requests.get(
            ENDPOINTS["orders"],
            params={"status": "pending"},
            timeout=10
        )
        response.raise_for_status()

        orders = response.json()

        if not orders:
            return "目前沒有待處理的訂單"

        lines = [f"待處理訂單（{len(orders)} 筆）\n", "=" * 50]

        for i, order in enumerate(orders[:10], 1):  # 最多顯示 10 筆
            customer = order.get("customer", {})
            customer_name = customer.get("name", "未知客戶")

            lines.append(f"\n{i}. {order.get('orderNo', 'N/A')}")
            lines.append(f"   客戶：{customer_name}")
            lines.append(f"   金額：${order.get('totalAmount', 0):.0f}")
            lines.append(f"   狀態：{order.get('status', 'pending')}")

        if len(orders) > 10:
            lines.append(f"\n... 還有 {len(orders) - 10} 筆訂單")

        return "\n".join(lines)

    except Exception as e:
        return f"查詢失敗：{str(e)}"


# ==================== 客戶查詢 ====================
def search_customer(keyword: str) -> str:
    """搜尋客戶"""
    try:
        response = requests.get(
            ENDPOINTS["customers"],
            params={"search": keyword},
            timeout=10
        )
        response.raise_for_status()

        customers = response.json()

        if not customers:
            return f"找不到客戶：{keyword}"

        lines = [f"找到 {len(customers)} 筆客戶資料\n", "=" * 50]

        for i, customer in enumerate(customers[:5], 1):  # 最多顯示 5 筆
            lines.append(f"\n{i}. {customer.get('name', '未知')}")
            lines.append(f"   電話：{customer.get('phone', 'N/A')}")
            lines.append(f"   地址：{customer.get('address', 'N/A')}")
            lines.append(f"   類型：{customer.get('paymentType', 'N/A')}")

        return "\n".join(lines)

    except Exception as e:
        return f"查詢失敗：{str(e)}"


# ==================== 庫存查詢 ====================
def get_low_inventory() -> str:
    """獲取低庫存產品"""
    try:
        response = requests.get(ENDPOINTS["inventory"], timeout=10)
        response.raise_for_status()

        products = response.json()

        # 篩選低庫存
        low_stock = [p for p in products if p.get("stock", 0) <= p.get("minStock", 10)]

        if not low_stock:
            return "庫存充足，沒有低庫存產品"

        lines = [f"低庫存警報（{len(low_stock)} 筆）\n", "=" * 50]

        for product in low_stock:
            lines.append(f"\n• {product.get('name', '未知')}")
            lines.append(f"  目前庫存：{product.get('stock', 0)}")
            lines.append(f"  最低庫存：{product.get('minStock', 10)}")

        return "\n".join(lines)

    except Exception as e:
        return f"查詢失敗：{str(e)}"


# ==================== 營收統計 ====================
def get_today_revenue() -> str:
    """獲取今日營收"""
    try:
        result = get_today_orders()

        if not result.get("success"):
            return f"查詢失敗：{result.get('error')}"

        lines = [f"今日營收報表", "=" * 50]
        lines.append(f"\n日期：{result['date']}")
        lines.append(f"訂單數：{result['total']} 筆")
        lines.append(f"待處理：{result['pending']} 筆")
        lines.append(f"已完成：{result['completed']} 筆")
        lines.append(f"\n總營收：${result['amount']:,.0f}")

        return "\n".join(lines)

    except Exception as e:
        return f"查詢失敗：{str(e)}"


# ==================== 格式化函數 ====================
def format_sync_status() -> str:
    """格式化同步狀態"""
    is_connected = check_connection()

    lines = ["主系統連線狀態", "=" * 50]
    lines.append(f"\n狀態：{'已連線' if is_connected else '未連線'}")
    lines.append(f"地址：{MAIN_SYSTEM_URL}")

    if is_connected:
        lines.append("\n可使用功能：")
        lines.append("• 今日訂單查詢")
        lines.append("• 待處理訂單")
        lines.append("• 客戶搜尋")
        lines.append("• 庫存警訊")
        lines.append("• 營收統計")
    else:
        lines.append("\n無法連接主系統，請檢查網路或聯繫管理員")

    return "\n".join(lines)


if __name__ == "__main__":
    print("測試主系統同步...")

    print("\n" + format_sync_status())

    if check_connection():
        print("\n" + get_today_revenue())
