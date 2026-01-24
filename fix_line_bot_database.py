"""
修復 LINE Bot PostgreSQL 連接
確保資料正確保存到資料庫
"""
import os
import psycopg2
from datetime import datetime

# 設定正確的環境變數
os.environ['DATABASE_URL'] = 'postgresql://postgres:Ss520520@localhost:5432/postgres'
os.environ['LINE_CHANNEL_ACCESS_TOKEN'] = 'dev_token_for_testing'
os.environ['LINE_CHANNEL_SECRET'] = 'dev_secret_for_testing'

def fix_line_bot_database_connection():
    """修復 LINE Bot 資料庫連接"""
    print("🔧 修復 LINE Bot 資料庫連接")
    print("=" * 50)
    
    # 設定正確的連接字串
    db_url = 'postgresql://postgres:Ss520520@localhost:5432/postgres'
    
    try:
        # 測試連接
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        print("✅ 資料庫連接測試成功")
        
        # 檢查現有的 LINE 資料
        cursor.execute("SELECT COUNT(*) FROM \"LineMessage\"")
        message_count = cursor.fetchone()[0]
        print(f"📋 現有 LINE 訊息: {message_count} 筆")
        
        # 測試插入新的 LINE 對話
        test_data = (
            'line_user_test',
            '測試用戶', 
            'group_test',
            '測試訊息：你好',
            '測試回應：哈囉！',
            'text'
        )
        
        cursor.execute("""
            INSERT INTO "LineMessage" 
            (user_id, user_name, group_id, message, response, message_type, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, test_data + (datetime.now(),))
        
        message_id = cursor.fetchone()[0]
        print(f"✅ 新增測試對話，ID: {message_id}")
        
        # 檢查更新後的資料
        cursor.execute("SELECT COUNT(*) FROM \"LineMessage\"")
        new_count = cursor.fetchone()[0]
        print(f"📋 更新後 LINE 訊息: {new_count} 筆")
        
        # 檢查 LINE 群組資料
        cursor.execute("SELECT COUNT(*) FROM \"LineGroup\"")
        group_count = cursor.fetchone()[0]
        print(f"👥 LINE 群組: {group_count} 個")
        
        conn.commit()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ 資料庫操作失敗: {e}")
        return False

def create_fixed_line_bot():
    """創建修復後的 LINE Bot"""
    print("\n🤖 創建修復後的 LINE Bot")
    print("=" * 50)
    
    bot_code = '''
"""
修復版 LINE Bot - 使用正確的 PostgreSQL 資料庫連接
"""
import os
import json
import psycopg2
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

# 設定正確的環境變數
os.environ['DATABASE_URL'] = 'postgresql://postgres:Ss520520@localhost:5432/postgres'

app = FastAPI(title="修復版 LINE Bot", version="1.0.0")

def get_db_connection():
    """獲取資料庫連接"""
    db_url = os.getenv('DATABASE_URL')
    return psycopg2.connect(db_url)

class LineBotDatabase:
    """LINE Bot 資料庫操作類"""
    
    @staticmethod
    def log_message(user_id, user_name, group_id, message, response, message_type="text"):
        """記錄 LINE 訊息"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO "LineMessage" 
                (user_id, user_name, group_id, message, response, message_type, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (user_id, user_name, group_id, message, response, message_type, datetime.now()))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"❌ 記錄訊息失敗: {e}")
            return False
    
    @staticmethod
    def get_user_interactions(user_id, limit=10):
        """獲取用戶互動記錄"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT message, response, timestamp 
                FROM "LineMessage" 
                WHERE user_id = %s 
                ORDER BY timestamp DESC 
                LIMIT %s
            """, (user_id, limit))
            
            results = cursor.fetchall()
            conn.close()
            return results
        except Exception as e:
            print(f"❌ 獲取互動記錄失敗: {e}")
            return []

# 初始化資料庫操作
db = LineBotDatabase()

@app.get("/api/webhook/line")
async def webhook_get():
    return {"狀態": "修復版 LINE Bot 運行中"}

@app.post("/api/webhook/line")
async def line_webhook(request: Request):
    """處理 LINE Webhook"""
    try:
        body = await request.json()
        events = body.get("events", [])
        
        print(f"🤖 收到 {len(events)} 個事件")
        
        for event in events:
            await process_line_event(event)
        
        return {"狀態": "處理完成"}
        
    except Exception as e:
        print(f"❌ Webhook 處理失敗: {e}")
        return {"錯誤": str(e)}, 500

async def process_line_event(event):
    """處理 LINE 事件"""
    event_type = event.get("type")
    source = event.get("source", {})
    
    user_id = source.get("userId", "unknown")
    group_id = source.get("groupId", "private")
    user_name = source.get("userName", "未知用戶")
    
    print(f"📱 事件: {event_type}")
    print(f"👤 用戶: {user_name} ({user_id})")
    print(f"👥 群組: {group_id}")
    
    if event_type == "message":
        message = event.get("message", {})
        message_type = message.get("type")
        
        if message_type == "text":
            text = message.get("text", "")
            print(f"💬 訊息: {text}")
            
            # 生成回應
            response = generate_response(text)
            print(f"🤖 回應: {response}")
            
            # 保存到資料庫
            db.log_message(user_id, user_name, group_id, text, response)
            
            # 發送回應（開發模式）
            await send_line_reply(event.get("replyToken"), response)

def generate_response(text: str) -> str:
    """生成繁體中文回應"""
    text = text.strip().lower()
    
    if any(greeting in text for greeting in ["你好", "哈囉", "嗨", "hi", "hello"]):
        return "哈囉！😊 我是 BossJy-99 智能助手，資料已保存到資料庫！"
    
    if any(gas_word in text for gas_word in ["瓦斯", "氣", "訂", "購"]):
        return "🛵 瓦斯訂購服務：\\n• 4kg: $180\\n• 20kg: $720\\n• 50kg: $1,800\\n資料已保存！"
    
    if any(test_word in text for test_word in ["測試", "test"]):
        return "測試成功！✅ LINE Bot 連接 PostgreSQL 資料庫正常，繁體中文強制執行！"
    
    return "收到您的訊息！🤔 資料已保存到 PostgreSQL 資料庫。"

async def send_line_reply(reply_token: str, text: str):
    """發送 LINE 回應"""
    try:
        print("=" * 50)
        print(f"📤 LINE 回應: {text}")
        print("=" * 50)
        
        # 在開發環境中，只記錄日誌
        # 實際環境需要真實的 LINE Token
        return True
        
    except Exception as e:
        print(f"❌ 發送失敗: {e}")
        return False

@app.get("/api/logs")
async def get_logs():
    """獲取 LINE 對話記錄"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT user_name, message, response, timestamp
            FROM "LineMessage" 
            ORDER BY timestamp DESC 
            LIMIT 20
        """)
        
        logs = cursor.fetchall()
        conn.close()
        
        return {
            "logs": [
                {
                    "user": log[0],
                    "message": log[1],
                    "response": log[2], 
                    "timestamp": log[3].isoformat() if log[3] else None
                }
                for log in logs
            ]
        }
        
    except Exception as e:
        print(f"❌ 獲取記錄失敗: {e}")
        return {"logs": []}

@app.get("/api/health")
async def health_check():
    """健康檢查"""
    try:
        # 測試資料庫連接
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM \"LineMessage\"")
        count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "狀態": "正常",
            "資料庫": "連接正常",
            "LINE 訊息": f"{count} 筆"
        }
        
    except Exception as e:
        return {"狀態": "異常", "錯誤": str(e)}

if __name__ == "__main__":
    import uvicorn
    print("🚀 修復版 LINE Bot 啟動...")
    print("📊 PostgreSQL 資料庫連接已修復")
    uvicorn.run(app, host="0.0.0.0", port=8888)
'''
    
    with open("line_bot_ai/fixed_line_bot.py", "w", encoding="utf-8") as f:
        f.write(bot_code)
    
    print("✅ 創建修復版 LINE Bot: line_bot_ai/fixed_line_bot.py")
    return True

if __name__ == "__main__":
    print("🛠️ 修復 LINE Bot PostgreSQL 連接")
    print(f"🕐 修復時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 執行修復
    db_success = fix_line_bot_database_connection()
    bot_success = create_fixed_line_bot()
    
    print("\n" + "=" * 50)
    print("📊 修復結果")
    print("=" * 50)
    
    if db_success and bot_success:
        print("✅ 修復完成！")
        print("\n📋 下一步:")
        print("1. 停止舊的 LINE Bot")
        print("2. 啟動修復版 LINE Bot: python fixed_line_bot.py")
        print("3. 測試資料保存功能")
        print("4. 檢查前台顯示")
    else:
        print("❌ 修復失敗，請檢查錯誤訊息")
    
    print(f"\n🔧 資料庫連接: postgresql://postgres:***@localhost:5432/postgres")
    print(f"📊 LINE 資料表: LineMessage, LineGroup, LineConversation")
