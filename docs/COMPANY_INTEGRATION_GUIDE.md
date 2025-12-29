# 公司系統實時同步集成指南

## 快速開始

### 步驟 1：設置 Webhook URL

```
https://bossai.jytian.it.com/api/sync/company/webhook
```

### 步驟 2：在公司前端系統加入 Webhook 調用

根據你們的技術棧選擇對應的代碼：

---

## JavaScript / Node.js

### 訂單創建時推送

```javascript
async function createOrder(orderData) {
  // 1. 原本的保存邏輯
  const savedOrder = await db.orders.create(orderData);

  // 2. 推送到管理系統
  try {
    await fetch('https://bossai.jytian.it.com/api/sync/company/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': 'jyt-gas-webhook-2024',  // 驗證用
      },
      body: JSON.stringify({
        type: 'order.created',
        order: {
          orderNo: savedOrder.orderNo,
          customerId: savedOrder.customerId,
          customerName: savedOrder.customer.name,
          customerPhone: savedOrder.customer.phone,
          customerAddress: savedOrder.customer.address,
          items: savedOrder.items.map(item => ({
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
          totalAmount: savedOrder.totalAmount,
          deliveryDate: savedOrder.deliveryDate,
          status: savedOrder.status,
          note: savedOrder.note,
        }
      })
    });
    console.log('訂單已同步到管理系統');
  } catch (error) {
    console.error('同步失敗:', error);
    // 不影響原本的訂單創建流程
  }

  return savedOrder;
}
```

### 客戶創建時推送

```javascript
async function createCustomer(customerData) {
  // 1. 原本的保存邏輯
  const savedCustomer = await db.customers.create(customerData);

  // 2. 推送到管理系統
  try {
    await fetch('https://bossai.jytian.it.com/api/sync/company/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': 'jyt-gas-webhook-2024',
      },
      body: JSON.stringify({
        type: 'customer.created',
        customer: {
          id: savedCustomer.id,
          name: savedCustomer.name,
          phone: savedCustomer.phone,
          address: savedCustomer.address,
          paymentType: savedCustomer.paymentType,
          note: savedCustomer.note,
        }
      })
    });
    console.log('客戶已同步到管理系統');
  } catch (error) {
    console.error('同步失敗:', error);
  }

  return savedCustomer;
}
```

### 庫存變動時推送

```javascript
async function updateInventory(productId, quantity) {
  // 1. 原本的更新邏輯
  await db.inventory.update(productId, { quantity });

  // 2. 推送到管理系統
  try {
    await fetch('https://bossai.jytian.it.com/api/sync/company/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': 'jyt-gas-webhook-2024',
      },
      body: JSON.stringify({
        type: 'inventory.updated',
        inventory: {
          productId: productId,
          quantity: quantity,
          minStock: 10,  // 你們的最低庫存
        }
      })
    });
    console.log('庫存已同步到管理系統');
  } catch (error) {
    console.error('同步失敗:', error);
  }
}
```

---

## PHP

```php
<?php
function createOrder($orderData) {
    // 1. 原本的保存邏輯
    $savedOrder = saveToDatabase($orderData);

    // 2. 推送到管理系統
    $webhookUrl = 'https://bossai.jytian.it.com/api/sync/company/webhook';
    $payload = [
        'type' => 'order.created',
        'order' => [
            'orderNo' => $savedOrder['orderNo'],
            'customerId' => $savedOrder['customerId'],
            'customerName' => $savedOrder['customer']['name'],
            'customerPhone' => $savedOrder['customer']['phone'],
            'customerAddress' => $savedOrder['customer']['address'],
            'items' => array_map(function($item) {
                return [
                    'productName' => $item['product']['name'],
                    'quantity' => $item['quantity'],
                    'unitPrice' => $item['price'],
                ];
            }, $savedOrder['items']),
            'totalAmount' => $savedOrder['totalAmount'],
            'deliveryDate' => $savedOrder['deliveryDate'],
            'status' => $savedOrder['status'],
            'note' => $savedOrder['note'],
        ]
    ];

    $ch = curl_init($webhookUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Webhook-Secret: jyt-gas-webhook-2024'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    curl_close($ch);

    return $savedOrder;
}
?>
```

---

## C# / ASP.NET

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class OrderService
{
    private static readonly HttpClient client = new HttpClient();
    private const string WebhookUrl = "https://bossai.jytian.it.com/api/sync/company/webhook";

    public async Task<Order> CreateOrderAsync(OrderData orderData)
    {
        // 1. 原本的保存邏輯
        var savedOrder = await _db.Orders.AddAsync(orderData);
        await _db.SaveChangesAsync();

        // 2. 推送到管理系統
        try
        {
            var payload = new
            {
                type = "order.created",
                order = new
                {
                    orderNo = savedOrder.OrderNo,
                    customerId = savedOrder.CustomerId,
                    customerName = savedOrder.Customer.Name,
                    customerPhone = savedOrder.Customer.Phone,
                    customerAddress = savedOrder.Customer.Address,
                    items = savedOrder.Items.Select(item => new
                    {
                        productName = item.Product.Name,
                        quantity = item.Quantity,
                        unitPrice = item.Price
                    }).ToArray(),
                    totalAmount = savedOrder.TotalAmount,
                    deliveryDate = savedOrder.DeliveryDate,
                    status = savedOrder.Status,
                    note = savedOrder.Note
                }
            };

            var json = JsonConvert.SerializeObject(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, WebhookUrl);
            request.Content = content;
            request.Headers.Add("X-Webhook-Secret", "jyt-gas-webhook-2024");

            var response = await client.SendAsync(request);
            Console.WriteLine("訂單已同步到管理系統");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"同步失敗: {ex.Message}");
        }

        return savedOrder;
    }
}
```

---

## Python / Flask

```python
import requests
import json

WEBHOOK_URL = "https://bossai.jytian.it.com/api/sync/company/webhook"
WEBHOOK_SECRET = "jyt-gas-webhook-2024"

def create_order(order_data):
    # 1. 原本的保存邏輯
    saved_order = db.orders.create(order_data)

    # 2. 推送到管理系統
    try:
        payload = {
            "type": "order.created",
            "order": {
                "orderNo": saved_order.order_no,
                "customerId": saved_order.customer_id,
                "customerName": saved_order.customer.name,
                "customerPhone": saved_order.customer.phone,
                "customerAddress": saved_order.customer.address,
                "items": [
                    {
                        "productName": item.product.name,
                        "quantity": item.quantity,
                        "unitPrice": item.price
                    }
                    for item in saved_order.items
                ],
                "totalAmount": float(saved_order.total_amount),
                "deliveryDate": saved_order.delivery_date.isoformat() if saved_order.delivery_date else None,
                "status": saved_order.status,
                "note": saved_order.note
            }
        }

        response = requests.post(
            WEBHOOK_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Webhook-Secret": WEBHOOK_SECRET
            }
        )
        print("訂單已同步到管理系統")
    except Exception as e:
        print(f"同步失敗: {e}")

    return saved_order
```

---

## 支援的事件類型

| 事件類型 | 觸發時機 |
|---------|---------|
| `order.created` | 新訂單建立 |
| `order.updated` | 訂單更新 |
| `customer.created` | 新客戶建立 |
| `customer.updated` | 客戶資料更新 |
| `inventory.updated` | 庫存變動 |
| `phone_order.received` | 電話訂單（即時） |

---

## 測試 Webhook

### 使用 curl 測試

```bash
curl -X POST https://bossai.jytian.it.com/api/sync/company/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: jyt-gas-webhook-2024" \
  -d '{
    "type": "order.created",
    "order": {
      "orderNo": "TEST-001",
      "customerId": "test-customer-001",
      "customerName": "測試客戶",
      "customerPhone": "0912345678",
      "customerAddress": "測試地址",
      "items": [
        {
          "productName": "瓦斯桶20公斤",
          "quantity": 1,
          "unitPrice": 800
        }
      ],
      "totalAmount": 800,
      "status": "pending",
      "note": "測試訂單"
    }
  }'
```

### 查看同步日誌

在管理系統可以查看所有同步記錄：
- 路徑：設定 → 審計日誌 → 篩選 action=WEBHOOK_RECEIVED

---

## 錯誤處理

### Webhook 失敗不影響原本流程

```javascript
try {
  await fetch(WEBHOOK_URL, { ... });
} catch (error) {
  // 只記錄錯誤，不影響原本的業務流程
  console.error('同步失敗:', error);
}
```

### 重試機制

如果同步失敗，可以稍後重試：
- 最多重試 3 次
- 每次間隔 5 秒
- 或使用隊列系統（如 Bull、Redis）

---

## 常見問題

### Q: Webhook 失敗會影響原本的訂單嗎？
A: 不會。Webhook 失敗只會記錄錯誤，不影響原本的業務流程。

### Q: 如何確認同步成功？
A: 檢查 HTTP 回應狀態碼 200，或在管理系統查看數據是否出現。

### Q: 可以同步過去的數據嗎？
A: 可以。需要寫腳本遍歷歷史數據並逐一推送，或使用我們的 Excel 導入功能。

### Q: 安全性如何？
A: 使用 Webhook Secret 驗證請求，確保只有授權的來源可以推送數據。

---

## 需要協助？

如果有任何問題，請聯繫：
- Email: support@jyt-gas.com
- 電話: 0800-xxx-xxx
