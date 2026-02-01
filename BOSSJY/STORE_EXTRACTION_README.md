# 店家資訊智能擷取工具

## 功能概述

這是一個專為台灣花蓮縣設計的AI驅動店家資訊擷取工具，能夠自動識別照片中的店家資訊並驗證LINE活躍度。

## 主要功能

### 1. 📸 智能照片分析
- 上傳或拍攝店家照片
- AI自動識別店家名稱、電話號碼、地址
- 詳細的招牌描述和地點識別

### 2. 📱 LINE活躍度驗證
- 驗證電話號碼在LINE上是否活躍
- 提供驗證證據和可信度評估
- 智能推薦聯繫方式

### 3. 💾 店家資訊管理
- 儲存和管理所有擷取的店家資訊
- 快速搜尋和篩選
- 支援花蓮縣地區店家

### 4. 🔍 搜尋功能
- 按店家名稱搜尋
- 按地址搜尋
- 按電話號碼搜尋
- 篩選LINE活躍店家

## 技術架構

### 前端
- Next.js 16 with App Router
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui 組件庫

### 後端
- Next.js API Routes
- Prisma ORM (SQLite)
- z-ai-web-dev-sdk (VLM + Search)

### AI能力
- **VLM (Vision Language Model)**: 圖片理解和資訊提取
- **Web Search**: LINE活躍度驗證
- **優化提示詞**: 針對台灣花蓮地區和電話號碼識別

## 資料庫模型

### Store (店家)
```typescript
{
  id: string
  name: string
  address: string?
  phoneNumber: string?
  signboard: string?
  photoUrl: string?
  analysisResult: string?  // JSON string
  location: string?  // 例如: "花蓮縣"
  lineActive: boolean?
  lineVerifiedAt: DateTime?
  createdAt: DateTime
  updatedAt: DateTime
}
```

### PhoneNumberVerification (電話驗證記錄)
```typescript
{
  id: string
  phoneNumber: string
  lineActive: boolean?
  verifiedAt: DateTime
  notes: string?
  createdAt: DateTime
}
```

## API端點

### 1. 圖片分析
```
POST /api/extract-store-info
Content-Type: multipart/form-data

Body:
- image: File (店家照片)

Response:
{
  "success": true,
  "data": {
    "name": "店家名稱",
    "phoneNumber": "0912-345-678",
    "address": "花蓮市中山路一段123號",
    "signboard": "招牌描述",
    "location": "台灣花蓮縣"
  }
}
```

### 2. LINE活躍度驗證
```
POST /api/verify-line
Content-Type: application/json

Body:
{
  "phoneNumber": "0912-345-678",
  "storeName": "店家名稱",
  "storeData": {...}
}

Response:
{
  "success": true,
  "lineActive": true,
  "confidence": "high",
  "evidence": "驗證證據",
  "recommendation": "建議"
}
```

### 3. 店家列表 (GET)
```
GET /api/stores?search=關鍵字&location=花蓮縣&lineActive=true

Response:
{
  "success": true,
  "stores": [...]
}
```

### 4. 創建店家 (POST)
```
POST /api/stores
Content-Type: application/json

Body: {
  "name": "店家名稱",
  "address": "地址",
  "phoneNumber": "電話",
  "signboard": "招牌描述",
  "location": "地點",
  "lineActive": true
}
```

### 5. 店家詳情 (GET)
```
GET /api/stores/{id}
```

### 6. 更新店家 (PUT)
```
PUT /api/stores/{id}
Content-Type: application/json
Body: {...}
```

### 7. 刪除店家 (DELETE)
```
DELETE /api/stores/{id}
```

## 使用流程

1. **上傳照片**: 選擇或拍攝包含店家招牌和電話的照片
2. **AI分析**: 系統使用VLM識別店家資訊
3. **驗證LINE**: 點擊"驗證LINE活躍度"按鈕
4. **儲存店家**: 將分析結果儲存到資料庫
5. **搜尋管理**: 在店家列表中搜尋和管理

## AI提示詞優化

### 店家分析提示詞特點:
- 專注於台灣花蓮地區店家
- 強調電話號碼識別的精準度
- 支援繁體中文識別
- 詳細的招牌描述要求

### LINE驗證提示詞特點:
- 保守的驗證策略（寧可假陰性，不可假陽性）
- 提供置信度評估
- 詳細的證據說明
- 可行的建議

## 使用建議

1. **照片品質**:
   - 確保招牌文字清晰可見
   - 避免反光和陰影
   - 盡量包含完整的店鋪外觀

2. **電話號碼**:
   - 系統會自動識別台灣電話格式
   - 手機: 09xx-xxx-xxx
   - 市話: 03-xxx-xxxx (花蓮)

3. **LINE驗證**:
   - 驗證結果僅供參考
   - 建議直接聯繫店家確認
   - 活躍度可能隨時間變化

## 擴展功能

可以考慮添加以下功能：
- 批量上傳和分析
- 地圖視圖展示店家位置
- 導出店家資料（CSV/Excel）
- LINE自動發送訊息功能
- 店家評分和評論系統
- 多語言支援

## 開發說明

### 啟動開發服務器
```bash
bun run dev
```

### 更新資料庫結構
```bash
bun run db:push
```

### 代碼檢查
```bash
bun run lint
```

## 技術限制

- LINE活躍度驗證依賴於網路搜尋結果，可能不完全準確
- VLM識別準確度受照片品質影響
- 需要設定 `ZAI_API_KEY` 環境變數

## 聯絡與支援

如有問題或建議，請透過專案Issue提出。

---

**注意**: 本工具僅用於資訊收集目的，請確保遵守當地法律法規和隱私政策。
