# C# 單機版軟件集成指南

## 步驟 1：加入同步服務類

### 1.1 將 `JytGasSyncService.cs` 加入專案

```
你的專案/
├── Form1.cs
├── Form1.Designer.cs
├── JytGasSyncService.cs  ← 新增這個檔案
└── ...
```

### 1.2 安裝 Newtonsoft.Json（如果還沒有）

在 Visual Studio 中：
1. 右鍵點擊專案 → 管理 NuGet 套件
2. 搜尋 `Newtonsoft.Json`
3. 點擊安裝

或用套件管理器主控台：
```powershell
Install-Package Newtonsoft.Json
```

---

## 步驟 2：修改你的訂單保存代碼

### 2.1 找到你原本的訂單保存代碼

```csharp
// 你原本的代碼可能是這樣
private void btnSaveOrder_Click(object sender, EventArgs e)
{
    // 建立訂單物件
    var order = new Order
    {
        OrderNo = txtOrderNo.Text,
        CustomerName = txtCustomerName.Text,
        CustomerPhone = txtCustomerPhone.Text,
        CustomerAddress = txtCustomerAddress.Text,
        TotalAmount = decimal.Parse(txtTotal.Text),
        Status = "pending",
        // ... 其他欄位
    };

    // 保存到資料庫
    SaveOrderToDatabase(order);

    MessageBox.Show("訂單保存成功！");
}
```

### 2.2 加入同步調用

```csharp
private async void btnSaveOrder_Click(object sender, EventArgs e)
{
    // 建立訂單物件
    var order = new Order
    {
        OrderNo = txtOrderNo.Text,
        CustomerName = txtCustomerName.Text,
        CustomerPhone = txtCustomerPhone.Text,
        CustomerAddress = txtCustomerAddress.Text,
        TotalAmount = decimal.Parse(txtTotal.Text),
        Status = "pending",
        Items = GetOrderItems() // 你們獲取訂單項目的方法
    };

    // 1. 保存到資料庫（原本的邏輯）
    SaveOrderToDatabase(order);

    // 2. 同步到管理系統（新增這段）
    bool syncSuccess = await SyncService.SyncOrderCreated(order);
    if (syncSuccess)
    {
        // 可選：顯示同步成功提示
        lblSyncStatus.Text = "✓ 已同步";
        lblSyncStatus.ForeColor = Color.Green;
    }
    else
    {
        lblSyncStatus.Text = "✗ 同步失敗";
        lblSyncStatus.ForeColor = Color.Red;
    }

    MessageBox.Show("訂單保存成功！");
}
```

---

## 步驟 3：客戶資料同步

### 3.1 找到客戶保存代碼

```csharp
private void btnSaveCustomer_Click(object sender, EventArgs e)
{
    var customer = new Customer
    {
        Name = txtName.Text,
        Phone = txtPhone.Text,
        Address = txtAddress.Text,
        PaymentType = cmbPaymentType.SelectedValue.ToString()
    };

    // 保存到資料庫
    SaveCustomerToDatabase(customer);

    // 同步到管理系統（新增）
    await SyncService.SyncCustomerCreated(customer);

    MessageBox.Show("客戶保存成功！");
}
```

---

## 步驟 4：庫存變動同步

```csharp
private void UpdateInventory(string productId, int newQuantity)
{
    // 更新資料庫
    ExecuteSQL("UPDATE Inventory SET Quantity = " + newQuantity + " WHERE ProductId = '" + productId + "'");

    // 同步到管理系統（新增）
    await SyncService.SyncInventoryUpdated(new InventoryItem
    {
        ProductId = productId,
        ProductName = GetProductName(productId),
        Quantity = newQuantity,
        MinStock = 10
    });
}
```

---

## 步驟 5：電話訂單即時同步

當有電話訂單進來時：

```csharp
private async void btnPhoneOrder_Click(object sender, EventArgs e)
{
    var phoneOrder = new PhoneOrder
    {
        CustomerName = txtName.Text,
        CustomerPhone = txtPhone.Text,
        CustomerAddress = txtAddress.Text,
        Items = GetOrderItems(),
        TotalAmount = decimal.Parse(txtTotal.Text),
        Note = "電話訂單"
    };

    // 1. 保存到資料庫
    SaveOrderToDatabase(phoneOrder);

    // 2. 立即同步到管理系統
    bool synced = await SyncService.SyncPhoneOrder(phoneOrder);

    if (synced)
    {
        MessageBox.Show("電話訂單已同步！司機可以收到通知。");
    }
}
```

---

## 步驟 6：測試同步功能

### 6.1 測試訂單同步

1. 在軟件中建立一個測試訂單
2. 點擊保存
3. 檢查 `https://bossai.jytian.it.com` 是否有這個訂單

### 6.2 檢查同步狀態

在軟件中加入狀態顯示：

```csharp
// 在表單上放一個 Label
private Label lblSyncStatus;

// 在同步後更新狀態
bool success = await SyncService.SyncOrderCreated(order);
if (success)
{
    lblSyncStatus.Text = $"✓ {DateTime.Now:HH:mm:ss} 已同步";
}
else
{
    lblSyncStatus.Text = $"✗ {DateTime.Now:HH:mm:ss} 同步失敗";
}
```

---

## 常見問題

### Q1：同步失敗會影響原本的保存嗎？
A：不會。同步是在保存成功後才執行的，失敗不影響原本的業務流程。

### Q2：如果網路斷了怎麼辦？
A：同步會失敗但不影響軟件使用。網路恢復後，新數據會正常同步。過去的數據需要手動導入。

### Q3：如何批量同步歷史數據？
A：可以寫一個循環遍歷歷史數據並逐一調用同步方法：

```csharp
private async void btnSyncHistory_Click(object sender, EventArgs e)
{
    var orders = GetAllOrders(); // 獲取所有歷史訂單

    int successCount = 0;
    int failCount = 0;

    foreach (var order in orders)
    {
        bool result = await SyncService.SyncOrderCreated(order);
        if (result) successCount++; else failCount++;
    }

    MessageBox.Show($"同步完成！成功: {successCount}, 失敗: {failCount}");
}
```

### Q4：需要一直連網嗎？
A：建議是。如果軟件需要在離線環境使用，可以加入「離線模式」功能，只在有網路時同步。

### Q5：同步速度慢嗎？
A：一次同步通常在 0.5-2 秒內完成。如果覺得慢，可以用非同步方式在背景執行，不影響用戶操作。

---

## 進階：離線隊列同步

如果網路不穩定，可以實現離線隊列：

```csharp
public class OfflineSyncQueue
{
    private static Queue<object> syncQueue = new Queue<object>();

    // 加入隊列
    public static void EnqueueForSync(object data)
    {
        syncQueue.Enqueue(data);
    }

    // 定時嘗試同步（每分鐘）
    public static async void StartBackgroundSync()
    {
        while (true)
        {
            if (syncQueue.Count > 0 && IsNetworkAvailable())
            {
                var data = syncQueue.Dequeue();
                await SyncService.SendWebhook(data);
            }
            await Task.Delay(60000); // 等待1分鐘
        }
    }

    private static bool IsNetworkAvailable()
    {
        return System.Net.NetworkInformation.NetworkInterface.GetIsNetworkAvailable();
    }
}
```

---

## 需要協助？

如果在整合過程中遇到問題：
1. 檢查網路連線
2. 檢查防火牆設定
3. 確認 Webhook URL 正確
4. 查看 Debug 輸出的錯誤訊息

或聯繫技術支援。
