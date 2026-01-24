import psycopg2

def install_pgvector():
    conn = psycopg2.connect(
        host="localhost",
        port="5432",
        database="postgres",
        user="postgres",
        password="Ss520520"
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    try:
        print("檢查pgvector擴展...")
        cursor.execute("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector');")
        exists = cursor.fetchone()[0]
        
        if exists:
            print("✓ pgvector擴展已安裝")
        else:
            print("安裝pgvector擴展...")
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            print("✓ pgvector擴展安裝成功")
        
    except Exception as e:
        print(f"❌ 安裝pgvector時發生錯誤: {e}")
        print("注意：如果pgvector未安裝，請先手動安裝")
        print("Windows PostgreSQL安裝pgvector：")
        print("1. 下載pgvector for Windows")
        print("2. 將vector.dll複製到PostgreSQL lib目錄")
        print("3. 執行CREATE EXTENSION vector;")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    install_pgvector()
