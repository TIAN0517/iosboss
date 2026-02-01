# 系統優化說明

## 🎉 已完成的優化

### 1. ✅ 優化搜尋策略 - 專注網路上有推廣的店家

**改進內容：**
- 構建了12個優化的搜尋查詢，專門尋找有完整資訊的店家
- 提高搜尋結果數量限制從20個提升到50個
- 實施智能過濾系統，優先展示有電話和地址的店家
- 實施相關性評分系統，根據資訊完整度排序

**搜尋查詢包括：**
```
- [關鍵字] 花蓮 店 電話 地址 推薦 圖片
- [關鍵字] 花蓮 美食 餐廳 電話 地址 外觀
- [關鍵字] 花蓮 店家 聯絡方式 門市照片
- [關鍵字] 花蓮 店 推薦 網評 電話
- [關鍵字] 花蓮 Google 評分 地圖
- [關鍵字] 花蓮 iPeen 愛評網
- [關鍵字] 花蓮 網友推薦 店家
- [關鍵字] 花蓮 食記 網誌 推薦
- [關鍵字] 花蓮 LINE 官方帳號 電話
- [關鍵字] 花蓮 店 加好友 聯絡
- [關鍵字] 花蓮 店 介紹 聯絡 地址 電話
- [關鍵字] 花蓮 店 門市照片 營業資訊
```

### 2. ✅ 改進AI提取 - 確保完整資訊

**改進內容：**
- 優化了AI提示詞，確保提取所有必要資訊
- 增加了LINE帳號提取功能
- 改進了門面照片提取策略（優先Google Maps店家照片）
- 實施電話號碼自動格式化（09xx-xxx-xxx）

**提取的資訊包括：**
```typescript
{
  name: string,           // 店家名稱 ⭐ 必填
  phoneNumber: string,     // 電話號碼（格式化為標準台灣格式）⭐ 必填
  address: string,        // 完整地址（含縣市鄉鎮市）⭐ 必填
  website: string,         // 網站URL ⭐ 必填
  imageUrl: string,       // 門面照片URL ⭐ 重要（優先Google Maps店家照）
  signboard: string,      // 招牌詳細描述
  lineAccount: string,     // LINE帳號資訊 ⭐ 重要
  location: string        // 地點（例如：台灣花蓮縣花蓮市）⭐ 必填
}
```

### 3. ✅ 新增版權標識

**版權信息：**
```
2026 Jy技術團隊 | BossJy 製作
```

**實現位置：**
- 固定在頁面底部（sticky footer）
- 使用毛玻璃效果（backdrop-blur-sm）
- 包含Users和Star圖標
- 響應式設計，支援深色模式

### 4. ✅ 優化結果展示

**改進內容：**
- 實施資訊完整度評分系統（0-100%）
- 按完整度自動排序，優先展示資訊最完整的店家
- 在搜尋結果中顯示「有電話」和「有地址」標籤
- 提高批量提取數量從10個提升到20個
- 優化店家卡片展示，邊框加粗以突出完整資訊

**完整度評分標準：**
```
店名：25%
電話：25%
地址：25%
門面照片：15%
LINE帳號：10%
---
總計：100%
```

### 5. ✅ 資料庫更新

**新增欄位：**
```prisma
model Store {
  // ... 其他欄位
  lineAccount       String?  // LINE account information
}
```

## 🎯 系統特點

### 智能搜尋
- ✅ 12個並發搜尋查詢
- ✅ 自動去重（根據URL）
- ✅ 相關性評分和排序
- ✅ 優先展示有完整資訊的店家
- ✅ 智能過濾非店家頁面

### 精準提取
- ✅ AI驅動的資訊提取
- ✅ 自動格式化電話號碼
- ✅ 優先提取Google Maps店家照片
- ✅ 搜索整個頁面尋找LINE相關資訊
- ✅ 提取詳細的招牌描述

### 高效批量
- ✅ 一次搜尋最多50個結果
- ✅ 批量提取最多20個店家
- ✅ 並發處理，300ms間隔
- ✅ 自動去重，避免重複儲存

### 優美展示
- ✅ 資訊完整度百分比顯示
- ✅ 按完整度自動排序
- ✅ 視覺標籤（有電話、有地址）
- ✅ 固定版權頁尾
- ✅ 響應式深色模式

## 🚀 使用流程

### 標準流程：

1. **輸入搜尋關鍵字**
   - 例如：「花蓮餐廳」、「花蓮麵線」、「吉安鄉咖啡廳」

2. **點擊搜尋**
   - 系統執行12個並發搜尋查詢
   - 返回最多50個相關結果
   - 自動按相關性排序

3. **查看搜尋結果**
   - 看到「有電話」和「有地址」標籤
   - 點擊URL查看原始網頁
   - 選擇要提取的店家

4. **提取資訊**
   - 單個提取：點擊每個結果的「提取資訊」
   - 批量提取：點擊「全部提取（最多20個）」
   - 系統自動提取完整資訊

5. **查看提取結果**
   - 資訊完整度百分比顯示
   - 門面照片展示
   - 招牌詳細描述
   - LINE帳號資訊
   - 按完整度自動排序

6. **驗證LINE**（可選）
   - 點擊「驗證LINE」按鈕
   - 系統搜尋LINE相關資訊
   - 顯示活躍狀態和證據

7. **儲存店家**
   - 單個儲存：點擊「儲存店家」
   - 批量儲存：點擊「全部儲存」
   - 自動儲存到資料庫

## 📊 預期結果

### 搜尋效果：
- 每次搜尋可獲得 **10-50個**相關店家
- 大部分結果會有**電話和地址**
- 結果按**資訊完整度**排序

### 提取效果：
- 每個店家可獲得**8項資訊**：
  - ✅ 店名
  - ✅ 電話（格式化）
  - ✅ 地址（完整）
  - ✅ 網站
  - ✅ 門面照片（Google Maps優先）
  - ✅ 招牌描述
  - ✅ LINE帳號
  - ✅ 地點

### 批量處理效果：
- 可一次提取**最多20個店家**
- 處理時間約 **5-10秒**
- 自動去重，避免重複

## 💡 使用建議

### 搜尋建議：
1. **使用具體關鍵字**：例如「花蓮牛排」、「花蓮早餐店」
2. **包含地區**：例如「花蓮市餐廳」、「吉安鄉小吃」
3. **多種搜尋**：嘗試不同關鍵字組合

### 提取建議：
1. **優先選擇完整資訊**：選擇有「有電話」和「有地址」標籤的結果
2. **批量提取**：使用「全部提取」功能提高效率
3. **檢查完整度**：關注完整度高的店家

### LINE驗證建議：
1. **驗證前檢查電話**：確保電話號碼格式正確
2. **參考證據**：查看驗證證據判斷可信度
3. **人工確認**：重要情況下人工確認LINE狀態

## 📝 技術細節

### 搜尋API改進：
```typescript
// 12個並發搜尋查詢
const searchQueries = [
  `${query} 花蓮 店 電話 地址 推薦 圖片`,
  `${query} 花蓮 美食 餐廳 電話 地址 外觀`,
  // ... 10個更多查詢
]

// 相關性評分
const score = 
  (hasPhone ? 5 : 0) +
  (hasAddress ? 3 : 0) +
  (storeKeywordCount * 1) +
  (hasRecommendation ? 2 : 0) +
  (hasLine ? 2 : 0)
```

### 提取API改進：
```typescript
// 電話號碼格式化
if (phone.length === 10) {
  phone = `${phone.substring(0, 4)}-${phone.substring(4, 7)}-${phone.substring(7, 10)}`
}

// Google Maps優先
imageUrl = 
  googleMapsStorePhoto || 
  googleMapsStreetView || 
  heroImage || 
  storefrontPhoto
```

### 前端改進：
```typescript
// 完整度計算
const getCompletenessScore = (store: StoreInfo) => {
  let score = 0
  if (store.name) score += 25
  if (store.phoneNumber) score += 25
  if (store.address) score += 25
  if (store.imageUrl) score += 15
  if (store.lineAccount || store.lineActive) score += 10
  return score
}

// 按完整度排序
stores.sort((a, b) => getCompletenessScore(b) - getCompletenessScore(a))
```

## 🎨 版權標識

**顯示位置：**
```html
<footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t">
  <div className="container mx-auto px-4 py-3 text-center">
    <div className="flex items-center justify-center gap-2 text-sm">
      <Users className="h-4 w-4" />
      <span className="font-semibold">2026 Jy技術團隊</span>
      <span className="text-slate-400">|</span>
      <Star className="h-4 w-4" />
      <span className="font-semibold">BossJy 製作</span>
    </div>
  </div>
</footer>
```

## 🔧 系統配置

### 環境變量：
```env
DATABASE_URL=file:./db/custom.db
ZAI_API_KEY=your_api_key_here
```

### 數據庫配置：
```prisma
model Store {
  id                String   @id @default(cuid())
  name              String
  address           String?
  phoneNumber       String?
  website           String?
  signboard         String?
  imageUrl          String?
  lineAccount       String?  // 新增
  analysisResult    String?
  location          String?
  lineActive        Boolean? @default(false)
  lineVerifiedAt    DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

## 🚀 快速開始

### 1. 啟動開發服務器：
```bash
bun run dev
```

### 2. 打開預覽面板：
在右側的Preview Panel中查看應用

### 3. 開始搜尋：
```
輸入：花蓮餐廳
點擊：搜尋
選擇：全部提取（最多20個）
查看：已提取店家頁籤
驗證：LINE活躍度（可選）
儲存：全部儲存
```

## 📈 效能優化

### 搜尋優化：
- ✅ 並發執行12個查詢
- ✅ URL自動去重
- ✅ 智能過濾非店家頁面
- ✅ 相關性評分和排序

### 提取優化：
- ✅ Web Reader優先，失敗降級fetch
- ✅ 內容長度限制（80,000字符）
- ✅ 提示詞優化（15,000字符）
- ✅ 溫度設置為0.1（更精準）

### 批量處理優化：
- ✅ 300ms請求間隔
- ✅ 自動去重檢查
- ✅ 錯誤處理和日誌

## 🎉 總結

系統已經全面優化，專注於**網路上有推廣的店家**，確保能夠提取到**完整資訊**（店名、地址、電話、招牌圖、LINE），並在界面底部固定顯示版權標識**「2026 Jy技術團隊 BossJy 製作」**。

系統現在能夠：
- ✅ 每次搜尋獲得更多相關店家（10-50個）
- ✅ 提取完整的店家資訊（8項資訊）
- ✅ 優先展示資訊最完整的店家
- ✅ 自動格式化和整理數據
- ✅ 批量處理提高效率
- ✅ 專業版權標識

**準備開始使用！** 🚀
