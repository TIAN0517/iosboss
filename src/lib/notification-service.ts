// ========================================
// 休假表通知服務
// ========================================

/**
 * 發送休假表相關通知
 * 支持通知到：
 * 1. LINE 老闆群組
 * 2. APP 內通知
 */

import { db } from './db';

// ========================================
// 類型定義
// ========================================

export interface NotificationPayload {
  type: 'schedule_submitted' | 'schedule_approved' | 'schedule_rejected';
  sheetId: string;
  year: number;
  month: number;
  submittedBy?: string;
  reviewedBy?: string;
  status: string;
  note?: string;
}

// ========================================
// LINE 通知服務
// ========================================

/**
 * 發送休假表通知到 LINE 管理員群組
 */
export async function sendLineNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const LINE_ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID;

    if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_ADMIN_GROUP_ID) {
      console.warn('[Notification] LINE credentials not configured');
      return false;
    }

    // 構建訊息內容
    const message = buildLineMessage(payload);

    // 發送到 LINE 群組
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_ADMIN_GROUP_ID,
        messages: [
          {
            type: 'text',
            text: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Notification] LINE API error:', error);
      return false;
    }

    // 保存通知記錄
    await saveNotificationRecord({
      type: payload.type,
      channel: 'line',
      recipientId: LINE_ADMIN_GROUP_ID,
      content: message,
      sheetId: payload.sheetId,
    });

    return true;
  } catch (error) {
    console.error('[Notification] Send LINE notification error:', error);
    return false;
  }
}

/**
 * 構建 LINE 訊息內容
 */
function buildLineMessage(payload: NotificationPayload): string {
  const { type, year, month, submittedBy, reviewedBy, status, note } = payload;

  switch (type) {
    case 'schedule_submitted':
      return `📋 **新休假表待審核**

📅 年月：${year}年${month}月
👤 提交者：${submittedBy || '未知'}
📊 狀態：待審核

請查看 APP 並進行審核。`;

    case 'schedule_approved':
      return `✅ **休假表已通過**

📅 年月：${year}年${month}月
👤 審核者：${reviewedBy || '管理員'}
📊 狀態：已通過

休假表已正式生效。${note ? `\n備註：${note}` : ''}`;

    case 'schedule_rejected':
      return `❌ **休假表已拒絕**

📅 年月：${year}年${month}月
👤 審核者：${reviewedBy || '管理員'}
📊 狀態：已拒絕

請修改後重新提交。${note ? `\n原因：${note}` : ''}`;

    default:
      return `📋 休假表通知：${year}年${month}月`;
  }
}

// ========================================
// APP 內通知服務
// ========================================

/**
 * 發送 APP 內通知
 */
export async function sendAppNotification(
  payload: NotificationPayload,
  recipientUserId?: string
): Promise<boolean> {
  try {
    // 保存通知到資料庫
    await saveNotificationRecord({
      type: payload.type,
      channel: 'app',
      recipientId: recipientUserId || 'all_admins',
      content: buildAppNotificationMessage(payload),
      sheetId: payload.sheetId,
    });

    // TODO: 如果有即時通知服務（如 Socket.IO），可以在此發送
    // 目前只在資料庫中記錄

    return true;
  } catch (error) {
    console.error('[Notification] Send app notification error:', error);
    return false;
  }
}

/**
 * 構建 APP 通知訊息
 */
function buildAppNotificationMessage(payload: NotificationPayload): string {
  const { type, year, month, submittedBy, reviewedBy, status, note } = payload;

  const messages = {
    schedule_submitted: `新休假表待審核：${year}年${month}月`,
    schedule_approved: `休假表已通過：${year}年${month}月`,
    schedule_rejected: `休假表已拒絕：${year}年${month}月`,
  };

  return messages[type] || `休假表通知：${year}年${month}月`;
}

// ========================================
// 通知記錄管理
// ========================================

interface NotificationRecord {
  type: string;
  channel: 'line' | 'app';
  recipientId: string;
  content: string;
  sheetId: string;
}

/**
 * 保存通知記錄
 */
async function saveNotificationRecord(record: NotificationRecord): Promise<void> {
  try {
    // 可以在 schema 中添加 Notification 模型來保存通知記錄
    // 目前使用日誌記錄
    console.log('[Notification] Record saved:', {
      type: record.type,
      channel: record.channel,
      recipient: record.recipientId,
      sheetId: record.sheetId,
    });
  } catch (error) {
    console.error('[Notification] Save record error:', error);
  }
}

// ========================================
// 綜合通知發送
// ========================================

/**
 * 發送休假表通知（所有渠道）
 */
export async function sendScheduleNotification(
  payload: NotificationPayload,
  options?: {
    sendLine?: boolean;
    sendApp?: boolean;
    recipientUserId?: string;
  }
): Promise<{ line: boolean; app: boolean }> {
  const { sendLine = true, sendApp = true, recipientUserId } = options || {};

  const results = {
    line: false,
    app: false,
  };

  // 並行發送通知
  await Promise.allSettled([
    sendLine ? sendLineNotification(payload) : Promise.resolve(false),
    sendApp ? sendAppNotification(payload, recipientUserId) : Promise.resolve(false),
  ]);

  if (sendLine) results.line = await sendLineNotification(payload);
  if (sendApp) results.app = await sendAppNotification(payload, recipientUserId);

  return results;
}

// ========================================
// 獲取未讀通知
// ========================================

/**
 * 獲取用戶未讀通知
 */
export async function getUnreadNotifications(userId?: string): Promise<any[]> {
  // TODO: 實現未讀通知查詢
  // 需要先在 schema 中添加 Notification 模型
  return [];
}
