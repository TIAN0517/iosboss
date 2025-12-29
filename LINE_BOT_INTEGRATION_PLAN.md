# LINE Bot 整合實作計劃

## 目標
1. **LINE Bot 自動回應邏輯** - 智能對話系統
2. **特定群組的專屬功能** - 群組權限與專屬指令
3. **語音助手與 LINE Bot 整合** - 統一 AI 助手服務

---

## 1. LINE Bot 自動回應邏輯

### 1.1 架構設計

```
┌─────────────────────────────────────────────────────────┐
│                   LINE Webhook                          │
│              /api/webhook/line/route.ts                 │
├─────────────────────────────────────────────────────────┤
│  事件處理                                                │
│  - 訊息類型判斷 (text/audio/image/location)             │
│  - 來源識別 (user/group/room)                           │
│  - 群組類型識別                                         │
├─────────────────────────────────────────────────────────┤
│  意圖分析 (Intent Analysis)                             │
│  - 關鍵字匹配                                           │
│  - AI 語意理解 (BossJy-99)                              │
│  - 群組上下文                                          │
├─────────────────────────────────────────────────────────┤
│  回應生成器 (Response Generator)                        │
│  - 文字回應                                            │
│  - Flex 訊息                                            │
│  - Quick Reply 按鈕                                    │
│  - 群組專屬回應                                        │
└─────────────────────────────────────────────────────────┘
```

### 1.2 需要新建的檔案

| 檔案 | 功能 |
|------|------|
| `src/lib/line-bot-intent.ts` | 意圖分析引擎 |
| `src/lib/line-bot-response.ts` | 回應生成器 |
| `src/lib/line-group-manager.ts` | 群組管理服務 |
| `src/lib/unified-ai-assistant.ts` | 統一 AI 助手 |

### 1.3 意圖類型定義

```typescript
enum LineIntent {
  // 訂單相關
  CREATE_ORDER = 'create_order',
  CHECK_ORDER = 'check_order',
  CANCEL_ORDER = 'cancel_order',

  // 查詢相關
  CHECK_INVENTORY = 'check_inventory',
  CHECK_PRICE = 'check_price',
  CHECK_REVENUE = 'check_revenue',

  // 客戶相關
  CREATE_CUSTOMER = 'create_customer',
  SEARCH_CUSTOMER = 'search_customer',

  // 配送相關
  DELIVERY_STATUS = 'delivery_status',
  DRIVER_ASSIGN = 'driver_assign',

  // 群組專屬
  ADMIN_REPORT = 'admin_report',      // 管理群組專屬
  DRIVER_TASKS = 'driver_tasks',      // 司機群組專屬
  SALES_TARGET = 'sales_target',      // 業務群組專屬

  // 一般
  GREETING = 'greeting',
  HELP = 'help',
  UNKNOWN = 'unknown',
}
```

---

## 2. 特定群組的專屬功能

### 2.1 群組類型定義

```typescript
enum GroupType {
  ADMIN = 'admin',           // 管理群組 - 老闆娘 + 管理層
  DRIVER = 'driver',         // 司機群組 - 配送司機
  SALES = 'sales',           // 業務群組 - 業務員
  CUSTOMER_SERVICE = 'cs',   // 客服群組 - 客服人員
  GENERAL = 'general',       // 一般群組 - 普通用戶
}

// 群組配置
interface GroupConfig {
  groupId: string
  groupName: string
  groupType: GroupType
  permissions: string[]
  exclusiveCommands: string[]
}
```

### 2.2 群組權限系統

| 群組類型 | 權限 | 專屬指令 |
|---------|------|----------|
| **admin** | 完全權限 | `/報表`, `/匯出`, `/系統設定` |
| **driver** | 配送相關 | `/我的任務`, `/配送狀態`, `/完成配送` |
| **sales** | 業務相關 | `/業績`, `/客戶列表`, `/新增客戶` |
| **cs** | 客服相關 | `/查訂單`, `/客戶資料`, `/庫存` |
| **general** | 基本查詢 | `/查價`, `/訂瓦斯`, `/營業時間` |

### 2.3 群組管理資料庫

需要在 Prisma schema 添加：

```prisma
model LineGroup {
  id          String   @id @default(cuid())
  groupId     String   @unique
  groupName   String
  groupType   String   // admin, driver, sales, cs, general
  permissions String[] // JSON array
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 關聯
  messages    LineMessage[]
}

model LineMessage {
  id          String   @id @default(cuid())
  groupId     String?
  userId      String?
  messageType String   // text, audio, image
  content     String
  intent      String?
  response    String?
  timestamp   DateTime @default(now())

  group       LineGroup? @relation(fields: [groupId], references: [id])
}
```

---

## 3. 語音助手與 LINE Bot 整合

### 3.1 統一 AI 助手架構

```typescript
// unified-ai-assistant.ts
export class UnifiedAIAssistant {
  private bossJy99: BossJy99Assistant
  private lineBot: LineBotService
  private voiceService: VoiceAssistantService

  // 統一的對話處理
  async processMessage(message: string, context: MessageContext): Promise<AIResponse>
  async processVoice(audioUrl: string, context: MessageContext): Promise<AIResponse>
}
```

### 3.2 上下文共享

```typescript
interface MessageContext {
  platform: 'web' | 'line' | 'voice'
  userId?: string
  groupId?: string
  groupType?: GroupType
  conversationHistory?: Message[]
  userRole?: string
}
```

### 3.3 整合流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  語音輸入     │     │  LINE 訊息    │     │  Web 聊天    │
│  VoiceInput  │     │  Webhook     │     │  AIAssistant │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  統一上下文     │
                    │  MessageContext│
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │  意圖分析引擎   │
                    │  IntentAnalyzer│
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │ BossJy-99 AI   │
                    │  統一 AI 助手  │
                    └───────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐      ┌─────▼─────┐     ┌────▼────┐
    │語音回應  │      │LINE 回應   │     │Web 回應 │
    │  TTS    │      │Flex 訊息  │     │文字訊息 │
    └─────────┘      └───────────┘     └─────────┘
```

---

## 4. 實作順序

### Phase 1: 基礎架構
1. ✅ 創建 `line-bot-intent.ts` - 意圖分析
2. ✅ 創建 `line-bot-response.ts` - 回應生成器
3. ✅ 更新 Prisma schema - 添加 LineGroup 表
4. ✅ 創建 `line-group-manager.ts` - 群組管理

### Phase 2: 群組功能
5. ✅ 實作群組類型識別
6. ✅ 實作群組專屬指令
7. ✅ 實作權限檢查系統
8. ✅ 創建群組管理 API

### Phase 3: 整合
9. ✅ 創建 `unified-ai-assistant.ts`
10. ✅ 更新 LINE webhook 使用統一助手
11. ✅ 更新語音助手使用統一助手
12. ✅ 測試跨平台功能

---

## 5. 測試案例

### 5.1 LINE Bot 測試

| 場景 | 群組 | 訊息 | 預期回應 |
|------|------|------|----------|
| 訂瓦斯 | 一般 | 我要訂 20kg 瓦斯 | Flex 訂單確認訊息 |
| 查任務 | 司機 | 我的任務 | 配送任務列表 |
| 查報表 | 管理 | 今日報表 | 營運數據摘要 |
| 語音訊息 | 任何 | [語音] | 轉錄後處理 |

### 5.2 語音助手測試

| 指令 | 預期行作 |
|------|----------|
| 「發送到 LINE 管理群組」| 廣播訊息到管理群 |
| 「查司機群組任務」| 顯示司機群組狀態 |
| 「通知所有司機」| 廣播到司機群組 |

---

## 6. API 端點

```
GET  /api/line/groups         # 獲取群組列表
POST /api/line/groups         # 新增/更新群組
GET  /api/line/groups/:id     # 獲取群組詳情
POST /api/line/sync-groups    # 從 LINE API 同步群組
POST /api/line/broadcast      # 廣播訊息
GET  /api/line/history        # 訊息歷史
```

---

## 7. 環境變量

```bash
# LINE Bot 配置
LINE_CHANNEL_ACCESS_TOKEN=xxx
LINE_CHANNEL_SECRET=xxx

# 群組配置
LINE_ADMIN_GROUP_ID=Cxxx
LINE_DRIVER_GROUP_ID=Cxxx
LINE_SALES_GROUP_ID=Cxxx

# Webhook URL
LINE_WEBHOOK_URL=https://your-domain.com/api/webhook/line
```
