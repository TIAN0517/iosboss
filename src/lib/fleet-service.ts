// ========================================
// 車隊配送管理服務
// ========================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ========================================
// 司機位置服務
// ========================================

export interface DriverLocationInput {
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  address?: string;
  note?: string;
}

/**
 * 更新司機位置
 */
export async function updateDriverLocation(input: DriverLocationInput) {
  const location = await prisma.driverLocation.create({
    data: {
      driverId: input.driverId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      speed: input.speed,
      heading: input.heading,
      address: input.address,
      note: input.note,
    },
  });

  // 清理舊的位置記錄（只保留最近 7 天）
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  await prisma.driverLocation.deleteMany({
    where: {
      driverId: input.driverId,
      createdAt: { lt: weekAgo },
    },
  });

  return location;
}

/**
 * 獲取司機最新位置
 */
export async function getDriverLatestLocation(driverId: string) {
  return prisma.driverLocation.findFirst({
    where: { driverId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 獲取所有司機位置
 */
export async function getAllDriverLocations() {
  const drivers = await prisma.user.findMany({
    where: { role: 'driver', isActive: true },
    select: { id: true, name: true, phone: true },
  });

  const locations = await Promise.all(
    drivers.map(async (driver) => {
      const location = await getDriverLatestLocation(driver.id);
      return {
        ...driver,
        location,
      };
    })
  );

  return locations;
}

/**
 * 獲取司機位置歷史軌跡
 */
export async function DriverLocationHistory(
  driverId: string,
  startTime: Date,
  endTime: Date
) {
  return prisma.driverLocation.findMany({
    where: {
      driverId,
      createdAt: {
        gte: startTime,
        lte: endTime,
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

// ========================================
// 派單服務
// ========================================

export interface DispatchInput {
  orderId: string;
  driverId: string;
  note?: string;
}

export enum DispatchStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  ON_WAY = 'on_way',
  ARRIVED = 'arrived',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * 派單給司機
 */
export async function dispatchToDriver(input: DispatchInput) {
  // 檢查是否已經派發過
  const existing = await prisma.dispatchRecord.findFirst({
    where: {
      orderId: input.orderId,
      driverId: input.driverId,
    },
  });

  if (existing) {
    throw new Error('此訂單已派發給該司機');
  }

  // 創建派單記錄
  const dispatch = await prisma.dispatchRecord.create({
    data: {
      orderId: input.orderId,
      driverId: input.driverId,
      note: input.note,
    },
  });

  // 更新訂單的司機
  await prisma.gasOrder.update({
    where: { id: input.orderId },
    data: { driverId: input.driverId },
  });

  // 記錄審計日誌
  await prisma.auditLog.create({
    data: {
      id: `dispatch-${dispatch.id}`,
      action: 'DISPATCH',
      entityType: 'GasOrder',
      entityId: input.orderId,
      newValues: {
        driverId: input.driverId,
        note: input.note,
      },
      userId: input.driverId,
      username: (await prisma.user.findUnique({ where: { id: input.driverId } }))?.username,
    },
  });

  return dispatch;
}

/**
 * 司機接受派單
 */
export async function acceptDispatch(dispatchId: string) {
  return prisma.dispatchRecord.update({
    where: { id: dispatchId },
    data: {
      status: DispatchStatus.ACCEPTED,
      acceptedAt: new Date(),
    },
  });
}

/**
 * 司機拒絕派單
 */
export async function rejectDispatch(dispatchId: string, reason?: string) {
  return prisma.dispatchRecord.update({
    where: { id: dispatchId },
    data: {
      status: DispatchStatus.REJECTED,
      note: reason,
    },
  });
}

/**
 * 更新派單狀態
 */
export async function updateDispatchStatus(
  dispatchId: string,
  status: DispatchStatus
) {
  const updateData: any = { status };

  if (status === DispatchStatus.ON_WAY) {
    // 開始配送
  } else if (status === DispatchStatus.ARRIVED) {
    updateData.arrivedAt = new Date();
  } else if (status === DispatchStatus.COMPLETED) {
    updateData.completedAt = new Date();
  } else if (status === DispatchStatus.CANCELLED) {
    updateData.cancelledAt = new Date();
  }

  const dispatch = await prisma.dispatchRecord.update({
    where: { id: dispatchId },
    data: updateData,
  });

  // 同步更新訂單狀態
  if (status === DispatchStatus.COMPLETED) {
    await prisma.gasOrder.update({
      where: { id: dispatch.orderId },
      data: { status: 'completed' },
    });
  } else if (status === DispatchStatus.ON_WAY) {
    await prisma.gasOrder.update({
      where: { id: dispatch.orderId },
      data: { status: 'delivering' },
    });
  }

  return dispatch;
}

/**
 * 獲取司機的派單列表
 */
export async function getDriverDispatches(driverId: string) {
  return prisma.dispatchRecord.findMany({
    where: { driverId },
    include: {
      // 通過 orderId 獲取訂單信息
      // 注意：這裡需要手動關聯 GasOrder
    },
    orderBy: { dispatchedAt: 'desc' },
  });
}

/**
 * 獲取訂單的派單記錄
 */
export async function getOrderDispatches(orderId: string) {
  return prisma.dispatchRecord.findMany({
    where: { orderId },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
    orderBy: { dispatchedAt: 'desc' },
  });
}

/**
 * 批量派單
 */
export async function batchDispatch(orderIds: string[], driverId: string) {
  const results = [];

  for (const orderId of orderIds) {
    try {
      const dispatch = await dispatchToDriver({ orderId, driverId });
      results.push({ success: true, orderId, dispatch });
    } catch (error) {
      results.push({
        success: false,
        orderId,
        error: error instanceof Error ? error.message : '未知錯誤',
      });
    }
  }

  return results;
}

// ========================================
// 車隊統計
// ========================================

/**
 * 獲取司機統計數據
 */
export async function getDriverStats(driverId: string) {
  const completed = await prisma.dispatchRecord.count({
    where: {
      driverId,
      status: DispatchStatus.COMPLETED,
    },
  });

  const inProgress = await prisma.dispatchRecord.count({
    where: {
      driverId,
      status: {
        in: [DispatchStatus.ACCEPTED, DispatchStatus.ON_WAY, DispatchStatus.ARRIVED],
      },
    },
  });

  const rejected = await prisma.dispatchRecord.count({
    where: {
      driverId,
      status: DispatchStatus.REJECTED,
    },
  });

  return {
    completed,
    inProgress,
    rejected,
    total: completed + inProgress + rejected,
  };
}

/**
 * 獲取所有司機統計
 */
export async function getAllDriverStats() {
  const drivers = await prisma.user.findMany({
    where: { role: 'driver', isActive: true },
    select: { id: true, name: true },
  });

  const stats = await Promise.all(
    drivers.map(async (driver) => ({
      ...driver,
      stats: await getDriverStats(driver.id),
    }))
  );

  return stats;
}
