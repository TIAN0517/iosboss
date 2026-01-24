"""
PostgreSQL 資料庫檢查和修復工具
檢查 LINE Bot 的資料保存問題
"""
import os
import psycopg2
from psycopg2 import sql
from datetime import datetime
import json

def check_postgresql_connection():
    """檢查 PostgreSQL 連接"""
    print("🔍 檢查 PostgreSQL 連接")
    print("=" * 50)
    
    # 讀取資料庫連接字串
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:Ss520520@localhost:5432/postgres")
    
    print(f"📡 資料庫 URL: {db_url.replace('Ss520520', '***')}")  # 隱藏密碼
    
    try:
        # 連接到 PostgreSQL
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        print("✅ PostgreSQL 連接成功")
        
        # 檢查資料庫版本
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"📋 PostgreSQL 版本: {version.split(',')[0]}")
        
        # 檢查資料表
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"\n📊 找到 {len(tables)} 個資料表:")
        
        for table in tables:
            table_name = table[0]
            # 檢查資料筆數
            try:
                cursor.execute(f"SELECT COUNT(*) FROM \"{table_name}\"")
                count = cursor.fetchone()[0]
                print(f"  📋 {table_name}: {count} 筆資料")
            except Exception as e:
                print(f"  ❌ {table_name}: 無法讀取 ({e})")
        
        conn.close()
        return True, db_url
        
    except Exception as e:
        print(f"❌ PostgreSQL 連接失敗: {e}")
        return False, None

def check_line_bot_tables():
    """檢查 LINE Bot 相關資料表"""
    print("\n🤖 檢查 LINE Bot 資料表")
    print("=" * 50)
    
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:Ss520520@localhost:5432/postgres")
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # 檢查必要資料表
        required_tables = {
            'User': '用戶資料',
            'Customer': '客戶資料', 
            'GasOrder': '瓦斯訂單',
            'Check': '員工打卡',
            'LineLog': 'LINE 對話記錄',
            'LineUser': 'LINE 用戶'
        }
        
        existing_tables = []
        missing_tables = []
        
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        
        db_tables = [table[0] for table in cursor.fetchall()]
        
        for table_name, description in required_tables.items():
            if table_name in db_tables:
                # 檢查資料筆數
                cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                count = cursor.fetchone()[0]
                print(f"✅ {description} ({table_name}): {count} 筆")
                existing_tables.append(table_name)
            else:
                print(f"❌ 缺少 {description} ({table_name})")
                missing_tables.append(table_name)
        
        print(f"\n📊 總結: {len(existing_tables)}/{len(required_tables)} 個表存在")
        
        # 創建缺少的 LINE Bot 資料表
        if missing_tables:
            print(f"\n🔧 創建缺少的資料表...")
            create_missing_line_tables(missing_tables, cursor)
        
        conn.commit()
        conn.close()
        
        return len(missing_tables) == 0
        
    except Exception as e:
        print(f"❌ 檢查失敗: {e}")
        return False

def create_missing_line_tables(missing_tables, cursor):
    """創建缺少的 LINE Bot 資料表"""
    table_definitions = {
        'LineLog': """
            CREATE TABLE IF NOT EXISTS "LineLog" (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                user_name TEXT,
                group_id TEXT,
                message TEXT,
                response TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                message_type TEXT DEFAULT 'text'
            );
        """,
        'LineUser': """
            CREATE TABLE IF NOT EXISTS "LineUser" (
                id SERIAL PRIMARY KEY,
                line_user_id TEXT UNIQUE,
                display_name TEXT,
                first_contact TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_messages INTEGER DEFAULT 0
            );
        """,
        'LineOrder': """
            CREATE TABLE IF NOT EXISTS "LineOrder" (
                id SERIAL PRIMARY KEY,
                customer_name TEXT,
                customer_phone TEXT,
                gas_type TEXT,
                quantity INTEGER,
                price DECIMAL(10,2),
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                line_user_id TEXT
            );
        """
    }
    
    for table in missing_tables:
        if table in table_definitions:
            try:
                cursor.execute(table_definitions[table])
                print(f"  ✅ 創建 {table} 表")
            except Exception as e:
                print(f"  ❌ 創建 {table} 表失敗: {e}")

def test_data_persistence():
    """測試資料持久性"""
    print("\n🧪 測試資料持久性")
    print("=" * 50)
    
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:Ss520520@localhost:5432/postgres")
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # 測試插入到 LineLog 表
        test_data = (
            f'line_test_{datetime.now().strftime("%Y%m%d_%H%M%S")}',
            '測試用戶',
            '測試群組',
            '測試訊息',
            '測試回應'
        )
        
        cursor.execute("""
            INSERT INTO "LineLog" (user_id, user_name, group_id, message, response)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id;
        """, test_data)
        
        inserted_id = cursor.fetchone()[0]
        print(f"✅ 資料插入成功，ID: {inserted_id}")
        
        # 查詢測試
        cursor.execute('SELECT * FROM "LineLog" WHERE id = %s', (inserted_id,))
        result = cursor.fetchone()
        
        if result:
            print(f"✅ 資料查詢成功: {result}")
        else:
            print("❌ 資料查詢失敗")
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 資料持久性測試失敗: {e}")
        return False

def check_environment_variables():
    """檢查環境變數"""
    print("\n🔑 檢查環境變數")
    print("=" * 50)
    
    required_vars = [
        'DATABASE_URL',
        'LINE_CHANNEL_ACCESS_TOKEN',
        'LINE_CHANNEL_SECRET'
    ]
    
    missing_vars = []
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            if 'password' in var.lower() or 'secret' in var.lower():
                print(f"✅ {var}: ***已設定***")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: 未設定")
            missing_vars.append(var)
    
    print(f"\n📊 總結: {len(required_vars) - len(missing_vars)}/{len(required_vars)} 個變數已設定")
    
    return len(missing_vars) == 0

def fix_database_permissions():
    """修復資料庫權限"""
    print("\n🔧 修復資料庫權限")
    print("=" * 50)
    
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:Ss520520@localhost:5432/postgres")
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # 檢查當前用戶權限
        cursor.execute("""
            SELECT current_user, current_database();
        """)
        
        user, database = cursor.fetchone()
        print(f"📋 當前用戶: {user}")
        print(f"📋 當前資料庫: {database}")
        
        # 檢查表權限
        cursor.execute("""
            SELECT 
                schemaname,
                tablename,
                hasinserts,
                hasselects,
                hasupdates,
                hasdeletes
            FROM pg_tables 
            WHERE schemaname = 'public';
        """)
        
        tables = cursor.fetchall()
        print(f"\n📊 檢查 {len(tables)} 個表的權限:")
        
        for schema, table, inserts, selects, updates, deletes in tables:
            permissions = []
            if inserts: permissions.append('INSERT')
            if selects: permissions.append('SELECT')
            if updates: permissions.append('UPDATE')
            if deletes: permissions.append('DELETE')
            
            print(f"  📋 {table}: {', '.join(permissions) if permissions else '無權限'}")
        
        # 授予必要權限
        cursor.execute("""
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO current_user;
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO current_user;
        """)
        
        print("✅ 已授予必要權限")
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 權限修復失敗: {e}")
        return False

if __name__ == "__main__":
    print("🛠️ PostgreSQL 資料庫檢查和修復工具")
    print(f"🕐 檢查時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 執行檢查
    checks = [
        check_postgresql_connection,
        check_line_bot_tables,
        test_data_persistence,
        check_environment_variables,
        fix_database_permissions
    ]
    
    results = []
    for check in checks:
        try:
            result = check()
            results.append(result)
        except Exception as e:
            print(f"❌ 檢查執行失敗: {e}")
            results.append(False)
    
    # 總結
    print("\n" + "=" * 50)
    print("📊 檢查總結")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    print(f"✅ 通過檢查: {passed}/{total}")
    
    if passed == total:
        print("🎉 所有檢查通過！PostgreSQL 資料庫功能正常。")
        print("\n📋 下一步:")
        print("  1. 確保 LINE Bot 使用 PostgreSQL 連接")
        print("  2. 測試 LINE 訊息保存到資料庫")
        print("  3. 檢查前台資料顯示")
    else:
        print("⚠️  部分檢查失敗，需要進一步修復。")
        print("\n💡 建議:")
        print("  1. 檢查 PostgreSQL 服務是否運行")
        print("  2. 確認資料庫連接字串正確")
        print("  3. 修復資料表結構")
        print("  4. 檢查權限設定")