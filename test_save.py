"""
簡單的 PostgreSQL 保存測試
"""
import os
import uuid
import psycopg2
from datetime import datetime

os.environ['DATABASE_URL'] = 'postgresql://postgres:Ss520520@localhost:5432/postgres'

print("🔍 測試 PostgreSQL 保存功能")
print("=" * 50)

try:
    # 連接資料庫
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # 生成 UUID
    test_id = str(uuid.uuid4())
    print(f"📝 生成 UUID: {test_id}")
    
    # 插入測試資料
    cursor.execute("""
        INSERT INTO "LineMessage" 
        (id, "userId", "lineGroupId", "messageType", "content", "response", "timestamp")
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        test_id,
        'test_user',
        'test_group',
        'text',
        '測試訊息',
        '測試回應',
        datetime.now()
    ))
    
    conn.commit()
    print("✅ 保存成功！")
    
    # 檢查總數
    cursor.execute('SELECT COUNT(*) FROM "LineMessage"')
    count = cursor.fetchone()[0]
    print(f"📊 總訊息數: {count}")
    
    # 查詢最新資料
    cursor.execute("""
        SELECT "userId", "content", "response", "timestamp" 
        FROM "LineMessage" 
        WHERE id = %s
    """, (test_id,))
    
    result = cursor.fetchone()
    if result:
        print("📋 最新資料:")
        print(f"  用戶: {result[0]}")
        print(f"  訊息: {result[1]}")
        print(f"  回應: {result[2]}")
        print(f"  時間: {result[3]}")
    
    conn.close()
    print("\n🎉 測試完成！資料庫保存功能正常")
    
except Exception as e:
    print(f"❌ 測試失敗: {e}")