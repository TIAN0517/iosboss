// ========================================
// 九九瓦斯行 - 公司 MSSQL 同步工具 (開機自動同步版)
// 適合會計下班關機的情況
// ========================================

const fs = require('fs');
const path = require('path');

// 讀取配置
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// 同步狀態文件
const STATE_FILE = path.join(__dirname, 'last-sync.json');

// 讀取上次同步時間
function getLastSyncTime() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      return new Date(state.lastSyncTime);
    }
  } catch (e) {
    // 如果讀取失敗，返回7天前
  }
  // 首次運行，同步最近7天的數據
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return sevenDaysAgo;
}

// 保存同步時間
function saveSyncTime() {
  const state = {
    lastSyncTime: new Date().toISOString(),
    syncCount: (JSON.parse(fs.readFileSync(STATE_FILE, 'utf8') || '{"syncCount":0}').syncCount || 0) + 1
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ========================================
// MSSQL 連接
// ========================================

let mssql;
try {
  mssql = require('mssql');
} catch (e) {
  console.error('❌ 缺少 mssql 模組，請先安裝：');
  console.error('   npm install mssql');
  process.exit(1);
}

let pool;

async function connectToMSSQL() {
  try {
    const sqlConfig = {
      server: config.mssql.server,
      port: config.mssql.port,
      database: config.mssql.database,
      options: config.mssql.authentication.options,
      authentication: {
        type: 'ntlm' // Windows 驗證
      }
    };

    pool = await mssql.connect(sqlConfig);
    console.log('✓ 已連接到 MSSQL 資料庫 (Windows 驗證)');
    return pool;
  } catch (error) {
    console.error('❌ MSSQL 連接失敗:', error.message);
    throw error;
  }
}

// ========================================
// Webhook 發送
// ========================================

async function sendWebhook(type, data) {
  try {
    const fetch = require('node-fetch');

    const payload = {
      type: type,
      ...data
    };

    const response = await fetch(config.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': config.webhook.secret
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`  ✓ ${type}`);
      return true;
    } else {
      const error = await response.text();
      console.error(`  ✗ ${type} - ${error}`);
      return false;
    }
  } catch (error) {
    console.error(`  ✗ Webhook 錯誤: ${error.message}`);
    return false;
  }
}

// ========================================
// 數據查詢和同步
// ========================================

// 查詢上次同步後的新增/更新訂單
async function getOrdersSince(lastSyncTime) {
  try {
    const query = `
      SELECT TOP ${config.sync.batchSize}
        o.*,
        c.CustomerName,
        c.CustomerPhone,
        c.CustomerAddress
      FROM ${config.tables.orders} o
      LEFT JOIN ${config.tables.customers} c ON o.CustomerId = c.Id
      WHERE o.CreatedAt >= @LastSyncTime
         OR o.UpdatedAt >= @LastSyncTime
      ORDER BY o.CreatedAt DESC
    `;

    const request = pool.request();
    request.input('LastSyncTime', mssql.DateTime, lastSyncTime);
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('  查詢訂單失敗:', error.message);
    return [];
  }
}

// 查詢上次同步後的新增/更新客戶
async function getCustomersSince(lastSyncTime) {
  try {
    const query = `
      SELECT TOP ${config.sync.batchSize}
        *
      FROM ${config.tables.customers}
      WHERE CreatedAt >= @LastSyncTime
         OR UpdatedAt >= @LastSyncTime
      ORDER BY CreatedAt DESC
    `;

    const request = pool.request();
    request.input('LastSyncTime', mssql.DateTime, lastSyncTime);
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('  查詢客戶失敗:', error.message);
    return [];
  }
}

// 查詢上次同步後的庫存變動
async function getInventorySince(lastSyncTime) {
  try {
    const query = `
      SELECT TOP ${config.sync.batchSize}
        *
      FROM ${config.tables.inventory}
      WHERE UpdatedAt >= @LastSyncTime
      ORDER BY UpdatedAt DESC
    `;

    const request = pool.request();
    request.input('LastSyncTime', mssql.DateTime, lastSyncTime);
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('  查詢庫存失敗:', error.message);
    return [];
  }
}

// 同步訂單
async function syncOrders(lastSyncTime) {
  if (!config.sync.syncOrders) return 0;

  console.log('\n📋 同步訂單...');
  const orders = await getOrdersSince(lastSyncTime);

  if (orders.length === 0) {
    console.log('  沒有新訂單');
    return 0;
  }

  console.log(`  找到 ${orders.length} 筆訂單需要同步`);

  let successCount = 0;
  for (const order of orders) {
    const orderData = {
      orderNo: order.OrderNo || order.Id,
      customerId: order.CustomerId,
      customerName: order.CustomerName,
      customerPhone: order.CustomerPhone,
      customerAddress: order.CustomerAddress,
      items: order.Items ? JSON.parse(order.Items) : [],
      totalAmount: order.TotalAmount || order.Total,
      deliveryDate: order.DeliveryDate,
      status: order.Status || 'pending',
      note: order.Note
    };

    const success = await sendWebhook('order.created', { order: orderData });
    if (success) successCount++;
  }

  console.log(`  ✓ 訂單同步完成: ${successCount}/${orders.length} 成功`);
  return orders.length;
}

// 同步客戶
async function syncCustomers(lastSyncTime) {
  if (!config.sync.syncCustomers) return 0;

  console.log('\n👥 同步客戶...');
  const customers = await getCustomersSince(lastSyncTime);

  if (customers.length === 0) {
    console.log('  沒有新客戶');
    return 0;
  }

  console.log(`  找到 ${customers.length} 筆客戶需要同步`);

  let successCount = 0;
  for (const customer of customers) {
    const customerData = {
      id: customer.Id,
      name: customer.Name || customer.CustomerName,
      phone: customer.Phone || customer.CustomerPhone,
      address: customer.Address || customer.CustomerAddress,
      paymentType: customer.PaymentType || 'cash',
      note: customer.Note
    };

    const success = await sendWebhook('customer.created', { customer: customerData });
    if (success) successCount++;
  }

  console.log(`  ✓ 客戶同步完成: ${successCount}/${customers.length} 成功`);
  return customers.length;
}

// 同步庫存
async function syncInventory(lastSyncTime) {
  if (!config.sync.syncInventory) return 0;

  console.log('\n📦 同步庫存...');
  const inventory = await getInventorySince(lastSyncTime);

  if (inventory.length === 0) {
    console.log('  沒有庫存變動');
    return 0;
  }

  console.log(`  找到 ${inventory.length} 筆庫存記錄需要同步`);

  let successCount = 0;
  for (const item of inventory) {
    const inventoryData = {
      productId: item.ProductId,
      productName: item.ProductName,
      quantity: item.Quantity,
      minStock: item.MinStock || 10
    };

    const success = await sendWebhook('inventory.updated', { inventory: inventoryData });
    if (success) successCount++;
  }

  console.log(`  ✓ 庫存同步完成: ${successCount}/${inventory.length} 成功`);
  return inventory.length;
}

// ========================================
// 主同步循環
// ========================================

let isRunning = false;
let syncInterval = null;

async function runSync() {
  if (isRunning) {
    console.log('⏳ 上一次同步還在執行中...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    // 獲取上次同步時間
    const lastSyncTime = getLastSyncTime();
    const lastSyncStr = lastSyncTime.toLocaleString('zh-TW');

    console.log(`\n${'='.repeat(50)}`);
    console.log(`${new Date().toLocaleString('zh-TW')} - 開始同步`);
    console.log(`上次同步: ${lastSyncStr}`);
    console.log(`${'='.repeat(50)}`);

    // 確保連接
    if (!pool || pool.connected === false) {
      await connectToMSSQL();
    }

    // 計算同步了多少數據
    const results = {
      orders: await syncOrders(lastSyncTime),
      customers: await syncCustomers(lastSyncTime),
      inventory: await syncInventory(lastSyncTime)
    };

    const totalSynced = results.orders + results.customers + results.inventory;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // 保存本次同步時間
    saveSyncTime();

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✓ 同步完成！`);
    console.log(`  訂單: ${results.orders} 筆`);
    console.log(`  客戶: ${results.customers} 筆`);
    console.log(`  庫存: ${results.inventory} 筆`);
    console.log(`  總計: ${totalSynced} 筆`);
    console.log(`  耗時: ${duration} 秒`);
    console.log(`${'='.repeat(50)}\n`);

    // 如果開機首次同步有很多數據，同步完成後可以繼續定期同步
    return totalSynced;

  } catch (error) {
    console.error('\n❌ 同步錯誤:', error.message);
    console.error(error.stack);
    return 0;
  } finally {
    isRunning = false;
  }
}

// ========================================
// 啟動服務
// ========================================

async function start() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   九九瓦斯行 - MSSQL 開機自動同步工具   ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n配置資訊：`);
  console.log(`  資料庫: ${config.mssql.server}/${config.mssql.database}`);
  console.log(`  同步間隔: ${config.sync.intervalSeconds} 秒`);
  console.log(`  Webhook: ${config.webhook.url}`);
  console.log(`\n說明：`);
  console.log(`  • 開機後自動同步上次關機期間的所有數據`);
  console.log(`  • 然後每 ${config.sync.intervalSeconds} 秒定期同步`);
  console.log(`  • 下次開機會繼續同步新數據`);
  console.log(`  • 會計下班可以放心關機\n`);

  // 首次連接測試
  try {
    await connectToMSSQL();
    console.log('\n✓ 連線成功！\n');
  } catch (error) {
    console.error('\n❌ 無法連接資料庫，請檢查配置！');
    console.error('錯誤：', error.message);
    console.log('\n按任意鍵退出...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => process.exit(1));
    return;
  }

  // 立即執行首次同步（同步關機期間的數據）
  console.log('🚀 開機首次同步（同步關機期間的數據）...\n');
  await runSync();

  // 啟動定時同步（在開機期間繼續同步）
  console.log(`\n⏰ 啟動定時同步（每 ${config.sync.intervalSeconds} 秒）...\n`);
  syncInterval = setInterval(runSync, config.sync.intervalSeconds * 1000);

  // 優雅退出
  process.on('SIGINT', async () => {
    console.log('\n\n正在關閉服務...');
    if (syncInterval) {
      clearInterval(syncInterval);
    }
    if (pool) {
      await pool.close();
    }
    console.log('✓ 已停止，可以安全關機');
    process.exit(0);
  });

  // Windows 關機事件
  if (process.platform === 'win32') {
    const { exec } = require('child_process');
    exec('shutdown /l /t 0', (err) => {
      if (err) return;
      console.log('\n系統正在關機，停止同步服務...');
      if (syncInterval) {
        clearInterval(syncInterval);
      }
      if (pool) {
        pool.close();
      }
    });
  }
}

// 錯誤處理
process.on('uncaughtException', (error) => {
  console.error('未捕獲的錯誤:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未處理的 Promise 拒絕:', reason);
});

// 啟動
start();
