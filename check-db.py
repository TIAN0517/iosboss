#!/usr/bin/env python3
"""
檢查數據庫狀態
"""

import psycopg2
import json

def check_database():
    try:
        conn = psycopg2.connect(
            host='localhost',
            port='5432',
            database='postgres',
            user='postgres',
            password='Ss520520'
        )
        cursor = conn.cursor()
        
        print("📊 檢查數據庫狀態:")
        print("=" * 50)
        
        # 檢查 LINE Bot 相關表
        tables = ['"User"', '"Customer"', '"GasOrder"', '"LineMessage"']
        
        for table in tables:
            try:
                cursor.execute(f'SELECT COUNT(*) FROM {table}')
                count = cursor.fetchone()[0]
                print(f"  📋 {table}: {count} 筆記錄")
                
                # 如果有記錄，顯示最近幾筆
                if count > 0:
                    cursor.execute(f'SELECT * FROM {table} ORDER BY id DESC LIMIT 2')
                    recent = cursor.fetchall()
                    columns = [desc[0] for desc in cursor.description]
                    for record in recent:
                        print(f"     最新: {dict(zip(columns, record))}")
                        
            except Exception as e:
                print(f"  ❌ {table}: 表不存在或錯誤 - {e}")
        
        # 檢查知識庫表
        print(f"\n🔍 檢查知識庫:")
        try:
            cursor.execute('SELECT COUNT(*) FROM knowledge_base WHERE "isActive" = true')
            kb_count = cursor.fetchone()[0]
            print(f"  📚 knowledge_base: {kb_count} 筆活躍知識")
            
            if kb_count > 0:
                cursor.execute('SELECT title, category FROM knowledge_base WHERE "isActive" = true ORDER BY id DESC LIMIT 3')
                recent_kb = cursor.fetchall()
                for title, category in recent_kb:
                    print(f"     - {title} ({category})")
                    
        except Exception as e:
            print(f"  ❌ knowledge_base: 表不存在或錯誤 - {e}")
        
        cursor.close()
        conn.close()
        
        print(f"\n✅ 數據庫連接檢查完成")
        
    except Exception as e:
        print(f"❌ 數據庫連接錯誤: {e}")

if __name__ == "__main__":
    check_database()
