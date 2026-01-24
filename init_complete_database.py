import psycopg2
from datetime import datetime, timedelta
import uuid

def get_database_connection():
    return psycopg2.connect(
        host="localhost",
        port="5432",
        database="postgres",
        user="postgres",
        password="Ss520520"
    )

def init_complete_database():
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        print("=" * 60)
        print("初始化完整PostgreSQL數據庫")
        print("=" * 60)
        
        print("\n[1/15] 創建/更新管理員用戶...")
        admin_users = [
            {
                "username": "uu19700413",
                "password": "hashed_password_1",
                "email": "boss@example.com",
                "name": "老闆娘",
                "role": "admin",
                "phone": "0912345678",
                "department": "管理部",
                "isActive": True
            },
            {
                "username": "tian1111",
                "password": "hashed_password_2",
                "email": "tian@example.com",
                "name": "Tian",
                "role": "admin",
                "phone": "0912345679",
                "department": "管理部",
                "isActive": True
            },
            {
                "username": "bossjy",
                "password": "hashed_password_3",
                "email": "bossjy@example.com",
                "name": "BossJy",
                "role": "admin",
                "phone": "0912345680",
                "department": "管理部",
                "isActive": True
            },
            {
                "username": "kai801129",
                "password": "hashed_password_4",
                "email": "kai@example.com",
                "name": "Kai",
                "role": "admin",
                "phone": "0912345681",
                "department": "管理部",
                "isActive": True
            },
            {
                "username": "yzrong",
                "password": "hashed_password_5",
                "email": "yzrong@example.com",
                "name": "彥榮",
                "role": "staff",
                "phone": "0912345682",
                "department": "配送部",
                "isActive": True
            },
            {
                "username": "staff",
                "password": "hashed_password_6",
                "email": "staff@example.com",
                "name": "員工",
                "role": "staff",
                "phone": "0912345683",
                "department": "配送部",
                "isActive": True
            }
        ]
        
        for user in admin_users:
            cursor.execute('''
                INSERT INTO "User" 
                (id, username, password, email, name, role, phone, department, "isActive", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (username) DO UPDATE SET
                    name = EXCLUDED.name,
                    role = EXCLUDED.role,
                    phone = EXCLUDED.phone,
                    department = EXCLUDED.department,
                    "isActive" = EXCLUDED."isActive",
                    "updatedAt" = EXCLUDED."updatedAt";
            ''', (
                str(uuid.uuid4()),
                user["username"],
                user["password"],
                user["email"],
                user["name"],
                user["role"],
                user["phone"],
                user["department"],
                user["isActive"],
                datetime.now(),
                datetime.now()
            ))
        
        print(f"✓ 已創建/更新 {len(admin_users)} 個用戶")
        
        print("\n[2/15] 創建產品類別...")
        product_categories = [
            {"name": "瓦斯產品", "description": "各種瓦斯產品"},
            {"name": "配件產品", "description": "瓦斯配件產品"},
            {"name": "服務產品", "description": "相關服務產品"}
        ]
        
        for category in product_categories:
            cursor.execute('''
                INSERT INTO "ProductCategory" 
                (id, name, description, "isActive", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            ''', (
                str(uuid.uuid4()),
                category["name"],
                category["description"],
                True,
                datetime.now(),
                datetime.now()
            ))
        
        print(f"✓ 已創建 {len(product_categories)} 個產品類別")
        
        print("\n[3/15] 創建產品...")
        cursor.execute('SELECT id FROM "ProductCategory" WHERE name = %s LIMIT 1;', ('瓦斯產品',))
        category_result = cursor.fetchone()
        category_id = category_result[0] if category_result else str(uuid.uuid4())
        
        products = [
            {"name": "20公斤瓦斯桶", "code": "GAS20", "price": 800, "cost": 600, "capacity": "20公斤", "unit": "桶"},
            {"name": "15公斤瓦斯桶", "code": "GAS15", "price": 600, "cost": 450, "capacity": "15公斤", "unit": "桶"},
            {"name": "10公斤瓦斯桶", "code": "GAS10", "price": 400, "cost": 300, "capacity": "10公斤", "unit": "桶"},
            {"name": "5公斤瓦斯桶", "code": "GAS05", "price": 200, "cost": 150, "capacity": "5公斤", "unit": "桶"},
            {"name": "瓦斯調節器", "code": "REG01", "price": 150, "cost": 100, "capacity": None, "unit": "個"},
            {"name": "瓦斯管", "code": "TUBE01", "price": 80, "cost": 50, "capacity": "1公尺", "unit": "條"},
            {"name": "瓦斯爐", "code": "STOVE01", "price": 1200, "cost": 900, "capacity": None, "unit": "台"}
        ]
        
        for product in products:
            cursor.execute('SELECT id FROM "Product" WHERE code = %s;', (product["code"],))
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute('''
                    UPDATE "Product" 
                    SET name = %s, price = %s, cost = %s, "updatedAt" = %s
                    WHERE code = %s;
                ''', (product["name"], product["price"], product["cost"], datetime.now(), product["code"]))
            else:
                cursor.execute('''
                    INSERT INTO "Product" 
                    (id, "categoryId", name, code, price, cost, capacity, unit, "isActive", "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                ''', (
                    str(uuid.uuid4()),
                    category_id,
                    product["name"],
                    product["code"],
                    product["price"],
                    product["cost"],
                    product["capacity"],
                    product["unit"],
                    True,
                    datetime.now(),
                    datetime.now()
                ))
        
        print(f"✓ 已創建 {len(products)} 個產品")
        
        print("\n[4/15] 初始化庫存...")
        cursor.execute('SELECT id FROM "Product";')
        product_ids = [row[0] for row in cursor.fetchall()]
        
        for i, product_id in enumerate(product_ids):
            cursor.execute('''
                INSERT INTO "Inventory" 
                (id, "productId", quantity, "minStock", "updatedAt")
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT ("productId") DO UPDATE SET
                    quantity = EXCLUDED.quantity,
                    "updatedAt" = EXCLUDED."updatedAt";
            ''', (
                str(uuid.uuid4()),
                product_id,
                50 + i * 10,
                20,
                datetime.now()
            ))
        
        print(f"✓ 已初始化 {len(product_ids)} 個產品的庫存")
        
        print("\n[5/15] 創建客戶群組...")
        customer_groups = [
            {"name": "一般客戶", "discount": 0, "creditTerm": 30, "description": "一般客戶群組"},
            {"name": "VIP客戶", "discount": 0.05, "creditTerm": 60, "description": "VIP客戶群組"},
            {"name": "企業客戶", "discount": 0.1, "creditTerm": 90, "description": "企業客戶群組"}
        ]
        
        for group in customer_groups:
            cursor.execute('''
                INSERT INTO "CustomerGroup" 
                (id, name, discount, "creditTerm", description, "isActive", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            ''', (
                str(uuid.uuid4()),
                group["name"],
                group["discount"],
                group["creditTerm"],
                group["description"],
                True,
                datetime.now(),
                datetime.now()
            ))
        
        print(f"✓ 已創建 {len(customer_groups)} 個客戶群組")
        
        print("\n[6/15] 創建客戶...")
        cursor.execute('SELECT id FROM "CustomerGroup" WHERE name = %s LIMIT 1;', ('一般客戶',))
        group_result = cursor.fetchone()
        group_id = group_result[0] if group_result else None
        
        customers = [
            {
                "name": "老闆娘",
                "phone": "0912345678",
                "address": "公司地址",
                "lineUserId": "U2f7655580a254b416cdb62ae3fd6bb7a",
                "creditLimit": 999999,
                "groupId": None
            },
            {
                "name": "張三",
                "phone": "0912345671",
                "address": "台北市信義區信義路五段7號",
                "lineUserId": None,
                "creditLimit": 10000,
                "groupId": group_id
            },
            {
                "name": "李四",
                "phone": "0912345672",
                "address": "台北市大安區忠孝東路四段1號",
                "lineUserId": None,
                "creditLimit": 20000,
                "groupId": group_id
            },
            {
                "name": "王五",
                "phone": "0912345673",
                "address": "新北市板橋區文化路一段100號",
                "lineUserId": None,
                "creditLimit": 5000,
                "groupId": group_id
            },
            {
                "name": "陳六",
                "phone": "0912345674",
                "address": "桃園市中壢區中正路200號",
                "lineUserId": None,
                "creditLimit": 8000,
                "groupId": group_id
            },
            {
                "name": "林七",
                "phone": "0912345675",
                "address": "台中市西屯區台灣大道三段100號",
                "lineUserId": None,
                "creditLimit": 15000,
                "groupId": group_id
            },
            {
                "name": "黃八",
                "phone": "0912345676",
                "address": "高雄市左營區博愛二路200號",
                "lineUserId": None,
                "creditLimit": 12000,
                "groupId": group_id
            },
            {
                "name": "劉九",
                "phone": "0912345677",
                "address": "台南市東區林森路一段100號",
                "lineUserId": None,
                "creditLimit": 6000,
                "groupId": group_id
            }
        ]
        
        for customer in customers:
            cursor.execute('SELECT id FROM "Customer" WHERE "lineUserId" = %s;', (customer["lineUserId"],))
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute('''
                    UPDATE "Customer" 
                    SET name = %s, phone = %s, address = %s, "creditLimit" = %s, "updatedAt" = %s
                    WHERE "lineUserId" = %s;
                ''', (customer["name"], customer["phone"], customer["address"], customer["creditLimit"], datetime.now(), customer["lineUserId"]))
            else:
                cursor.execute('''
                    INSERT INTO "Customer" 
                    (id, name, phone, address, "lineUserId", "creditLimit", "groupId", "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                ''', (
                    str(uuid.uuid4()),
                    customer["name"],
                    customer["phone"],
                    customer["address"],
                    customer["lineUserId"],
                    customer["creditLimit"],
                    customer["groupId"],
                    datetime.now(),
                    datetime.now()
                ))
        
        print(f"✓ 已創建 {len(customers)} 個客戶")
        
        print("\n[7/15] 創建示範訂單...")
        cursor.execute('SELECT id FROM "Customer";')
        customer_ids = [row[0] for row in cursor.fetchall()]
        
        cursor.execute('SELECT id, price FROM "Product";')
        product_data = cursor.fetchall()
        
        for i in range(20):
            customer_id = customer_ids[i % len(customer_ids)]
            product_id, product_price = product_data[i % len(product_data)]
            
            order_no = f"ORD{(datetime.now() - timedelta(days=i)).strftime('%Y%m%d%H%M%S')}"
            order_id = str(uuid.uuid4())
            quantity = (i % 5) + 1
            
            cursor.execute('''
                INSERT INTO "GasOrder" 
                (id, "customerId", "orderNo", "orderDate", "deliveryDate", status, subtotal, "total", "paidAmount", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            ''', (
                order_id,
                customer_id,
                order_no,
                datetime.now() - timedelta(days=i),
                datetime.now() - timedelta(days=i-1) if i > 0 else None,
                ['completed', 'pending', 'delivering'][i % 3],
                product_price * quantity,
                product_price * quantity,
                product_price * quantity if i % 2 == 0 else 0,
                datetime.now() - timedelta(days=i),
                datetime.now()
            ))
            
            cursor.execute('''
                INSERT INTO "GasOrderItem" 
                (id, "orderId", "productId", quantity, "unitPrice", subtotal)
                VALUES (%s, %s, %s, %s, %s, %s);
            ''', (
                str(uuid.uuid4()),
                order_id,
                product_id,
                quantity,
                product_price,
                product_price * quantity
            ))
        
        print(f"✓ 已創建 20 個示範訂單")
        
        print("\n[8/15] 創建配送記錄...")
        cursor.execute('SELECT id, "customerId" FROM "GasOrder" WHERE status = %s LIMIT 10;', ('delivering',))
        delivering_orders = cursor.fetchall()
        
        for order_id, customer_id in delivering_orders:
            cursor.execute('SELECT id FROM "DeliveryRecord" WHERE "orderId" = %s;', (order_id,))
            existing = cursor.fetchone()
            
            if not existing:
                cursor.execute('''
                    INSERT INTO "DeliveryRecord" 
                    (id, "orderId", "customerId", status, "deliveryDate", "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s);
                ''', (
                    str(uuid.uuid4()),
                    order_id,
                    customer_id,
                    'pending',
                    datetime.now() + timedelta(days=1),
                    datetime.now(),
                    datetime.now()
                ))
        
        print(f"✓ 已創建/更新配送記錄")
        
        print("\n[9/15] 創建成本記錄...")
        cost_categories = ["原料成本", "運輸成本", "人力成本", "設備成本", "其他成本"]
        
        for i in range(30):
            cursor.execute('''
                INSERT INTO "CostRecord" 
                (id, type, category, amount, description, date, "createdAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s);
            ''', (
                str(uuid.uuid4()),
                'expense',
                cost_categories[i % len(cost_categories)],
                (i + 1) * 1000,
                f'{cost_categories[i % len(cost_categories)]} - 第{i+1}筆',
                datetime.now() - timedelta(days=i),
                datetime.now() - timedelta(days=i)
            ))
        
        print(f"✓ 已創建 30 筆成本記錄")
        
        print("\n[10/15] 創建LINE群組...")
        full_permissions = [
            "read_all", "write_all", "delete_all",
            "manage_users", "manage_customers", "manage_orders",
            "manage_inventory", "manage_deliveries", "manage_costs",
            "view_reports", "export_data", "import_data",
            "manage_line_groups", "manage_line_messages",
            "manage_schedules", "manage_attendance", "approve_checks",
            "system_admin", "api_access", "webhook_access"
        ]
        
        line_groups = [
            {
                "groupId": "C2a339c3410b0e24c962923544fe9676b",
                "groupName": "TianJy, 匯文, JyBot",
                "groupType": "admin",
                "permissions": full_permissions,
                "memberCount": 2,
                "description": "老闆娘和老闆專用管理群組 - 全權限"
            },
            {
                "groupId": "C986ae8b3208735b53872a6d609a7bbe7",
                "groupName": "張家",
                "groupType": "general",
                "permissions": ["create_order", "check_order", "check_inventory"],
                "memberCount": 3,
                "description": "張家群組"
            },
            {
                "groupId": "C4bfd4b93d29f090fa2b18885d8ad7d12",
                "groupName": "九九/帝皇/高銘瓦斯",
                "groupType": "general",
                "permissions": ["create_order", "check_order", "check_inventory"],
                "memberCount": 5,
                "description": "九九/帝皇/高銘瓦斯群組"
            }
        ]
        
        for group in line_groups:
            cursor.execute('SELECT id FROM "LineGroup" WHERE "groupId" = %s;', (group["groupId"],))
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute('''
                    UPDATE "LineGroup" 
                    SET "groupName" = %s, "groupType" = %s, permissions = %s, "memberCount" = %s, 
                        description = %s, "isActive" = true, "updatedAt" = %s
                    WHERE "groupId" = %s;
                ''', (group["groupName"], group["groupType"], group["permissions"], group["memberCount"], 
                      group["description"], datetime.now(), group["groupId"]))
            else:
                cursor.execute('''
                    INSERT INTO "LineGroup" 
                    (id, "groupId", "groupName", "groupType", permissions, "isActive", "memberCount", description, "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                ''', (
                    str(uuid.uuid4()),
                    group["groupId"],
                    group["groupName"],
                    group["groupType"],
                    group["permissions"],
                    True,
                    group["memberCount"],
                    group["description"],
                    datetime.now(),
                    datetime.now()
                ))
        
        print(f"✓ 已創建 {len(line_groups)} 個LINE群組")
        
        print("\n[11/15] 創建LINE訊息記錄...")
        cursor.execute('SELECT id, "groupId" FROM "LineGroup";')
        line_group_ids = [{"id": row[0], "groupId": row[1]} for row in cursor.fetchall()]
        
        messages = [
            {"userId": "U2f7655580a254b416cdb62ae3fd6bb7a", "messageType": "text", "content": "您好，請問今天有什麼新訂單嗎？"},
            {"userId": "U2f7655580a254b416cdb62ae3fd6bb7a", "messageType": "text", "content": "查詢訂單"},
            {"userId": "U2f7655580a254b416cdb62ae3fd6bb7a", "messageType": "text", "content": "查詢庫存"},
            {"userId": "bot", "messageType": "text", "content": "收到您的訊息: 查詢訂單"},
            {"userId": "bot", "messageType": "text", "content": "收到您的訊息: 查詢庫存"}
        ]
        
        for i, msg in enumerate(messages):
            cursor.execute('''
                INSERT INTO "LineMessage" 
                (id, "lineGroupId", "userId", "messageType", content, "timestamp", intent, response)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            ''', (
                str(uuid.uuid4()),
                line_group_ids[0]["id"] if line_group_ids else None,
                msg["userId"],
                msg["messageType"],
                msg["content"],
                datetime.now() - timedelta(minutes=i*5),
                None if msg["userId"] == "bot" else "chat",
                None
            ))
        
        print(f"✓ 已創建 {len(messages)} 個LINE訊息記錄")
        
        print("\n[12/15] 創建月度報表...")
        cursor.execute('SELECT id FROM "Customer";')
        customer_ids = [row[0] for row in cursor.fetchall()]
        
        for i, customer_id in enumerate(customer_ids[:5]):
            cursor.execute('''
                INSERT INTO "MonthlyStatement" 
                (id, "customerId", month, "periodStart", "periodEnd", "totalOrders", "totalAmount", "paidAmount", balance, status, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            ''', (
                str(uuid.uuid4()),
                customer_id,
                f"2025-{(i % 12) + 1:02d}",
                datetime(2025, (i % 12) + 1, 1),
                datetime(2025, (i % 12) + 2, 1) - timedelta(days=1),
                (i + 1) * 5,
                (i + 1) * 5000,
                (i + 1) * 4000,
                (i + 1) * 1000,
                'completed',
                datetime.now(),
                datetime.now()
            ))
        
        print(f"✓ 已創建月度報表")
        
        print("\n[13/15] 創建審計日誌...")
        audit_actions = [
            {"action": "create_order", "entityType": "GasOrder", "description": "建立新訂單"},
            {"action": "update_customer", "entityType": "Customer", "description": "更新客戶資料"},
            {"action": "setup_permissions", "entityType": "System", "description": "設置系統權限"},
            {"action": "login", "entityType": "User", "description": "用戶登入"},
            {"action": "view_report", "entityType": "Report", "description": "查看報表"}
        ]
        
        for i, audit in enumerate(audit_actions):
            import json
            cursor.execute('''
                INSERT INTO "AuditLog" 
                (id, action, "entityType", "entityId", username, metadata, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s, %s);
            ''', (
                str(uuid.uuid4()),
                audit["action"],
                audit["entityType"],
                str(uuid.uuid4()),
                "system",
                json.dumps({"description": audit["description"], "details": f"操作 {i+1}"}),
                datetime.now() - timedelta(hours=i)
            ))
        
        print(f"✓ 已創建 {len(audit_actions)} 筆審計日誌")
        
        print("\n[14/15] 創建派送記錄...")
        cursor.execute('SELECT id FROM "User" WHERE role = %s;', ('staff',))
        driver_ids = [row[0] for row in cursor.fetchall()]
        
        cursor.execute('SELECT id FROM "GasOrder" WHERE status = %s LIMIT 5;', ('pending',))
        pending_orders = cursor.fetchall()
        
        for i, (order_id,) in enumerate(pending_orders):
            driver_id = driver_ids[i % len(driver_ids)] if driver_ids else str(uuid.uuid4())
            
            cursor.execute('SELECT id FROM dispatch_records WHERE "orderId" = %s AND "driverId" = %s;', (order_id, driver_id))
            existing = cursor.fetchone()
            
            if not existing:
                cursor.execute('''
                    INSERT INTO dispatch_records 
                    (id, "orderId", "driverId", status, "dispatchedAt", "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s);
                ''', (
                    str(uuid.uuid4()),
                    order_id,
                    driver_id,
                    'pending',
                    datetime.now(),
                    datetime.now(),
                    datetime.now()
                ))
        
        print(f"✓ 已創建/更新派送記錄")
        
        print("\n[15/15] 創建系統同步狀態...")
        cursor.execute('''
            INSERT INTO sync_status 
            (id, "lastSyncAt", "syncCount", "pendingCount", "errorCount", status, "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        ''', (
            str(uuid.uuid4()),
            datetime.now(),
            100,
            0,
            0,
            'idle',
            datetime.now(),
            datetime.now()
        ))
        
        print(f"✓ 已創建系統同步狀態")
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print("✓ PostgreSQL數據庫初始化完成！")
        print("=" * 60)
        
        print("\n驗證數據庫記錄數:")
        tables_to_check = [
            ("User", "用戶"),
            ("Customer", "客戶"),
            ("Product", "產品"),
            ("Inventory", "庫存"),
            ("GasOrder", "訂單"),
            ("GasOrderItem", "訂單項目"),
            ("DeliveryRecord", "配送記錄"),
            ("CostRecord", "成本記錄"),
            ("LineGroup", "LINE群組"),
            ("LineMessage", "LINE訊息"),
            ("AuditLog", "審計日誌"),
            ("MonthlyStatement", "月度報表"),
            ("dispatch_records", "派送記錄"),
            ("sync_status", "同步狀態")
        ]
        
        total_records = 0
        for table_name, display_name in tables_to_check:
            cursor.execute(f'SELECT COUNT(*) FROM "{table_name}";')
            count = cursor.fetchone()[0]
            total_records += count
            print(f"  ✓ {display_name}: {count} 筆記錄")
        
        print(f"\n總計: {total_records} 筆記錄已持久化到PostgreSQL")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ 初始化過程中發生錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    success = init_complete_database()
    if success:
        print("\n✓ 數據庫初始化成功，所有資料已持久化到PostgreSQL")
        print("✓ 現在可以進行系統測試")
    else:
        print("\n❌ 數據庫初始化失敗")
