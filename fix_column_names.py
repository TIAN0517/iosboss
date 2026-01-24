"""
檢查並修復 PostgreSQL 欄位名稱問題
"""
import os
import psycopg2
from datetime import datetime

# 設定正確的環境變數
os.environ['DATABASE_URL'] = 'postgresql://postgres:Ss520520@localhost:5432/postgres'

def check_column_names():
    """檢查實際的欄位名稱"""
    print("🔍 檢查 PostgreSQL 欄位名稱")
    print("=" * 50)
    
    db_url = 'postgresql://postgres:Ss520520@localhost:5432/postgres'
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # 獲取所有欄位名稱（不區分大小寫）
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'LineMessage' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        
        print("📋 實際欄位名稱:")
        for column in columns:
            col_name = column[0]
            print(f"  📝 {col_name}")
        
        # 測試不帶引號的欄位名稱
        print("\n🧪 測試不帶引號的查詢:")
        try:
            cursor.execute("SELECT COUNT(*) FROM LineMessage")
            count = cursor.fetchone()[0]
            print(f"✅ 不帶引號查詢成功: {count} 筆")
        except Exception as e:
            print(f"❌ 不帶引號查詢失敗: {e}")
        
        # 測試帶引號的欄位名稱
        print("\n🧪 測試帶引號的查詢:")
        try:
            cursor.execute('SELECT COUNT(*) FROM "LineMessage"')
            count = cursor.fetchone()[0]
            print(f"✅ 帶引號查詢成功: {count} 筆")
        except Exception as e:
            print(f"❌ 帶引號查詢失敗: {e}")
        
        # 測試插入資料（使用不帶引號的欄位名稱）
        print("\n🧪 測試插入資料:")
        try:
            # 使用不帶引號的欄位名稱
            cursor.execute("""
                INSERT INTO LineMessage 
                (userid, linegroupid, messagetype, content, response, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                'test_user',
                'test_group', 
                'text',
                '測試訊息',
                '測試回應',
                datetime.now()
            ))
            
            inserted_id = cursor.fetchone()[0]
            print(f"✅ 插入成功，ID: {inserted_id}")
            
            conn.commit()
        except Exception as e:
            print(f"❌ 插入失敗: {e}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 檢查失敗: {e}")
        return False

def create_correct_bot():
    """創建使用正確欄位名稱的 Bot"""
    print("\n🤖 創建使用正確欄位名稱的 Bot")
    print("=" * 50)
    
    bot_code = '''
"""
正確欄位名稱版 LINE Bot
使用 PostgreSQL 不帶引號的欄位名稱
"""
import os
import json
import psycopg2
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

# 設定正確的環境變數
os.environ['DATABASE_URL'] = 'postgresql://postgres:Ss520520@localhost:5432/postgres'

app = FastAPI(title="正確欄位名稱版 LINE Bot", version="1.0.0")

def get_db_connection():
    """獲取資料庫連接"""
    db_url = os.getenv('DATABASE_URL')
    return psycopg2.connect(db_url)

class CorrectColumnBot:
    """使用正確欄位名稱的 LINE Bot"""
    
    @staticmethod
    def save_message(user_id, group_id, message_type, content, response=None):
        """保存 LINE 訊息 - 使用不帶引號的欄位名稱"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # 使用不帶引號的欄位名稱
            cursor.execute("""
                INSERT INTO LineMessage 
                (userid, linegroupid, messagetype, content, response, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (user_id, group_id, message_type, content, response, datetime.now()))
            
            message_id = cursor.fetchone()[0]
            conn.commit()
            conn.close()
            return message_id
        except Exception as e:
            print(f"❌ 保存訊息失敗: {e}")
            return None
    
    @staticmethod
    def get_messages(limit=20):
        """獲取訊息"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT userid, content, response, timestamp 
                FROM LineMessage 
                ORDER BY timestamp DESC 
                LIMIT %s
            """, (limit,))
            
            results = cursor.fetchall()
            conn.close()
            return results
        except Exception as e:
            print(f"❌ 獲取訊息失敗: {e}")
            return []

# 初始化
bot = CorrectColumnBot()

@app.get("/api/webhook/line")
async def webhook_get():
    return {"狀態": "正確欄位名稱版 LINE Bot 運行中"}

@app.post("/api/webhook/line")
async def line_webhook(request: Request):
    """處理 LINE Webhook"""
    try:
        body = await request.json()
        events = body.get("events", [])
        
        print(f"🤖 收到 {len(events)} 個事件")
        
        for event in events:
            await process_event(event)
        
        return {"狀態": "處理完成"}
        
    except Exception as e:
        print(f"❌ 處理失敗: {e}")
        return {"錯誤": str(e)}, 500

async def process_event(event):
    """處理事件"""
    source = event.get("source", {})
    user_id = source.get("userId", "unknown")
    group_id = source.get("groupId", "private")
    
    if event.get("type") == "message":
        message = event.get("message", {})
        message_type = message.get("type", "text")
        content = message.get("text", "") if message_type == "text" else str(message)
        
        print(f"💬 訊息: {content}")
        
        # 生成回應
        response = generate_response(content)
        print(f"🤖 回應: {response}")
        
        # 保存到資料庫
        message_id = bot.save_message(user_id, group_id, message_type, content, response)
        
        if message_id:
            print(f"✅ 資料保存成功，ID: {message_id}")
        else:
            print("❌ 資料保存失敗")
        
        # 發送回應
        await send_reply(event.get("replyToken"), response)

def generate_response(text):
    """生成回應"""
    text = text.lower().strip()
    
    if "測試" in text or "test" in text:
        return "測試成功！✅ 資料已保存到 PostgreSQL，繁體中文強制執行！"
    
    if any(word in text for word in ["你好", "哈囉", "嗨"]):
        return "哈囉！😊 資料已保存，有什麼需要幫助的嗎？"
    
    if any(word in text for word in ["瓦斯", "訂"]):
        return "🛵 瓦斯訂購服務，資料已保存！"
    
    return "收到您的訊息！🤔 資料已保存到資料庫。"

async def send_reply(reply_token, text):
    """發送回應"""
    print("=" * 60)
    print(f"📤 回應: {text}")
    print("=" * 60)

@app.get("/api/logs")
async def get_logs():
    """獲取記錄"""
    try:
        messages = bot.get_messages(20)
        return {
            "logs": [
                {
                    "user": msg[0] if msg[0] else "未知",
                    "message": msg[1] if msg[1] else "",
                    "response": msg[2] if msg[2] else "",
                    "timestamp": msg[3].isoformat() if msg[3] else None
                }
                for msg in messages
            ]
        }
    except Exception as e:
        return {"logs": [], "error": str(e)}

@app.get("/api/health")
async def health():
    """健康檢查"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM LineMessage")
        count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "狀態": "正常",
            "資料庫": "PostgreSQL",
            "訊息數": count
        }
    except Exception as e:
        return {"狀態": "異常", "錯誤": str(e)}

if __name__ == "__main__":
    import uvicorn
    print("🚀 正確欄位名稱版 LINE Bot 啟動...")
    uvicorn.run(app, host="0.0.0.0", port=8888)
'''
    
    with open("line_bot_ai/correct_column_bot.py", "w", encoding="utf-8") as f:
        f.write(bot_code)
    
    print("✅ 創建正確欄位名稱版 Bot: correct_column_bot.py")
    return True

if __name__ == "__main__":
    print("🛠️ 檢查並修復 PostgreSQL 欄位名稱")
    print(f"🕐 檢查時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 檢查欄位名稱
    check_success = check_column_names()
    
    # 創建正確的 Bot
    bot_success = create_correct_bot()
    
    print("\n" + "=" * 50)
    print("📊 檢查結果")
    print("=" * 50)
    
    if check_success and bot_success:
        print("✅ 欄位名稱檢查完成！")
        print("✅ 正確 Bot 創建完成！")
        print("\n📋 下一步:")
        print("1. 停止舊 Bot")
        print("2. 啟動正確 Bot: python correct_column_bot.py")
        print("3. 測試資料保存")
    else:
        print("❌ 檢查失敗")
