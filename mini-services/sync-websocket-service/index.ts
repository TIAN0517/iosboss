/**
 * 九九瓦斯行 - 即時同步 WebSocket 服務
 * 推送客戶、訂單、庫存等數據異動到公司網站
 *
 * 使用方式：
 * 1. 獨立運行：ts-node index.ts
 * 2. 整合到 Next.js：在 standalone 模式下啟動
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import { db } from './db';
import { Prisma } from '@prisma/client';

const PORT = parseInt(process.env.SYNC_WEBSOCKET_PORT || '3005');
const ENABLED = process.env.SYNC_WEBSOCKET_ENABLED === 'true';

/**
 * 同步事件類型
 */
export type SyncEventType = 'customer' | 'order' | 'inventory' | 'product';
export type SyncAction = 'created' | 'updated' | 'deleted';

export interface SyncEvent {
  type: SyncEventType;
  action: SyncAction;
  data: any;
  source: 'chuanji' | 'local';
  timestamp: Date;
}

/**
 * WebSocket 同步服務
 */
class SyncWebSocketService {
  private io: Server | null = null;
  private httpServer: any = null;

  constructor() {
    if (ENABLED) {
      this.initialize();
    } else {
      console.log('[同步服務] 已停用 (SYNC_WEBSOCKET_ENABLED=false)');
    }
  }

  private initialize() {
    // 建立 HTTP 伺服器
    this.httpServer = createServer();

    // 建立 Socket.IO 伺服器
    this.io = new Server(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      path: '/socket.io/',
    });

    this.setupHandlers();
    this.startServer();
    this.setupPrismaHooks();
  }

  /**
   * 設定 WebSocket 事件處理
   */
  private setupHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`[同步服務] 客戶端連接: ${socket.id}`);

      // 訂閱事件類型
      socket.on('subscribe', (events: SyncEventType[]) => {
        console.log(`[同步服務] 客戶端 ${socket.id} 訂閱:`, events);
        events.forEach(event => socket.join(event));
      });

      // 取消訂閱
      socket.on('unsubscribe', (events: SyncEventType[]) => {
        console.log(`[同步服務] 客戶端 ${socket.id} 取消訂閱:`, events);
        events.forEach(event => socket.leave(event));
      });

      // 心跳檢測
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });

      // 斷開連接
      socket.on('disconnect', (reason) => {
        console.log(`[同步服務] 客戶端斷開: ${socket.id} (${reason})`);
      });
    });
  }

  /**
   * 啟動伺服器
   */
  private startServer() {
    this.httpServer.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════╗');
      console.log('║                                          ║');
      console.log('║   九九瓦斯行 - 即時同步服務             ║');
      console.log('║                                          ║');
      console.log(`║   WebSocket: ${String(PORT).padEnd(20)} ║`);
      console.log('║                                          ║');
      console.log('╚══════════════════════════════════════════╝');
      console.log('');
    });
  }

  /**
   * 設定 Prisma Hooks 監聽資料庫變更
   * 注意：這需要在實際應用中配合資料庫觸發器或輪詢機制
   */
  private setupPrismaHooks() {
    // 這裡可以擴展為使用 Prisma Middleware 或其他機制
    // 目前提供手動觸發的方法
  }

  /**
   * 廣播同步事件到所有訂閱的客戶端
   */
  public broadcastSync(event: SyncEvent): void {
    if (!this.io) {
      console.warn('[同步服務] 服務未啟用，無法廣播事件');
      return;
    }

    console.log(`[同步服務] 廣播事件: ${event.type}.${event.action}`);

    // 廣播到特定房間（事件類型）
    this.io.to(event.type).emit('sync:event', {
      ...event,
      timestamp: event.timestamp.toISOString(),
    });

    // 同時廣播到全部（如有需要）
    this.io.emit('sync:all', {
      ...event,
      timestamp: event.timestamp.toISOString(),
    });
  }

  /**
   * 關閉服務
   */
  public shutdown(): void {
    if (this.io) {
      this.io.close();
      console.log('[同步服務] 已關閉');
    }
    if (this.httpServer) {
      this.httpServer.close();
    }
  }

  /**
   * 獲取連接數
   */
  public getConnectionCount(): number {
    return this.io?.engine?.clientsCount || 0;
  }
}

// 單例模式
let syncService: SyncWebSocketService | null = null;

export function getSyncWebSocketService(): SyncWebSocketService {
  if (!syncService) {
    syncService = new SyncWebSocketService();
  }
  return syncService;
}

/**
 * 手動觸發同步事件的輔助函數
 */
export function triggerSyncEvent(
  type: SyncEventType,
  action: SyncAction,
  data: any,
  source: 'chuanji' | 'local' = 'local'
): void {
  const service = getSyncWebSocketService();
  service.broadcastSync({
    type,
    action,
    data,
    source,
    timestamp: new Date(),
  });
}

// 如果直接運行此文件
if (require.main === module) {
  const service = getSyncWebSocketService();

  // 測試廣播（每 30 秒）
  setInterval(() => {
    service.broadcastSync({
      type: 'customer',
      action: 'updated',
      data: {
        id: 'test-123',
        name: '測試客戶',
        phone: '0912345678',
      },
      source: 'local',
      timestamp: new Date(),
    });
  }, 30000);

  // 優雅關閉
  process.on('SIGTERM', () => service.shutdown());
  process.on('SIGINT', () => service.shutdown());
}

export default getSyncWebSocketService();
