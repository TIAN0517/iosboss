// ========================================
// 數據同步服務
// ========================================

import { db } from './db';

// ========================================
// 類型定義
// ========================================

export interface SyncChangeInput {
  tableName: string;
  recordId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  recordData: any;
}

export interface SyncUploadResult {
  success: boolean;
  uploaded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface SyncDownloadResult {
  success: boolean;
  downloaded: number;
  changes: any[];
}

export interface SyncStatus {
  lastSyncAt: Date | null;
  syncCount: number;
  pendingCount: number;
  errorCount: number;
  status: string;
  errorMessage: string | null;
}

// ========================================
// 配置
// ========================================

const SYNC_TABLES = [
  'customers',
  'products',
  'gas_orders',
  'inventory',
  'checks',
  'deliveries',
] as const;

// 外部同步 API 配置（從環境變量讀取）
const EXTERNAL_SYNC_API = process.env.EXTERNAL_SYNC_API || '';
const SYNC_API_KEY = process.env.SYNC_API_KEY || '';

// ========================================
// 核心同步功能
// ========================================

/**
 * 記錄數據變更（用於追蹤需要同步的變更）
 */
export async function recordChange(input: SyncChangeInput) {
  return db.syncChange.create({
    data: {
      tableName: input.tableName,
      recordId: input.recordId,
      operation: input.operation,
      recordData: input.recordData,
    },
  });
}

/**
 * 批量記錄數據變更
 */
export async function recordChanges(changes: SyncChangeInput[]) {
  return db.syncChange.createMany({
    data: changes.map((c) => ({
      tableName: c.tableName,
      recordId: c.recordId,
      operation: c.operation,
      recordData: c.recordData,
    })),
  });
}

// ========================================
// 上傳變更
// ========================================

/**
 * 上傳本地變更到外部系統
 */
export async function uploadChanges(): Promise<SyncUploadResult> {
  // 1. 獲取未同步的變更
  const pendingChanges = await db.syncChange.findMany({
    where: { synced: false },
    orderBy: { timestamp: 'asc' },
    take: 100, // 每次最多同步 100 條記錄
  });

  if (pendingChanges.length === 0) {
    return {
      success: true,
      uploaded: 0,
      failed: 0,
      errors: [],
    };
  }

  // 2. 如果沒有配置外部 API，直接標記為已同步
  if (!EXTERNAL_SYNC_API) {
    await db.syncChange.updateMany({
      where: { id: { in: pendingChanges.map((c) => c.id) } },
      data: { synced: true, syncedAt: new Date() },
    });

    return {
      success: true,
      uploaded: pendingChanges.length,
      failed: 0,
      errors: [],
    };
  }

  // 3. 發送到外部系統
  const errors: Array<{ id: string; error: string }> = [];
  let uploaded = 0;

  try {
    const response = await fetch(`${EXTERNAL_SYNC_API}/sync/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SYNC_API_KEY}`,
      },
      body: JSON.stringify({
        changes: pendingChanges,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // 4. 標記成功同步的記錄
    const syncedIds = result.syncedIds || pendingChanges.map((c) => c.id);
    await db.syncChange.updateMany({
      where: { id: { in: syncedIds } },
      data: { synced: true, syncedAt: new Date() },
    });

    uploaded = syncedIds.length;
  } catch (error) {
    // 記錄錯誤
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await db.syncChange.updateMany({
      where: { id: { in: pendingChanges.map((c) => c.id) } },
      data: { error: errorMsg },
    });

    errors.push({ id: 'batch', error: errorMsg });
  }

  return {
    success: errors.length === 0,
    uploaded,
    failed: errors.length,
    errors,
  };
}

// ========================================
// 下載變更
// ========================================

/**
 * 從外部系統下載變更
 */
export async function downloadChanges(lastSyncAt?: Date): Promise<SyncDownloadResult> {
  if (!EXTERNAL_SYNC_API) {
    return {
      success: true,
      downloaded: 0,
      changes: [],
    };
  }

  try {
    const response = await fetch(`${EXTERNAL_SYNC_API}/sync/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SYNC_API_KEY}`,
      },
      body: JSON.stringify({
        lastSyncAt: lastSyncAt?.toISOString() || null,
        tables: SYNC_TABLES,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: true,
      downloaded: result.changes?.length || 0,
      changes: result.changes || [],
    };
  } catch (error) {
    return {
      success: false,
      downloaded: 0,
      changes: [],
    };
  }
}

// ========================================
// 完整同步
// ========================================

/**
 * 執行完整同步（上傳 + 下載）
 */
export async function fullSync(): Promise<{
  uploadResult: SyncUploadResult;
  downloadResult: SyncDownloadResult;
}> {
  // 1. 獲取當前同步狀態
  const syncStatus = await getSyncStatus();

  // 2. 更新狀態為 syncing
  await db.syncStatus.update({
    where: { id: syncStatus.id },
    data: { status: 'syncing' },
  });

  try {
    // 3. 上傳本地變更
    const uploadResult = await uploadChanges();

    // 4. 下載外部變更
    const downloadResult = await downloadChanges(syncStatus.lastSyncAt || undefined);

    // 5. 應用下載的變更
    if (downloadResult.success && downloadResult.changes.length > 0) {
      await applyDownloadedChanges(downloadResult.changes);
    }

    // 6. 更新同步狀態
    await db.syncStatus.update({
      where: { id: syncStatus.id },
      data: {
        status: 'idle',
        lastSyncAt: new Date(),
        syncCount: { increment: 1 },
        pendingCount: { decrement: uploadResult.uploaded },
      },
    });

    return { uploadResult, downloadResult };
  } catch (error) {
    // 更新狀態為錯誤
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await db.syncStatus.update({
      where: { id: syncStatus.id },
      data: {
        status: 'error',
        errorMessage: errorMsg,
        errorCount: { increment: 1 },
      },
    });

    throw error;
  }
}

// ========================================
// 應用下載的變更
// ========================================

/**
 * 應用從外部系統下載的變更
 */
async function applyDownloadedChanges(changes: any[]) {
  // 按表名分組
  const changesByTable: Record<string, any[]> = {};
  for (const change of changes) {
    if (!changesByTable[change.tableName]) {
      changesByTable[change.tableName] = [];
    }
    changesByTable[change.tableName].push(change);
  }

  // 應用每個表的變更
  for (const [tableName, tableChanges] of Object.entries(changesByTable)) {
    for (const change of tableChanges) {
      try {
        await applyTableChange(tableName, change);
      } catch (error) {
        console.error(`Failed to apply change for ${tableName}:`, error);
      }
    }
  }
}

/**
 * 應用單個表的變更
 */
async function applyTableChange(tableName: string, change: any) {
  const { operation, recordData } = change;

  switch (tableName) {
    case 'customers':
      await applyCustomerChange(operation, recordData);
      break;
    case 'products':
      await applyProductChange(operation, recordData);
      break;
    case 'gas_orders':
      await applyOrderChange(operation, recordData);
      break;
    // 添加其他表的處理...
  }
}

async function applyCustomerChange(operation: string, data: any) {
  if (operation === 'CREATE') {
    await db.customer.create({ data });
  } else if (operation === 'UPDATE') {
    await db.customer.update({ where: { id: data.id }, data });
  } else if (operation === 'DELETE') {
    await db.customer.delete({ where: { id: data.id } });
  }
}

async function applyProductChange(operation: string, data: any) {
  if (operation === 'CREATE') {
    await db.product.create({ data });
  } else if (operation === 'UPDATE') {
    await db.product.update({ where: { id: data.id }, data });
  } else if (operation === 'DELETE') {
    await db.product.update({ where: { id: data.id }, data: { isActive: false } });
  }
}

async function applyOrderChange(operation: string, data: any) {
  if (operation === 'CREATE') {
    // 訂單通常不會從外部系統創建
    console.warn('Cannot create order from external system');
  } else if (operation === 'UPDATE') {
    await db.gasOrder.update({ where: { id: data.id }, data });
  }
}

// ========================================
// 同步狀態
// ========================================

/**
 * 獲取同步狀態
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  let status = await db.syncStatus.findFirst();

  if (!status) {
    status = await db.syncStatus.create({
      data: {},
    });
  }

  // 計算待同步數量
  const pendingCount = await db.syncChange.count({
    where: { synced: false },
  });

  return {
    lastSyncAt: status.lastSyncAt,
    syncCount: status.syncCount,
    pendingCount,
    errorCount: status.errorCount,
    status: status.status,
    errorMessage: status.errorMessage,
  };
}

/**
 * 解決衝突
 */
export async function resolveConflict(changeId: string, resolution: 'local' | 'remote') {
  const change = await db.syncChange.findUnique({
    where: { id: changeId },
  });

  if (!change) {
    throw new Error('Change not found');
  }

  if (resolution === 'local') {
    // 保留本地版本，標記為已同步
    await db.syncChange.update({
      where: { id: changeId },
      data: { synced: true, syncedAt: new Date() },
    });
  } else {
    // 使用遠程版本，重新下載並應用
    // 這需要實現具體的衝突解決邏輯
  }

  return { success: true };
}
