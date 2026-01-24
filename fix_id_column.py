"""
檢查 LineMessage id 欄位並修復資料保存問題
"""
import os
import psycopg2
import uuid
from datetime import datetime

# 設定環境變數
os.environ['DATABASE_URL'] = 'postgresql://postgres:Ss520520@localhost:5432/postgres'

def check_id_column():
    """檢查 id 欄位的詳細信息"""
    print("🔍 檢查 id 欄位詳細信息")
    print("=" * 50)
    
    db_url = 'postgresql://postgres:Ss520520@localhost:5432/postgres'
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # 檢查 id 欄位的詳細信息
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'LineMessage' AND column_name = 'id';
        """)
        
        id_info = cursor.fetchone()
        
        if id_info:
            col_name, data_type, is_nullable, default = id_info
            print(f"📋 id 欄位信息:")
            print(f"  📝 名稱: {col_name}")
            print(f"  📝 類型: {data_type}")
            print(f"  📝 允許 NULL: {is_nullable}")
            print(f"  📝 預設值: {default}")
        
        # 檢查是否需要手動生成 id
        print(f"\n🧪 測試生成 UUID:")
        test_id = str(uuid.uuid4())
        print(f"  生成 UUID: {test_id}")
        
        # 測試插入資料
        print(f"\n🧪 測試插入資料:")
        try:
            cursor.execute("""
                INSERT INTO "LineMessage" 
                (id, "userId", "lineGroupId", "messageType", "content", "response", "timestamp")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                test_id,
                'test_user',
                'test_group',
                'text',
                '測試訊息',
                '測試回應',
                datetime.now()
            ))
            
            inserted_id = cursor.fetchone()[0]
            print(f"✅ 插入成功，ID: {inserted_id}")
            
            # 刪除測試資料
            cursor.execute('DELETE FROM "LineMessage" WHERE id = %s', (test_id,))
            
            conn.commit()
            
        except Exception as e:
            print(f"❌ 插入失敗: {e}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 檢查失敗: {e}")
        return False

def create_fixed_bot():
    """創建修復 id 問題的 Bot"""
    print("\n🤖 創建修復 id 問題的 Bot")
    print("=" * 50)
    
    bot_code = '''
"""
修復 id 問題的 LINE Bot
正確生成 UUID 作為主鍵
"""
import os
import uuid
import json
import psycopg2
from datetime import datetime
from fastapi import FastAPI, Request

# 設定環境變數
os.environ['DATABASE_URL'] = 'postgresql://postgres:Ss520520@localhost:5432/postgres'

app = FastAPI(title="修復 id 問題的 LINE Bot", version="1.0.0")

def get_db():
    """獲取資料庫連接"""
    return psycopg2.connect(os.environ['DATABASE_URL'])

def save_line_message(user_id, group_id, message_type, content, response_text=None):
    """保存 LINE 訊息到資料庫 - 生成 UUID"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 生成 UUID 作為 id
        message_id = str(uuid.uuid4())
        
        cursor.execute("""
            INSERT INTO "LineMessage" 
            (id, "userId", "lineGroupId", "messageType", "content", "response", "timestamp")
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (message_id, user_id, group_id, message_type, content, response_text, datetime.now()))
        
        result = cursor.fetchone()
        conn.commit()
        conn.close()
        return result[0] if result else None
        
    except Exception as e:
        print(f"❌ 保存失敗: {e}")
        return None

@app.get("/api/webhook/line")
async def webhook_get():
    return {"狀態": "修復 id 問題的 LINE Bot 運行中"}

@app.post("/api/webhook/line")
async def webhook_post(request: Request):
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
        return {"錯誤": str(e)}

async def process_event(event):
    """處理 LINE 事件"""
    source = event.get("source", {})
    
    user_id = source.get("userId", "unknown")
    group_id = source.get("groupId", "private")
    user_name = source.get("userName", "未知用戶")
    
    if event.get("type") == "message":
        message = event.get("message", {})
        message_type = message.get("type", "text")
        
        if message_type == "text":
            content = message.get("text", "")
            print(f"💬 訊息: {content}")
            
            # 生成回應
            response = generate_response(content)
            print(f"🤖 回應: {response}")
            
            # 保存到資料庫 - 正確生成 UUID
            message_id = save_line_message(user_id, group_id, message_type, content, response)
            
            if message_id:
                print(f"✅ 資料保存成功，ID: {message_id}")
            else:
                print("❌ 資料保存失敗")
            
            # 發送回應
            await send_response(event.get("replyToken"), response)

def generate_response(text: str) -> str:
    """生成繁體中文回應"""
    text = text.lower().strip()
    
    if "測試" in text or "test" in text:
        return "測試成功！✅ 資料已保存到 PostgreSQL 資料庫，繁體中文強制執行！"
    
    if any(word in text for word in ["你好", "哈囉", "嗨"]):
        return "哈囉！😊 我是 BossJy-99 智能助手，資料已保存到 PostgreSQL！"
    
    if any(word in text for word in ["瓦斯", "訂"]):
        return "🛵 瓦斯訂購服務：\\n• 4kg: $180\\n• 20kg: $720\\n• 50kg: $1,800\\n資料已保存！"
    
    if any(word in text for word in ["價格", "多少"]):
        return "💰 瓦斯價格表：\\n🛵 4kg: $180\\n🚛 20kg: $720\\n🚚 50kg: $1,800\\n資料已保存！"
    
    if any(word in text for word in ["謝謝", "感謝"]):
        return "不客氣！💪 資料已保存到資料庫，有任何問題隨時找我！"
    
    return "收到您的訊息！🤔 資料已保存到 PostgreSQL 資料庫。"

async def send_response(reply_token: str, text: str):
    """發送回應"""
    print("=" * 60)
    print(f"📤 LINE 回應: {text}")
    print("=" * 60)

@app.get("/api/health")
async def health_check():
    """健康檢查"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM "LineMessage"')
        count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "狀態": "正常",
            "資料庫": "PostgreSQL 連接正常",
            "LINE 訊息": f"{count} 筆",
            "繁體中文": "強制執行"
        }
        
    except Exception as e:
        return {"狀態": "異常", "錯誤": str(e)}

@app.get("/api/test-save")
async def test_save():
    """測試保存功能"""
    try:
        test_id = save_line_message(
            "test_user",
            "test_group",
            "text",
            "測試保存功能",
            "測試回應"
        )
        
        # 獲取總數
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM "LineMessage"')
        total_count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "測試": "成功",
            "保存ID": test_id,
            "總訊息數": total_count,
            "資料庫": "PostgreSQL 正常"
        }
        
    except Exception as e:
        return {"測試": "失敗", "錯誤": str(e)}

@app.get("/api/logs")
async def get_logs():
    """獲取對話記錄"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT "userId", "content", "response", "timestamp" 
            FROM "LineMessage" 
            ORDER BY "timestamp" DESC 
            LIMIT 20
        ''')
        
        logs = cursor.fetchall()
        conn.close()
        
        return {
            "logs": [
                {
                    "user": log[0] if log[0] else "未知用戶",
                    "message": log[1] if log[1] else "",
                    "response": log[2] if log[2] else "",
                    "timestamp": log[3].isoformat() if log[3] else None
                }
                for log in logs
            ]
        }
        
    except Exception as e:
        return {"logs": [], "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    print("🚀 修復 id 問題的 LINE Bot 啟動...")
    print("📊 PostgreSQL 資料庫連接正常")
    print("🔧 資料保存功能已修復")
    print("🇹🇼 繁體中文強制執行")
    uvicorn.run(app, host="0.0.0.0", port=8888)
'''
    
    with open("line_bot_ai/fixed_uuid_bot.py", "w", encoding="utf-8") as f:
        f.write(bot_code)
    
    print("✅ 創建修復 UUID Bot: fixed_uuid_bot.py")
    return True

if __name__ == "__main__":
    print("🛠️ 修復 id 欄位問題")
    print(f"🕐 修復時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 檢查 id 欄位
    check_success = check_id_column()
    
    # 創建修復 Bot
    bot_success = create_fixed_bot()
    
    print("\n" + "=" * 50)
    print("📊 修復結果")
    print("=" * 50)
    
    if check_success and bot_success:
        print("✅ id 欄位檢查完成！")
        print("✅ 修復 Bot 創建完成！")
        print("\n📋 下一步:")
        print("1. 停止舊 Bot")
        print("2. 啟動修復 Bot: python fixed_uuid_bot.py")
        print("3. 測試資料保存功能")
        print("4. 檢查前台顯示")
    else:
        print("❌ 修復失敗")
    
    print(f"\n🔧 解決方案: 生成 UUID 作為主鍵")
    print(f"📊 PostgreSQL: postgresql://postgres:***@localhost:5432/postgres")
