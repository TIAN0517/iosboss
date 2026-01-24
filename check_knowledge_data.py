import psycopg2

def get_database_connection():
    return psycopg2.connect(
        host="localhost",
        port="5432",
        database="postgres",
        user="postgres",
        password="Ss520520"
    )

def check_knowledge_data():
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        print("查詢知識庫中包含'漏氣'的記錄...")
        cursor.execute('''
            SELECT title, category, keywords 
            FROM "knowledge_base" 
            WHERE "isActive" = true 
            LIMIT 10;
        ''')
        
        results = cursor.fetchall()
        print(f"\n找到 {len(results)} 筆記錄:\n")
        for i, (title, category, keywords) in enumerate(results, 1):
            print(f"{i}. {title} ({category})")
            print(f"   關鍵字: {keywords}\n")
        
        print("\n搜索測試...")
        cursor.execute('''
            SELECT title FROM "knowledge_base" 
            WHERE "isActive" = true 
              AND (
                  title ILIKE %s OR 
                  content ILIKE %s OR
                  %s = ANY(keywords)
              )
            LIMIT 5;
        ''', ('%漏氣%', '%漏氣%', '漏氣'))
        
        search_results = cursor.fetchall()
        print(f"找到 {len(search_results)} 筆相關記錄:")
        for (title,) in search_results:
            print(f"  - {title}")
        
    except Exception as e:
        print(f"錯誤: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    check_knowledge_data()
