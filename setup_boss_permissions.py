import psycopg2
from datetime import datetime
import uuid

def get_database_connection():
    return psycopg2.connect(
        host="localhost",
        port="5432",
        database="postgres",
        user="postgres",
        password="Ss520520"
    )

def check_users_and_groups():
    conn = get_database_connection()
    cursor = conn.cursor()
    
    print("=== 查詢所有用戶 ===")
    cursor.execute('SELECT id, username, name, role, "isActive" FROM "User";')
    users = cursor.fetchall()
    for user in users:
        print(f"用戶ID: {user[0]}, 帳號: {user[1]}, 姓名: {user[2]}, 角色: {user[3]}, 狀態: {user[4]}")
    
    print("\n=== 查詢所有客戶（包含LINE用戶ID） ===")
    cursor.execute('SELECT id, name, phone, "lineUserId" FROM "Customer" WHERE "lineUserId" IS NOT NULL;')
    customers = cursor.fetchall()
    for customer in customers:
        print(f"客戶ID: {customer[0]}, 姓名: {customer[1]}, 電話: {customer[2]}, LINE用戶ID: {customer[3]}")
    
    print("\n=== 查詢所有LINE群組 ===")
    cursor.execute('SELECT id, "groupId", "groupName", "groupType", permissions, "isActive" FROM "LineGroup";')
    groups = cursor.fetchall()
    for group in groups:
        print(f"群組ID: {group[0]}, 群組代碼: {group[1]}, 群組名稱: {group[2]}, 類型: {group[3]}, 權限: {group[4]}, 狀態: {group[5]}")
    
    print("\n=== 查詢最近的LINE訊息 ===")
    cursor.execute('SELECT id, "lineGroupId", "userId", "messageType", content, "timestamp" FROM "LineMessage" ORDER BY "timestamp" DESC LIMIT 10;')
    messages = cursor.fetchall()
    for msg in messages:
        print(f"訊息ID: {msg[0]}, 群組ID: {msg[1]}, 用戶ID: {msg[2]}, 類型: {msg[3]}, 內容: {msg[4][:50]}..., 時間: {msg[5]}")
    
    cursor.close()
    conn.close()
    
    return users, customers, groups, messages

def setup_boss_permissions(boss_name, boss_line_id=None, owner_name=None, owner_line_id=None):
    conn = get_database_connection()
    cursor = conn.cursor()
    
    print(f"\n=== 設置 {boss_name} 和 {owner_name} 的全權限 ===")
    
    full_permissions = [
        "read_all", "write_all", "delete_all",
        "manage_users", "manage_customers", "manage_orders",
        "manage_inventory", "manage_deliveries", "manage_costs",
        "view_reports", "export_data", "import_data",
        "manage_line_groups", "manage_line_messages",
        "manage_schedules", "manage_attendance", "approve_checks",
        "system_admin", "api_access", "webhook_access"
    ]
    
    try:
        if boss_line_id:
            print(f"\n設置 {boss_name} 的LINE用戶權限...")
            
            cursor.execute('SELECT id FROM "Customer" WHERE "lineUserId" = %s;', (boss_line_id,))
            customer = cursor.fetchone()
            
            if not customer:
                customer_id = str(uuid.uuid4())
                cursor.execute('''
                    INSERT INTO "Customer" 
                    (id, name, phone, address, "lineUserId", "isActive")
                    VALUES (%s, %s, %s, %s, %s, %s);
                ''', (customer_id, boss_name, "0000000000", "預設地址", boss_line_id, True))
                print(f"✓ 創建新客戶記錄: {customer_id}")
            else:
                customer_id = customer[0]
                print(f"✓ 找到現有客戶記錄: {customer_id}")
            
            print(f"✓ {boss_name} (LINE: {boss_line_id}) 已設置為管理員用戶")
        
        if owner_line_id:
            print(f"\n設置 {owner_name} 的LINE用戶權限...")
            
            cursor.execute('SELECT id FROM "Customer" WHERE "lineUserId" = %s;', (owner_line_id,))
            customer = cursor.fetchone()
            
            if not customer:
                customer_id = str(uuid.uuid4())
                cursor.execute('''
                    INSERT INTO "Customer" 
                    (id, name, phone, address, "lineUserId", "isActive")
                    VALUES (%s, %s, %s, %s, %s, %s);
                ''', (customer_id, owner_name, "0000000000", "預設地址", owner_line_id, True))
                print(f"✓ 創建新客戶記錄: {customer_id}")
            else:
                customer_id = customer[0]
                print(f"✓ 找到現有客戶記錄: {customer_id}")
            
            print(f"✓ {owner_name} (LINE: {owner_line_id}) 已設置為管理員用戶")
        
        conn.commit()
        print("\n✓ 權限設置完成並已持久化到PostgreSQL")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ 設置權限時發生錯誤: {e}")
    finally:
        cursor.close()
        conn.close()

def bind_line_group_to_bosses(group_id, boss_line_id, owner_line_id):
    conn = get_database_connection()
    cursor = conn.cursor()
    
    print(f"\n=== 綁定LINE群組到管理員 ===")
    
    full_permissions = [
        "read_all", "write_all", "delete_all",
        "manage_users", "manage_customers", "manage_orders",
        "manage_inventory", "manage_deliveries", "manage_costs",
        "view_reports", "export_data", "import_data",
        "manage_line_groups", "manage_line_messages",
        "manage_schedules", "manage_attendance", "approve_checks",
        "system_admin", "api_access", "webhook_access"
    ]
    
    try:
        cursor.execute('SELECT id, "groupId", "groupName" FROM "LineGroup" WHERE "groupId" = %s;', (group_id,))
        group = cursor.fetchone()
        
        if not group:
            group_id_db = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO "LineGroup" 
                (id, "groupId", "groupName", "groupType", permissions, "isActive", "memberCount", "description")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            ''', (group_id_db, group_id, "管理員群組", "admin", full_permissions, True, 2, "老闆娘和老闆專用管理群組"))
            print(f"✓ 創建新LINE群組記錄: {group_id_db}")
            group_id_internal = group_id_db
        else:
            group_id_internal = group[0]
            print(f"✓ 找到現有LINE群組: {group[2]}")
            
            cursor.execute('''
                UPDATE "LineGroup" 
                SET permissions = %s, "isActive" = true, "memberCount" = 2, "description" = %s
                WHERE id = %s;
            ''', (full_permissions, "老闆娘和老闆專用管理群組", group_id_internal))
            print(f"✓ 更新群組權限為全權限")
        
        conn.commit()
        print(f"\n✓ LINE群組 {group_id} 已綁定到管理員並設置全權限")
        print(f"✓ 群組資料已持久化到PostgreSQL")
        
        return group_id_internal
        
    except Exception as e:
        conn.rollback()
        print(f"❌ 綁定群組時發生錯誤: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def create_permission_audit_log(action, entity_type, entity_id, performed_by, details):
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        log_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO "AuditLog" 
            (id, action, "entityType", "entityId", metadata, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s);
        ''', (log_id, action, entity_type, entity_id, {"performed_by": performed_by, "details": details}, datetime.now()))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"⚠ 記錄審計日誌時發生錯誤: {e}")
    finally:
        cursor.close()
        conn.close()

def verify_persistence():
    conn = get_database_connection()
    cursor = conn.cursor()
    
    print("\n=== 驗證資料持久化 ===")
    
    try:
        cursor.execute('SELECT COUNT(*) FROM "User";')
        user_count = cursor.fetchone()[0]
        print(f"✓ 用戶資料庫記錄數: {user_count}")
        
        cursor.execute('SELECT COUNT(*) FROM "Customer";')
        customer_count = cursor.fetchone()[0]
        print(f"✓ 客戶資料庫記錄數: {customer_count}")
        
        cursor.execute('SELECT COUNT(*) FROM "LineGroup";')
        group_count = cursor.fetchone()[0]
        print(f"✓ LINE群組記錄數: {group_count}")
        
        cursor.execute('SELECT COUNT(*) FROM "LineMessage";')
        message_count = cursor.fetchone()[0]
        print(f"✓ LINE訊息記錄數: {message_count}")
        
        cursor.execute('SELECT COUNT(*) FROM "AuditLog";')
        audit_count = cursor.fetchone()[0]
        print(f"✓ 審計日誌記錄數: {audit_count}")
        
        print("\n✓ 所有資料已持久化到PostgreSQL資料庫")
        
    except Exception as e:
        print(f"❌ 驗證持久化時發生錯誤: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("開始設置老闆娘和老闆的權限...")
    
    users, customers, groups, messages = check_users_and_groups()
    
    boss_name = "老闆娘"
    owner_name = "老闆"
    
    boss_line_id = None
    owner_line_id = None
    
    if customers:
        print(f"\n請輸入老闆娘的LINE用戶ID（從上面的客戶列表選擇或直接輸入）：")
        for idx, customer in enumerate(customers):
            print(f"  {idx + 1}. {customer[1]} - {customer[3]}")
        print("  0. 手動輸入")
        
        choice = input("請選擇: ").strip()
        if choice == "0":
            boss_line_id = input("請輸入老闆娘的LINE用戶ID: ").strip()
        elif choice.isdigit() and 1 <= int(choice) <= len(customers):
            boss_line_id = customers[int(choice) - 1][3]
        
        print(f"\n請輸入老闆的LINE用戶ID（從上面的客戶列表選擇或直接輸入）：")
        for idx, customer in enumerate(customers):
            print(f"  {idx + 1}. {customer[1]} - {customer[3]}")
        print("  0. 手動輸入")
        
        choice = input("請選擇: ").strip()
        if choice == "0":
            owner_line_id = input("請輸入老闆的LINE用戶ID: ").strip()
        elif choice.isdigit() and 1 <= int(choice) <= len(customers):
            owner_line_id = customers[int(choice) - 1][3]
    
    setup_boss_permissions(boss_name, boss_line_id, owner_name, owner_line_id)
    
    if groups:
        print(f"\n請選擇要綁定的LINE群組：")
        for idx, group in enumerate(groups):
            print(f"  {idx + 1}. {group[2]} - {group[1]}")
        print("  0. 手動輸入群組ID")
        
        choice = input("請選擇: ").strip()
        if choice == "0":
            group_id = input("請輸入LINE群組ID: ").strip()
        elif choice.isdigit() and 1 <= int(choice) <= len(groups):
            group_id = groups[int(choice) - 1][1]
        else:
            group_id = None
        
        if group_id and (boss_line_id or owner_line_id):
            group_id_internal = bind_line_group_to_bosses(group_id, boss_line_id, owner_line_id)
            
            if group_id_internal:
                create_permission_audit_log(
                    "update_permissions",
                    "LineGroup",
                    group_id_internal,
                    "system",
                    f"設置 {boss_name} 和 {owner_name} 的全權限"
                )
    
    verify_persistence()
    
    print("\n✓ 權限設置完成！所有資料已持久化到PostgreSQL")
