# 會計系統數據同步整合指南

本指南說明如何將前台會計系統的數據同步到九九瓦斯行系統。

## 📋 整合方式概覽

有兩種主要方式實現數據同步：

### 方式一：會計系統主動推送（推薦）
會計系統在數據變更時主動呼叫我們的 API。

### 方式二：定期輪詢同步
我們的系統定期向會計系統的 API 拉取數據。

---

## 🚀 方式一：會計系統主動推送（推薦）

### Step 1: 獲取 API 金鑰

聯繫管理員設置同步金鑰，或直接在 `.env` 中設定：

```bash
ACCOUNTING_SYNC_API_KEY=jy99_secret_key_2025
```

### Step 2: 在會計系統中實現同步

#### 範例 1: 使用 JavaScript/Node.js

```javascript
// 在會計系統的後端代碼中
const API_ENDPOINT = 'https://your-domain.com/api/sync/accounting-data'
const API_KEY = 'jy99_secret_key_2025'

// 同步客戶數據
async function syncCustomers() {
  // 從會計系統資料庫獲取客戶
  const customers = await db.customers.findAll({
    where: { updatedAt: { gte: lastSyncTime } }
  })

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: API_KEY,
      type: 'customers',
      data: customers.map(c => ({
        name: c.name,
        phone: c.phone,
        address: c.address,
        paymentType: c.paymentType || 'cash',
        balance: c.balance || 0,
      }))
    })
  })

  const result = await response.json()
  console.log('同步結果:', result)
}

// 當客戶資料變更時自動調用
customerHook.afterCreate((customer) => {
  syncCustomer(customer)
})
```

#### 範例 2: 使用 PHP

```php
<?php
// 在會計系統的 PHP 代碼中

function syncToGasSystem($data, $type) {
    $apiEndpoint = 'https://your-domain.com/api/sync/accounting-data';
    $apiKey = 'jy99_secret_key_2025';

    $payload = json_encode([
        'apiKey' => $apiKey,
        'type' => $type,
        'data' => $data
    ]);

    $ch = curl_init($apiEndpoint);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($payload)
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $httpCode === 200;
}

// 使用範例
$customers = [
    [
        'name' => '王先生',
        'phone' => '0912345678',
        'address' => '台北市中山路123號',
        'paymentType' => 'cash',
        'balance' => 0
    ]
];

syncToGasSystem($customers, 'customers');
?>
```

#### 範例 3: 使用 C# (.NET)

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class GasSystemSync
{
    private const string ApiEndpoint = "https://your-domain.com/api/sync/accounting-data";
    private const string ApiKey = "jy99_secret_key_2025";

    public static async Task<bool> SyncCustomers(dynamic[] customers)
    {
        using (var client = new HttpClient())
        {
            var payload = new
            {
                apiKey = ApiKey,
                type = "customers",
                data = customers
            };

            var json = JsonConvert.SerializeObject(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync(ApiEndpoint, content);
            return response.IsSuccessStatusCode;
        }
    }
}
```

### Step 3: 設定觸發時機

在會計系統中設定以下時機觸發同步：

| 事件 | 觸發同步 |
|------|----------|
| 新增客戶 | 立即同步該客戶 |
| 修改客戶 | 立即同步更新 |
| 新增訂單 | 立即同步訂單 |
| 訂單狀態變更 | 同步狀態 |
| 收到付款 | 同步付款記錄 |
| 庫存變動 | 同步庫存數量 |

---

## 🔁 方式二：定期輪詢同步

如果會計系統無法主動推送，可以設定定期同步。

### Step 1: 在會計系統建立 API 接口

在會計系統建立一個 API 供我們拉取數據：

```javascript
// 會計系統端點範例
// GET https://accounting-system.com/api/export/customers?since=2025-01-01

app.get('/api/export/customers', async (req, res) => {
    const since = req.query.since || '1970-01-01'

    // 從資料庫獲取指定日期後更新的客戶
    const customers = await db.customers.findAll({
        where: {
            updatedAt: { gte: new Date(since) }
        }
    })

    res.json({
        success: true,
        data: customers,
        count: customers.length
    })
})
```

### Step 2: 在我們系統建立定期同步任務

```typescript
// src/lib/accounting-sync-scheduler.ts
import { db } from './db'

export class AccountingSyncScheduler {
    private accountingApiUrl = process.env.ACCOUNTING_SYSTEM_API_URL
    private apiKey = process.env.ACCOUNTING_SYNC_API_KEY

    async pullAndSync() {
        // 從會計系統拉取客戶
        const customers = await this.pullCustomers()
        if (customers) {
            await this.syncCustomers(customers)
        }

        // 拉取訂單
        const orders = await this.pullOrders()
        if (orders) {
            await this.syncOrders(orders)
        }
    }

    private async pullCustomers() {
        const response = await fetch(`${this.accountingApiUrl}/api/export/customers`)
        const data = await response.json()
        return data.data
    }

    private async syncCustomers(customers: any[]) {
        // 使用現有的同步邏輯
        for (const customer of customers) {
            await db.customer.upsert({
                where: { phone: customer.phone },
                create: { /* ... */ },
                update: { /* ... */ }
            })
        }
    }
}

// 使用 cron 或 node-schedule 定期執行
import cron from 'node-cron'

const scheduler = new AccountingSyncScheduler()

// 每小時執行一次
cron.schedule('0 * * * *', () => {
    console.log('[Sync] 開始定期同步...')
    scheduler.pullAndSync()
})
```

---

## 🧪 測試同步功能

### 使用 Postman 或 curl 測試

```bash
# 測試客戶同步
curl -X POST https://your-domain.com/api/sync/accounting-data \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "jy99_secret_key_2025",
    "type": "customers",
    "data": [
      {
        "name": "測試客戶",
        "phone": "0912345678",
        "address": "測試地址",
        "paymentType": "cash"
      }
    ]
  }'
```

### 查看同步結果

```bash
# 查看同步日誌
curl https://your-domain.com/api/sync/accounting-data
```

---

## 📊 支援的數據格式

### 客戶數據 (customers)
```json
{
  "name": "王先生",
  "phone": "0912345678",
  "address": "台北市中山路123號",
  "paymentType": "cash",
  "balance": 0
}
```

### 訂單數據 (orders)
```json
{
  "orderNo": "SO12345678",
  "customerName": "王先生",
  "customerPhone": "0912345678",
  "customerAddress": "台北市中山路123號",
  "orderDate": "2025-01-15T10:00:00Z",
  "deliveryDate": "2025-01-15T14:00:00Z",
  "status": "pending",
  "subtotal": 1440,
  "discount": 0,
  "deliveryFee": 0,
  "total": 1440,
  "note": "來自會計系統"
}
```

### 產品數據 (products)
```json
{
  "code": "GAS20",
  "name": "20kg 瓦斯",
  "category": "瓦斯",
  "price": 720,
  "cost": 650,
  "capacity": "20kg",
  "unit": "桶",
  "stock": 50,
  "minStock": 10
}
```

### 庫存數據 (inventory)
```json
{
  "productCode": "GAS20",
  "productName": "20kg 瓦斯",
  "capacity": "20kg",
  "quantity": 50,
  "minStock": 10
}
```

### 付款數據 (payments)
```json
{
  "orderNo": "SO12345678",
  "amount": 1440,
  "paidInFull": true,
  "paymentDate": "2025-01-15T10:00:00Z"
}
```

---

## 🔧 常見會計系統整合

### 1. 鼎新會計系統
```javascript
// 鼎新提供 Webhook 功能
// 在鼎新後台設定 Webhook URL
// Webhook URL: https://your-domain.com/api/sync/accounting-data
```

### 2. ERP 系統 (SAP, Oracle, Microsoft Dynamics)
```csharp
// 大多數 ERP 支援輸出到 REST API
// 設定定時任務將數據 POST 到我們的端點
```

### 3. 自研會計系統
```javascript
// 在資料庫變更後立即調用我們的 API
// 或設定定時任務批量同步
```

---

## ⚠️ 注意事項

1. **API 金鑰安全**：請勿將金鑰暴露在前端代碼中
2. **錯誤處理**：請實作重試機制以處理網路錯誤
3. **數據驗證**：發送前請驗證必填欄位
4. **增量同步**：建議只同步有變更的數據
5. **時區處理**：所有日期時間使用 ISO 8601 格式

---

## 📞 技術支援

如有問題請聯繫：
- API 文檔：https://your-domain.com/api/docs
- 技術支援：support@jy99gas.com
