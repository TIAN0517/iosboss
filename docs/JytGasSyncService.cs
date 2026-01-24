// ========================================
// 九九瓦斯行 - 數據同步服務
// 加入到你的 C# WinForms 專案中
// ========================================

using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace JytGasSync
{
    /// <summary>
    /// 同步到管理系統的服務類
    /// </summary>
    public class SyncService
    {
        private static readonly HttpClient client = new HttpClient();
        private const string WebhookUrl = "https://bossai.jytian.it.com/api/sync/company/webhook";
        private const string WebhookSecret = "jyt-gas-webhook-2024";

        // ========================================
        // 1. 訂單同步
        // ========================================

        /// <summary>
        /// 訂單創建時調用 - 在你的保存訂單代碼後加入
        /// </summary>
        public static async Task<bool> SyncOrderCreated(Order orderData)
        {
            try
            {
                var payload = new
                {
                    type = "order.created",
                    order = new
                    {
                        orderNo = orderData.OrderNo,
                        customerId = orderData.CustomerId,
                        customerName = orderData.CustomerName,
                        customerPhone = orderData.CustomerPhone,
                        customerAddress = orderData.CustomerAddress,
                        items = orderData.Items.ConvertAll(item => new
                        {
                            productName = item.ProductName,
                            quantity = item.Quantity,
                            unitPrice = item.UnitPrice
                        }),
                        totalAmount = orderData.TotalAmount,
                        deliveryDate = orderData.DeliveryDate?.ToString("yyyy-MM-dd"),
                        status = orderData.Status,
                        note = orderData.Note
                    }
                };

                return await SendWebhook(payload);
            }
            catch (Exception ex)
            {
                // 記錄錯誤但不影響原本流程
                System.Diagnostics.Debug.WriteLine($"同步失敗: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// 訂單更新時調用
        /// </summary>
        public static async Task<bool> SyncOrderUpdated(Order orderData)
        {
            try
            {
                var payload = new
                {
                    type = "order.updated",
                    order = new
                    {
                        orderNo = orderData.OrderNo,
                        totalAmount = orderData.TotalAmount,
                        status = orderData.Status,
                        note = orderData.Note
                    }
                };

                return await SendWebhook(payload);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"同步失敗: {ex.Message}");
                return false;
            }
        }

        // ========================================
        // 2. 客戶同步
        // ========================================

        /// <summary>
        /// 客戶創建時調用
        /// </summary>
        public static async Task<bool> SyncCustomerCreated(Customer customerData)
        {
            try
            {
                var payload = new
                {
                    type = "customer.created",
                    customer = new
                    {
                        id = customerData.Id,
                        name = customerData.Name,
                        phone = customerData.Phone,
                        address = customerData.Address,
                        paymentType = customerData.PaymentType,
                        note = customerData.Note
                    }
                };

                return await SendWebhook(payload);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"同步失敗: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// 客戶更新時調用
        /// </summary>
        public static async Task<bool> SyncCustomerUpdated(Customer customerData)
        {
            try
            {
                var payload = new
                {
                    type = "customer.updated",
                    customer = new
                    {
                        id = customerData.Id,
                        name = customerData.Name,
                        phone = customerData.Phone,
                        address = customerData.Address,
                        paymentType = customerData.PaymentType,
                        note = customerData.Note
                    }
                };

                return await SendWebhook(payload);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"同步失敗: {ex.Message}");
                return false;
            }
        }

        // ========================================
        // 3. 庫存同步
        // ========================================

        /// <summary>
        /// 庫存變動時調用
        /// </summary>
        public static async Task<bool> SyncInventoryUpdated(InventoryItem inventory)
        {
            try
            {
                var payload = new
                {
                    type = "inventory.updated",
                    inventory = new
                    {
                        productId = inventory.ProductId,
                        productName = inventory.ProductName,
                        quantity = inventory.Quantity,
                        minStock = inventory.MinStock
                    }
                };

                return await SendWebhook(payload);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"同步失敗: {ex.Message}");
                return false;
            }
        }

        // ========================================
        // 4. 電話訂單（即時同步）
        // ========================================

        /// <summary>
        /// 電話訂單進來時立即同步
        /// </summary>
        public static async Task<bool> SyncPhoneOrder(PhoneOrder phoneOrder)
        {
            try
            {
                var payload = new
                {
                    type = "phone_order.received",
                    phoneOrder = new
                    {
                        orderNo = phoneOrder.OrderNo ?? $"PHONE-{DateTime.Now:yyyyMMddHHmmss}",
                        customerName = phoneOrder.CustomerName,
                        customerPhone = phoneOrder.CustomerPhone,
                        customerAddress = phoneOrder.CustomerAddress,
                        items = phoneOrder.Items.ConvertAll(item => new
                        {
                            productName = item.ProductName,
                            quantity = item.Quantity,
                            unitPrice = item.UnitPrice
                        }),
                        totalAmount = phoneOrder.TotalAmount,
                        note = phoneOrder.Note ?? "電話訂單"
                    }
                };

                return await SendWebhook(payload);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"同步失敗: {ex.Message}");
                return false;
            }
        }

        // ========================================
        // 核心發送方法
        // ========================================

        private static async Task<bool> SendWebhook(object payload)
        {
            try
            {
                var json = JsonConvert.SerializeObject(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var request = new HttpRequestMessage(HttpMethod.Post, WebhookUrl);
                request.Content = content;
                request.Headers.Add("X-Webhook-Secret", WebhookSecret);

                var response = await client.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    System.Diagnostics.Debug.WriteLine($"✓ 同步成功: {payload.GetType().GetProperty("type")?.GetValue(payload)}");
                    return true;
                }
                else
                {
                    var error = await response.Content.ReadAsStringAsync();
                    System.Diagnostics.Debug.WriteLine($"✗ 同步失敗: {response.StatusCode} - {error}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"✗ 同步異常: {ex.Message}");
                return false;
            }
        }
    }

    // ========================================
    // 數據模型（根據你們的實際結構調整）
    // ========================================

    public class Order
    {
        public string OrderNo { get; set; }
        public string CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string CustomerPhone { get; set; }
        public string CustomerAddress { get; set; }
        public System.Collections.Generic.List<OrderItem> Items { get; set; } = new System.Collections.Generic.List<OrderItem>();
        public decimal TotalAmount { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string Status { get; set; }
        public string Note { get; set; }
    }

    public class OrderItem
    {
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }

    public class Customer
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string PaymentType { get; set; } = "cash";
        public string Note { get; set; }
    }

    public class InventoryItem
    {
        public string ProductId { get; set; }
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public int MinStock { get; set; }
    }

    public class PhoneOrder
    {
        public string OrderNo { get; set; }
        public string CustomerName { get; set; }
        public string CustomerPhone { get; set; }
        public string CustomerAddress { get; set; }
        public System.Collections.Generic.List<OrderItem> Items { get; set; } = new System.Collections.Generic.List<OrderItem>();
        public decimal TotalAmount { get; set; }
        public string Note { get; set; }
    }
}
