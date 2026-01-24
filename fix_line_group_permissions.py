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

def fix_all_line_groups():
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        print("=" * 60)
        print("修復所有LINE群組權限")
        print("=" * 60)
        
        # 查詢所有LINE群組
        cursor.execute('''
            SELECT id, "groupId", "groupName", "groupType", "isActive", permissions
            FROM "LineGroup";
        ''')
        groups = cursor.fetchall()
        
        full_permissions = [
            "read_all", "write_all", "delete_all",
            "manage_users", "manage_customers", "manage_orders",
            "manage_inventory", "manage_deliveries", "manage_costs",
            "view_reports", "export_data", "import_data",
            "manage_line_groups", "manage_line_messages",
            "manage_schedules", "manage_attendance", "approve_checks",
            "system_admin", "api_access", "webhook_access"
        ]
        
        print(f"\n找到 {len(groups)} 個LINE群組:\n")
        
        for i, (group_id, group_code, group_name, group_type, is_active, permissions) in enumerate(groups, 1):
            print(f"{i}. {group_name} ({group_code})")
            print(f"   當前類型: {group_type}")
            print(f"   當前狀態: {is_active}")
            print(f"   權限數量: {len(permissions) if permissions else 0}")
            
            # 更新所有群組為啟用並給予全權限
            cursor.execute('''
                UPDATE "LineGroup" 
                SET "groupType" = %s,
                    permissions = %s,
                    "isActive" = true,
                    "updatedAt" = %s
                WHERE id = %s;
            ''', (
                'general',
                full_permissions,
                datetime.now(),
                group_id
            ))
            
            print(f"   ✓ 已更新為啟用狀態並設置全權限\n")
        
        conn.commit()
        
        print("=" * 60)
        print(f"✓ 已修復 {len(groups)} 個LINE群組")
        print("✓ 所有群組現在都擁有全權限並且啟用")
        print("=" * 60)
        
        # 驗證更新結果
        cursor.execute('''
            SELECT "groupId", "groupName", "isActive", "groupType"
            FROM "LineGroup"
            WHERE "isActive" = true;
        ''')
        active_groups = cursor.fetchall()
        
        print(f"\n驗證結果：{len(active_groups)} 個啟用的群組")
        for group_code, group_name, is_active, group_type in active_groups:
            print(f"  • {group_name} ({group_code}) - {group_type} - {is_active}")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ 修復過程中發生錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    fix_all_line_groups()
