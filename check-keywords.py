#!/usr/bin/env python3
"""
檢查知識庫關鍵字數據
"""

import psycopg2

def check_knowledge_keywords():
    try:
        conn = psycopg2.connect(
            host="localhost",
            port="5432", 
            database="postgres",
            user="postgres",
            password="Ss520520"
        )
        cursor = conn.cursor()
        
        print("🔍 檢查知識庫關鍵字數據...")
        
        # 查看幾個示例項目
        cursor.execute('''
            SELECT id, title, category, keywords 
            FROM knowledge_base 
            WHERE "isActive" = true 
            LIMIT 10;
        ''')
        
        items = cursor.fetchall()
        
        print("📊 知識庫項目示例:")
        for item in items:
            print(f"  ID: {item[0]}")
            print(f"  標題: {item[1]}")
            print(f"  分類: {item[2]}")
            print(f"  關鍵字: {item[3]}")
            print(f"  ---")
        
        # 搜索 "安全"
        print("\n🔍 搜索 '安全':")
        cursor.execute('''
            SELECT id, title, category 
            FROM knowledge_base 
            WHERE "isActive" = true 
            AND (
                title ILIKE %s OR 
                content ILIKE %s OR
                %s = ANY(keywords)
            )
            LIMIT 5;
        ''', ['%安全%', '%安全%', '安全'])
        
        safe_results = cursor.fetchall()
        print(f"找到 {len(safe_results)} 項 '安全' 相關結果")
        for result in safe_results:
            print(f"  - {result[1]} ({result[2]})")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ 錯誤: {e}")

if __name__ == "__main__":
    check_knowledge_keywords()
