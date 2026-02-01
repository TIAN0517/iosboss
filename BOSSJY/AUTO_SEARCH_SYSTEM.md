# 台灣花蓮店家自動搜尋與爬取系統

## 🎯 系統概述

這是一個**全自動化的店家資訊收集系統**，能夠自動搜尋網路上的店家資訊、爬取公開數據、使用AI提取和整理資訊，並驗證LINE活躍度。

## 🌟 核心功能

### 1. 🔍 自動網路搜尋
- **智能搜尋**：輸入關鍵字（如「花蓮餐廳」、「花蓮麵線」）
- **多查詢策略**：自動構建多個優化的搜尋查詢
- **結果過濾**：自動過濾不相關的結果（新聞、論壇等）
- **批量處理**：支持一次性處理多個搜尋結果

### 2. 🌐 自動網頁爬取
- **智能讀取**：使用Web Reader API讀取網頁內容
- **容錯機制**：如果API失敗，自動降級使用fetch
- **內容提取**：提取HTML、標題、元數據等
- **格式支持**：支持各種網站類型

### 3. 🤖 AI智能提取
- **LLM驅動**：使用大型語言模型提取店家資訊
- **精準識別**：提取店家名稱、電話、地址、網站、圖片等
- **結構化輸出**：自動格式化為JSON結構
- **優化提示詞**：專門為台灣花蓮地區設計

### 4. 📱 LINE活躍度驗證
- **自動驗證**：點擊即可驗證電話號碼LINE狀態
- **批量驗證**：支持批量驗證多個店家
- **證據記錄**：保存驗證證據和時間

### 5. 💾 智能資料管理
- **自動去重**：根據電話號碼自動去重
- **批量儲存**：支持批量儲存多個店家
- **搜尋篩選**：快速搜尋已儲存的店家

## 🔄 工作流程

### 用戶使用流程：

```
1. 輸入搜尋關鍵字
   ↓
2. 系統自動搜尋網路
   ↓
3. 展示搜尋結果
   ↓
4. 選擇要提取的店家
   ↓
5. 系統自動爬取並提取資訊
   ↓
6. 查看提取結果（名稱、電話、地址、圖片等）
   ↓
7. 驗證LINE活躍度（可選）
   ↓
8. 儲存到資料庫
```

### 系統技術流程：

```
用戶輸入關鍵字
    ↓
API: POST /api/search-stores
    ↓
z-ai-web-dev-sdk: Web Search
    ↓
返回搜尋結果列表
    ↓
用戶選擇要提取的結果
    ↓
API: POST /api/extract-from-web
    ↓
z-ai-web-dev-sdk: Web Reader (讀取網頁)
    ↓
z-ai-web-dev-sdk: LLM (提取資訊)
    ↓
返回結構化店家資訊
    ↓
API: POST /api/verify-line (可選)
    ↓
z-ai-web-dev-sdk: Web Search (LINE驗證)
    ↓
API: POST /api/stores (儲存)
    ↓
Prisma ORM (儲存到SQLite)
```

## 📡 API端點

### 1. 搜尋店家

```
POST /api/search-stores

Body:
{
  "query": "花蓮餐廳",
  "limit": 20  // 可選，默認20
}

Response:
{
  "success": true,
  "results": [
    {
      "title": "花蓮必吃美食推薦 - XX餐廳",
      "url": "https://example.com/restaurant",
      "snippet": "這是一家花蓮市中山路上的美味餐廳..."
    }
  ],
  "total": 10
}
```

### 2. 從網頁提取店家資訊

```
POST /api/extract-from-web

Body:
{
  "url": "https://example.com/store-page"
}

Response:
{
  "success": true,
  "store": {
    "name": "店家名稱",
    "phoneNumber": "0912-345-678",
    "address": "花蓮市中山路一段123號",
    "website": "https://example.com",
    "imageUrl": "https://example.com/storefront.jpg",
    "signboard": "紅色招牌，白字，現代設計風格...",
    "location": "台灣花蓮縣花蓮市"
  }
}
```

### 3. 驗證LINE活躍度

```
POST /api/verify-line

Body:
{
  "phoneNumber": "0912-345-678",
  "storeName": "店家名稱"
}

Response:
{
  "success": true,
  "lineActive": true,
  "confidence": "high",
  "evidence": "在搜尋結果中發現與LINE相關的資訊...",
  "recommendation": "此電話號碼很可能有活躍的LINE帳號"
}
```

### 4. 店家管理API

```
GET /api/stores                    # 列出所有店家
POST /api/stores                   # 創建新店家
GET /api/stores/{id}               # 獲取單個店家
PUT /api/stores/{id}               # 更新店家
DELETE /api/stores/{id}            # 刪除店家
```

## 🤖 AI技術棧

### 使用的AI技術：

1. **Web Search** (z-ai-web-dev-sdk)
   - 搜尋網路上的店家資訊
   - 驗證LINE活躍度
   - 支持多查詢並發

2. **Web Reader** (z-ai-web-dev-sdk)
   - 讀取網頁內容
   - 提取結構化數據
   - 支持各種網站格式

3. **LLM** (z-ai-web-dev-sdk)
   - 提取店家資訊
   - 整理和格式化數據
   - 理解網頁內容

### 提示詞優化策略：

#### 店家資訊提取提示詞：
```
✅ 專注於台灣花蓮地區
✅ 精準電話號碼識別（09xx手機，03花蓮市話）
✅ 完整地址提取（含鄉鎮市）
✅ 網站URL驗證
✅ 圖片URL提取
✅ 繁體中文輸出
✅ JSON結構化輸出
```

#### LINE驗證提示詞：
```
✅ 保守驗證策略
✅ 多重證據檢查
✅ 置信度評估
✅ 詳細證據說明
```

## 💾 資料庫模型

### Store模型：

```prisma
model Store {
  id                String   @id @default(cuid())
  name              String
  address           String?
  phoneNumber       String?
  website           String?
  signboard         String?
  imageUrl          String?  // 門面/招牌圖片
  location          String?
  lineActive        Boolean?
  lineVerifiedAt    DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### PhoneNumberVerification模型：

```prisma
model PhoneNumberVerification {
  id          String   @id @default(cuid())
  phoneNumber String
  lineActive  Boolean?
  verifiedAt  DateTime @default(now())
  notes       String?
  createdAt   DateTime @default(now())
}
```

## 🎨 前端功能

### 1. 搜尋頁籤
- 搜尋框輸入關鍵字
- 展示搜尋結果
- 單個或批量提取資訊
- 實時狀態顯示

### 2. 已提取頁籤
- 展示提取的店家列表
- 顯示店家圖片
- LINE驗證按鈕
- 單個或批量儲存

### 3. 已儲存頁籤
- 展示所有儲存的店家
- LINE狀態標籤
- 連結到原始網站

## 🚀 使用示例

### 示例1：搜尋花蓮麵線店

```
1. 輸入：「花蓮麵線」
2. 點擊「搜尋」
3. 系統返回多個相關店家
4. 點擊「全部提取」
5. 系統自動爬取並提取資訊
6. 查看提取結果（名稱、電話、地址、圖片）
7. 選擇有電話的店家點擊「驗證LINE」
8. 點擊「儲存店家」或「全部儲存」
```

### 示例2：搜尋花蓮咖啡廳

```
1. 輸入：「花蓮咖啡廳」
2. 點擊「搜尋」
3. 選擇幾個感興趣的店家點擊「提取資訊」
4. 系統自動提取每個店家的詳細資訊
5. 查看門面照片和招牌描述
6. 驗證LINE活躍度
7. 儲存到資料庫
```

## 📊 優勢分析

### 對比手動上傳方式：

| 功能 | 手動上傳 | 自動搜尋爬取 |
|------|---------|-------------|
| 資料來源 | 用戶照片 | 網路公開資料 |
| 數據量 | 一次一張 | 一次多個 |
| 效率 | 低 | 高 |
| 準確度 | 依賴照片品質 | 依賴網頁質量 |
| 覆蓋範圍 | 用戶所在地 | 全球網路 |
| 自動化程度 | 低 | 高 |

### 系統優勢：

✅ **全自動化**：無需手動上傳照片
✅ **高效批量**：一次處理多個店家
✅ **智能提取**：AI精準識別和提取
✅ **豐富資料**：自動獲取門面照、網站等
✅ **即時驗證**：即時驗證LINE活躍度
✅ **資料去重**：自動避免重複儲存
✅ **知識庫管理**：完整的管理和搜尋功能

## 🔧 技術細節

### 搜尋策略：

```typescript
// 多查詢並發搜尋
const searchQueries = [
  `${query} 花蓮縣 店家 電話 地址`,
  `${query} 花蓮 店 推薦`,
  `${query} Hualien store phone address`,
  `${query} 花蓮 美食餐廳`,
]
```

### 網頁讀取流程：

```typescript
// 1. 嘗試使用Web Reader API
const readerResult = await webReader.readWebPage({ url })

// 2. 如果失敗，降級使用fetch
const response = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0...',
  },
})
const html = await response.text()
```

### AI提取流程：

```typescript
// 1. 讀取網頁內容
const pageContent = await readWebPage(url)

// 2. 使用LLM提取資訊
const llmResult = await llm.chat.completions.create({
  messages: [
    {
      role: 'system',
      content: '你是店家資訊提取專家...',
    },
    {
      role: 'user',
      content: prompt, // 包含網頁內容
    },
  ],
  temperature: 0.1, // 低溫度提高準確度
})

// 3. 解析JSON結果
const storeInfo = JSON.parse(llmResult.content)
```

## 🎯 使用場景

1. **市場調研**：快速收集花蓮地區特定類型的店家
2. **競品分析**：分析競爭對手的店鋪資訊
3. **聯繫名單**：建立店家聯繫名單
4. **LINE推廣**：篩選LINE活躍的店家進行推廣
5. **地圖標記**：收集店家地址進行地圖標記

## 🚨 注意事項

1. **法律合規**：只爬取公開可訪問的資料
2. **使用限制**：遵守網站的robots.txt
3. **隱私保護**：不儲存個人敏感資訊
4. **API限制**：注意API調用頻率限制
5. **數據準確性**：人工驗證重要數據

## 🔮 未來擴展

- [ ] 支援地圖坐標提取
- [ ] 自動生成店家CSV導出
- [ ] 整合Google Maps API
- [ ] 自動定期更新店家資訊
- [ ] 多語言支援
- [ ] 店家評分和評論系統
- [ ] 自動發送LINE訊息功能

## 📝 開發說明

### 啟動開發服務器：

```bash
bun run dev
```

### 更新資料庫結構：

```bash
bun run db:push
```

### 代碼檢查：

```bash
bun run lint
```

## 🎉 總結

這個系統完全重新設計了店家資訊收集的方式，從手動上傳照片轉變為自動網路搜尋和爬取，大大提升了效率和數據量。通過整合多個AI技術（Web Search、Web Reader、LLM），實現了真正的全自動化流程。

用戶只需輸入關鍵字，系統就能自動完成：
- 搜尋 → 爬取 → 提取 → 驗證 → 儲存

這是一個**高效、智能、可擴展**的店家資訊管理系統！
