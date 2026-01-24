#!/usr/bin/env python3
"""
檢查知識庫數據狀態
"""

import psycopg2
import sys

def check_knowledge_base():
    try:
        # 連接數據庫
        conn = psycopg2.connect(
            host="localhost",
            port="5432", 
            database="postgres",
            user="postgres",
            password="Ss520520"
        )
        cursor = conn.cursor()
        
        print("🔍 檢查知識庫數據狀態...")
        
        # 檢查知識庫表是否存在
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'knowledge_base';
        """)
        
        table_exists = cursor.fetchone()
        if not table_exists:
            print("❌ 知識庫表 'knowledge_base' 不存在")
            return
        
        print("✅ 知識庫表存在")
        
        # 檢查知識庫內容
        cursor.execute('SELECT COUNT(*) FROM knowledge_base WHERE "isActive" = true;')
        count = cursor.fetchone()[0]
        
        print(f"📊 知識庫項目數量: {count}")
        
        if count == 0:
            print("❌ 知識庫為空！")
            
            # 顯示最近的知識庫項目
            cursor.execute('SELECT id, title, category FROM knowledge_base ORDER BY id DESC LIMIT 5;')
            recent = cursor.fetchall()
            
            if recent:
                print("最近的知識庫項目:")
                for item in recent:
                    print(f"  - {item[1]} ({item[2]})")
        else:
            print("✅ 知識庫有內容")
            
            # 顯示分類
            cursor.execute('SELECT category, COUNT(*) FROM knowledge_base WHERE "isActive" = true GROUP BY category;')
            categories = cursor.fetchall()
            
            print("📂 分類統計:")
            for cat, cnt in categories:
                print(f"  - {cat}: {cnt} 項")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ 數據庫錯誤: {e}")
        return False

if __name__ == "__main__":
    check_knowledge_base()
