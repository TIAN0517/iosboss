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

def setup_boss_system():
    conn = get_database_connection()
    cursor = conn.cursor()
    
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
        print("=== 設置老闆娘和老闆的系統權限 ===\n")
        
        boss_line_id = "U2f7655580a254b416cdb62ae3fd6bb7a"
        boss_name = "老闆娘"
        
        cursor.execute('SELECT id FROM "Customer" WHERE "lineUserId" = %s;', (boss_line_id,))
        customer = cursor.fetchone()
        
        if not customer:
            customer_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO "Customer" 
                (id, name, phone, address, "lineUserId", "groupId", "creditLimit", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            ''', (customer_id, boss_name, "0912345678", "公司地址", boss_line_id, None, 999999, datetime.now()))
            print(f"✓ 創建老闆娘客戶記錄: {customer_id}")
        else:
            customer_id = customer[0]
            print(f"✓ 找到老闆娘現有客戶記錄: {customer_id}")
        
        cursor.execute('''
            UPDATE "Customer" 
            SET "creditLimit" = 999999
            WHERE "lineUserId" = %s;
        ''', (boss_line_id,))
        print(f"✓ 更新老闆娘額度")
        
        group_code = "C2a339c3410b0e24c962923544fe9676b"
        cursor.execute('SELECT id, "groupId", "groupName" FROM "LineGroup" WHERE "groupId" = %s;', (group_code,))
        group = cursor.fetchone()
        
        if group:
            group_id_internal = group[0]
            cursor.execute('''
                UPDATE "LineGroup" 
                SET permissions = %s, "isActive" = true, "memberCount" = 2, 
                    "groupType" = 'admin', "description" = %s
                WHERE id = %s;
            ''', (full_permissions, "老闆娘和老闆專用管理群組 - 全權限", group_id_internal))
            print(f"✓ 更新LINE群組權限: {group[2]}")
            print(f"✓ 群組類型改為admin，權限設為全權限")
        else:
            print(f"⚠ 找不到群組 {group_code}")
        
        cursor.execute('SELECT id FROM "User" WHERE username = %s;', ('uu19700413',))
        boss_user = cursor.fetchone()
        
        if boss_user:
            boss_user_id = boss_user[0]
            cursor.execute('UPDATE "User" SET role = %s, "isActive" = true WHERE id = %s;', ('admin', boss_user_id))
            print(f"✓ 確認老闆娘用戶角色為admin")
        
        cursor.execute('SELECT id FROM "User" WHERE username IN (%s, %s);', ('tian1111', 'bossjy'))
        tian_users = cursor.fetchall()
        
        for tian_user in tian_users:
            user_id = tian_user[0]
            cursor.execute('UPDATE "User" SET role = %s, "isActive" = true WHERE id = %s;', ('admin', user_id))
            print(f"✓ 確認老闆用戶角色為admin")
        
        audit_log_id = str(uuid.uuid4())
        import json
        cursor.execute('''
            INSERT INTO "AuditLog" 
            (id, action, "entityType", "entityId", metadata, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s);
        ''', (audit_log_id, "setup_permissions", "System", "system", 
              json.dumps({"setup_by": "system", "boss_line_id": boss_line_id, "group": group_code}), datetime.now()))
        print(f"✓ 記錄審計日誌")
        
        conn.commit()
        
        print("\n=== 驗證設置結果 ===")
        cursor.execute('SELECT COUNT(*) FROM "Customer" WHERE "lineUserId" = %s;', (boss_line_id,))
        count = cursor.fetchone()[0]
        print(f"✓ 老闆娘客戶記錄數: {count}")
        
        cursor.execute('SELECT permissions, "groupType", "isActive" FROM "LineGroup" WHERE "groupId" = %s;', (group_code,))
        result = cursor.fetchone()
        if result:
            print(f"✓ 群組權限數量: {len(result[0])}")
            print(f"✓ 群組類型: {result[1]}")
            print(f"✓ 群組狀態: {result[2]}")
        
        cursor.execute('SELECT COUNT(*) FROM "User" WHERE role = %s AND "isActive" = true;', ('admin',))
        admin_count = cursor.fetchone()[0]
        print(f"✓ 管理員用戶數: {admin_count}")
        
        cursor.execute('SELECT COUNT(*) FROM "AuditLog";')
        audit_count = cursor.fetchone()[0]
        print(f"✓ 審計日誌記錄數: {audit_count}")
        
        print("\n" + "="*50)
        print("✓ 老闆娘和老闆權限設置完成！")
        print("✓ LINE群組已綁定並設置全權限")
        print("✓ 所有資料已持久化到PostgreSQL")
        print("="*50)
        
    except Exception as e:
        conn.rollback()
        print(f"❌ 設置過程中發生錯誤: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    setup_boss_system()
