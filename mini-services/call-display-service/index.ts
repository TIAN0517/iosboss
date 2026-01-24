// 手機來電顯示WebSocket服務 - 九九瓦斯行管理系統 2025
// Jy技術團隊開發 - BossJy

import { Server } from 'socket.io'
import { createServer } from 'http'

const PORT = 3004

interface CallInfo {
  phoneNumber: string
  customerId?: string
  customerName?: string
  callTime: Date
  status: 'incoming' | 'outgoing' | 'missed' | 'rejected'
  duration?: number
  notes?: string
}

interface ConnectedClient {
  id: string
  role: 'admin' | 'staff' | 'driver'
  connectedAt: Date
}

class CallDisplayService {
  private io: Server
  private connectedClients: Map<string, ConnectedClient> = new Map()

  constructor() {
    const httpServer = createServer()
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    })

    this.setupEventHandlers()
    this.startServer(httpServer)
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[九九瓦斯行] 客戶端連接: ${socket.id}`)

      // 發送歷史來電記錄
      this.sendHistory(socket)

      socket.on('disconnect', () => {
        console.log(`[九九瓦斯行] 客戶端斷開: ${socket.id}`)
        this.connectedClients.delete(socket.id)
      })

      socket.on('client:register', (data: { role: string }) => {
        console.log(`[九九瓦斯行] 客戶端註冊:`, data)
        this.connectedClients.set(socket.id, {
          id: socket.id,
          role: data.role as any,
          connectedAt: new Date()
        })

        // 回復確認
        socket.emit('server:registered', {
          success: true,
          message: '已連接到九九瓦斯行來電顯示系統'
        })
      })

      // 測試來電模擬（開發時使用）
      socket.on('client:simulate-call', (data: CallInfo) => {
        console.log(`[九九瓦斯行] 模擬來電:`, data)
        this.broadcastIncomingCall(data)
      })
    })
  }

  private sendHistory(socket: any) {
    // 這裡可以從數據庫加載歷史記錄
    const recentCalls: CallInfo[] = [
      {
        phoneNumber: '0912-345-678',
        customerName: '王大明',
        callTime: new Date(Date.now() - 300000),
        status: 'incoming',
        duration: 45,
      },
      {
        phoneNumber: '0988-765-432',
        callTime: new Date(Date.now() - 600000),
        status: 'missed',
      },
    ]

    socket.emit('server:history', {
      calls: recentCalls,
      message: '已發送最近來電記錄'
    })
  }

  private broadcastIncomingCall(call: CallInfo) {
    console.log(`[九九瓦斯行] 廣播來電通知:`, call)

    this.io.emit('server:incoming-call', {
      ...call,
      timestamp: new Date().toISOString(),
      system: '九九瓦斯行管理系統 2025'
    })

    // 同時發送到主系統API記錄
    this.recordCallToMainSystem(call)
  }

  private async recordCallToMainSystem(call: CallInfo) {
    try {
      // 調用主系統API記錄來電 (使用環境變量 APP_URL)
      const response = await fetch(`${process.env.APP_URL || 'http://localhost:9999'}/api/call-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: call.phoneNumber,
          customerId: call.customerId,
          duration: call.duration,
          status: call.status,
          notes: call.notes,
        }),
      })

      if (response.ok) {
        console.log(`[九九瓦斯行] 來電記錄已同步到主系統`)
      }
    } catch (error) {
      console.error(`[九九瓦斯行] 同步來電記錄失敗:`, error)
    }
  }

  private startServer(httpServer: any) {
    httpServer.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════╗
║                                                        ║
║       九九瓦斯行管理系統 2025 - 來電顯示服務       ║
║                                                        ║
║       Jy技術團隊開發 - BossJy                    ║
║                                                        ║
║       WebSocket 服務運行於端口: ${PORT}                ║
║                                                        ║
╚══════════════════════════════════════════════════════╝
      `)
    })
  }

  // 提供給外部系統的接口
  public notifyIncomingCall(call: CallInfo) {
    this.broadcastIncomingCall(call)
  }
}

// 啟動服務
const service = new CallDisplayService()

// 導出供其他模塊使用
export default service
