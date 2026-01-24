"""
資料庫檢查和修復工具
檢查後台資料保存功能
"""
import sqlite3
import os
import json
from datetime import datetime
from pathlib import Path

def check_database_status():
    """檢查資料庫狀態"""
    print("🔍 檢查資料庫狀態")
    print("=" * 50)
    
    db_path = "db/custom.db"
    
    # 檢查資料庫文件
    if os.path.exists(db_path):
        print(f"✅ 資料庫文件存在: {db_path}")
        print(f"📁 文件大小: {os.path.getsize(db_path)} bytes")
        
        try:
            # 連接資料庫
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # 獲取資料表列表
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            
            print(f"\n📋 找到 {len(tables)} 個資料表:")
            for table in tables:
                table_name = table[0]
                print(f"  📊 {table_name}")
                
                # 檢查每個表的資料數量
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    print(f"     資料筆數: {count}")
                except Exception as e:
                    print(f"     ❌ 無法讀取: {e}")
            
            # 檢查主要業務表
            business_tables = ['customers', 'orders', 'staff', 'attendance', 'products']
            for table in business_tables:
                if table in [t[0] for t in tables]:
                    print(f"\n💼 {table} 表詳情:")
                    try:
                        cursor.execute(f"PRAGMA table_info({table})")
                        columns = cursor.fetchall()
                        for col in columns:
                            print(f"  📝 {col[1]} ({col[2]})")
                    except Exception as e:
                        print(f"  ❌ 無法讀取欄位: {e}")
            
            conn.close()
            return True
            
        except Exception as e:
            print(f"❌ 無法連接資料庫: {e}")
            return False
    else:
        print(f"❌ 資料庫文件不存在: {db_path}")
        return False

def test_data_persistence():
    """測試資料持久性"""
    print("\n🧪 測試資料保存功能")
    print("=" * 50)
    
    db_path = "db/custom.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 測試插入資料
        test_data = {
            'user_id': f'test_{datetime.now().strftime("%Y%m%d_%H%M%S")}',
            'user_name': '測試用戶',
            'message': '測試訊息',
            'timestamp': datetime.now().isoformat(),
            'response': '測試回應'
        }
        
        # 創建測試表（如果不存在）
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_persistence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                user_name TEXT,
                message TEXT,
                timestamp TEXT,
                response TEXT
            )
        """)
        
        # 插入測試資料
        cursor.execute("""
            INSERT INTO test_persistence (user_id, user_name, message, timestamp, response)
            VALUES (?, ?, ?, ?, ?)
        """, (
            test_data['user_id'],
            test_data['user_name'], 
            test_data['message'],
            test_data['timestamp'],
            test_data['response']
        ))
        
        # 查詢測試
        cursor.execute("SELECT * FROM test_persistence WHERE user_id = ?", (test_data['user_id'],))
        result = cursor.fetchone()
        
        if result:
            print("✅ 資料保存測試成功")
            print(f"📊 測試資料: {result}")
        else:
            print("❌ 資料保存測試失敗")
        
        conn.commit()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ 資料保存測試失敗: {e}")
        return False

def check_line_bot_database_integration():
    """檢查 LINE Bot 資料庫整合"""
    print("\n🤖 檢查 LINE Bot 資料庫整合")
    print("=" * 50)
    
    # 檢查 LINE Bot 相關的資料表
    required_tables = {
        'line_logs': 'LINE 對話記錄',
        'line_users': 'LINE 用戶資料',
        'line_orders': 'LINE 訂單記錄',
        'attendance': '員工打卡記錄',
        'customers': '客戶資料'
    }
    
    db_path = "db/custom.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        existing_tables = [table[0] for table in cursor.fetchall()]
        
        missing_tables = []
        existing_count = 0
        
        for table_name, description in required_tables.items():
            if table_name in existing_tables:
                # 檢查表資料數量
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                print(f"✅ {description} ({table_name}): {count} 筆資料")
                existing_count += 1
            else:
                print(f"❌ 缺少 {description} ({table_name})")
                missing_tables.append(table_name)
        
        print(f"\n📊 總結: {existing_count}/{len(required_tables)} 個必要表存在")
        
        # 創建缺少的表
        if missing_tables:
            print(f"\n🔧 創建缺少的資料表...")
            create_missing_tables(missing_tables, cursor)
        
        conn.commit()
        conn.close()
        
        return len(missing_tables) == 0
        
    except Exception as e:
        print(f"❌ 檢查失敗: {e}")
        return False

def create_missing_tables(missing_tables, cursor):
    """創建缺少的資料表"""
    table_definitions = {
        'line_logs': """
            CREATE TABLE IF NOT EXISTS line_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                user_name TEXT,
                group_id TEXT,
                message TEXT,
                response TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                message_type TEXT DEFAULT 'text'
            )
        """,
        'line_users': """
            CREATE TABLE IF NOT EXISTS line_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                line_user_id TEXT UNIQUE,
                display_name TEXT,
                first_contact TEXT DEFAULT CURRENT_TIMESTAMP,
                last_interaction TEXT DEFAULT CURRENT_TIMESTAMP,
                total_messages INTEGER DEFAULT 0
            )
        """,
        'line_orders': """
            CREATE TABLE IF NOT EXISTS line_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT,
                customer_phone TEXT,
                gas_type TEXT,
                quantity INTEGER,
                price REAL,
                status TEXT DEFAULT 'pending',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                line_user_id TEXT
            )
        """,
        'attendance': """
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                user_name TEXT,
                date TEXT,
                check_in TEXT,
                check_out TEXT,
                status TEXT DEFAULT 'normal',
                notes TEXT
            )
        """,
        'customers': """
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                phone TEXT,
                address TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                line_user_id TEXT,
                total_orders INTEGER DEFAULT 0
            )
        """
    }
    
    for table in missing_tables:
        if table in table_definitions:
            try:
                cursor.execute(table_definitions[table])
                print(f"  ✅ 創建 {table} 表")
            except Exception as e:
                print(f"  ❌ 創建 {table} 表失敗: {e}")

def fix_data_permissions():
    """修復資料庫權限"""
    print("\n🔧 修復資料庫權限")
    print("=" * 50)
    
    db_path = "db/custom.db"
    
    try:
        # 確保資料庫文件可寫
        if os.path.exists(db_path):
            # 嘗試修改文件權限
            os.chmod(db_path, 0o666)
            print(f"✅ 設置 {db_path} 為可寫權限")
        
        # 創建資料庫目錄
        db_dir = os.path.dirname(db_path)
        if not os.path.exists(db_dir):
            os.makedirs(db_dir)
            print(f"✅ 創建資料庫目錄: {db_dir}")
        
        # 測試寫入權限
        test_conn = sqlite3.connect(db_path)
        test_cursor = test_conn.cursor()
        
        test_cursor.execute("""
            CREATE TABLE IF NOT EXISTS permission_test (
                id INTEGER PRIMARY KEY,
                test_data TEXT
            )
        """)
        
        test_cursor.execute("INSERT INTO permission_test (test_data) VALUES (?)", ("權限測試",))
        test_conn.commit()
        test_conn.close()
        
        print("✅ 資料庫寫入權限正常")
        return True
        
    except Exception as e:
        print(f"❌ 權限修復失敗: {e}")
        return False

if __name__ == "__main__":
    print("🛠️ 資料庫檢查和修復工具")
    print(f"🕐 檢查時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 執行檢查
    checks = [
        check_database_status(),
        test_data_persistence(),
        check_line_bot_database_integration(),
        fix_data_permissions()
    ]
    
    # 總結
    print("\n" + "=" * 50)
    print("📊 檢查總結")
    print("=" * 50)
    
    passed = sum(checks)
    total = len(checks)
    
    print(f"✅ 通過檢查: {passed}/{total}")
    
    if passed == total:
        print("🎉 所有檢查通過！資料庫功能正常。")
        print("\n📋 下一步:")
        print("  1. 測試 LINE Bot 資料保存")
        print("  2. 檢查前台顯示")
        print("  3. 驗證資料持久性")
    else:
        print("⚠️  部分檢查失敗，需要進一步修復。")
        print("\n💡 建議:")
        print("  1. 檢查資料庫文件權限")
        print("  2. 確認資料庫路徑正確")
        print("  3. 修復缺少的資料表")
        print("  4. 重新測試保存功能")