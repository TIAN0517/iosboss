import psycopg2

def get_database_connection():
    return psycopg2.connect(
        host="localhost",
        port="5432",
        database="postgres",
        user="postgres",
        password="Ss520520"
    )

def check_dispatch_table():
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE '%dispatch%';
        ''')
        tables = cursor.fetchall()
        print("Dispatch相關的表:")
        for table in tables:
            print(f"  - {table[0]}")
        
        if tables:
            table_name = tables[0][0]
            print(f"\n檢查 {table_name} 表結構...")
            cursor.execute(f'''
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{table_name}';
            ''')
            columns = cursor.fetchall()
            print("\n欄位:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]}")
        
    except Exception as e:
        print(f"錯誤: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    check_dispatch_table()
