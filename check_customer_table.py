import psycopg2

def get_database_connection():
    return psycopg2.connect(
        host="localhost",
        port="5432",
        database="postgres",
        user="postgres",
        password="Ss520520"
    )

def check_customer_table():
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        print("檢查Customer表結構...")
        cursor.execute('''
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Customer';
        ''')
        columns = cursor.fetchall()
        print("\nCustomer表欄位:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]}")
        
    except Exception as e:
        print(f"錯誤: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    check_customer_table()
