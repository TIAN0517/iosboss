import psycopg2

def get_database_connection():
    return psycopg2.connect(
        host="localhost",
        port="5432",
        database="postgres",
        user="postgres",
        password="Ss520520"
    )

def check_product_constraints():
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        print("檢查Product表約束...")
        cursor.execute('''
            SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints 
            WHERE table_name = 'Product';
        ''')
        constraints = cursor.fetchall()
        print("\nProduct表約束:")
        for cons in constraints:
            print(f"  - {cons[0]}: {cons[1]}")
        
        print("\n檢查Customer表約束...")
        cursor.execute('''
            SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints 
            WHERE table_name = 'Customer';
        ''')
        constraints = cursor.fetchall()
        print("\nCustomer表約束:")
        for cons in constraints:
            print(f"  - {cons[0]}: {cons[1]}")
        
    except Exception as e:
        print(f"錯誤: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    check_product_constraints()
