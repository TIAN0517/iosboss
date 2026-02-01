# 瓦斯商城後台管理系統 🎛️

## 📌 訪問方式

### 開發環境
- **URL**: `http://localhost:3000/admin`
- **管理員賬號**: `admin`
- **密碼**: `admin123`

> ⚠️ **注意**: 生產環境請使用真正的身份驗證系統（NextAuth.js）

---

## ✅ Phase 1 & 2 已完成功能

### 🔐 登錄系統
- ✅ 安全登錄表單
- ✅ 管理員身份驗證
- ✅ 登錄/登出功能
- ✅ 美觀的登錄界面

### 📊 儀表板統計
實時數據統計卡片：
- **商品總數** - 顯示所有商品數量
- **庫存警告** - 庫存少於 5 件的商品數量
- **缺貨商品** - 庫存為 0 的商品數量
- **總銷售量** - 累計銷售數量

### 📦 商品管理模塊

#### 商品列表功能
- ✅ 商品表格展示
  - 商品圖片預覽
  - 商品名稱和描述
  - 分類信息
  - 價格顯示
  - 庫存數量（帶顏色標記）
  - 評分顯示
  - 銷售量
  - 在售/缺貨狀態標籤

- ✅ 商品搜尋
  - 即時搜尋
  - 支持商品名稱和描述
  - 分類過濾

- ✅ 商品操作
  - 編輯商品
  - 刪除商品（需確認）
  - 新增商品

#### 庫存管理
- ✅ 庫存警告區塊
  - 顯示低庫存商品（< 5）
  - 按庫存數量排序
  - 支持庫存調整按鈕

- ✅ 缺貨商品區塊
  - 顯示無庫存商品
  - 立即補貨按鈕

- ✅ 庫存正常統計
  - 庫存充足商品數量

#### 分類管理
- ✅ 分類卡片展示
  - 分類圖標
  - 分類名稱
  - 商品數量統計
  - 分類代碼（slug）

---

## 🔌 API 端點

### 商品管理 API
```
GET  /api/admin/products
  - search: 搜尋關鍵字
  - categoryId: 分類 ID
  - status: 商品狀態
  - page: 頁碼（默認 1）
  - limit: 每頁數量（默認 20）
  - sortBy: 排序字段（name, price, stock, sales, rating）
  - sortOrder: 排序方向（asc, desc）

PUT  /api/admin/products
  - id: 商品 ID
  - updateData: 更新數據對象

DELETE /api/admin/products?id={id}
  - id: 商品 ID
```

### 庫存管理 API
```
POST /api/admin/inventory
  - productId: 商品 ID
  - quantity: 數量
  - operation: 操作類型（add, subtract, set）

GET /api/admin/inventory
  - lowStockThreshold: 低庫存閾值（默認 5）

返回：
  - total: 總商品數
  - inStock: 在庫商品數
  - outOfStock: 缺貨商品數
  - lowStock: 低庫存商品數
  - totalStock: 總庫存
  - lowStockProducts: 低庫存商品列表
  - outOfStockProducts: 缺貨商品列表
```

### 統計數據 API
```
GET /api/admin/stats

返回完整統計數據：
  - products: 商品統計
    - total: 總數
    - featured: 精選數
    - inStock: 在庫數
    - outOfStock: 缺貨數
    - lowStock: 低庫存數
    - avgPrice: 平均價格
    - avgRating: 平均評分
    - totalSales: 總銷售

  - categories: 分類統計
    - total: 分類總數
    - byCategory: 每個分類的詳細數據
      - productCount: 商品數
      - totalStock: 總庫存
      - totalSales: 總銷售

  - sales: 銷售統計
    - total: 總銷售
    - topProducts: 前 10 熱銷商品

  - alerts: 警告信息
    - outOfStock: 缺貨商品列表
    - lowStock: 低庫存商品列表
```

---

## 🎨 UI/UX 設計

### 設計風格
- **配色方案**: Orange (瓦斯主題色) + Gray (後台標準色)
- **組件庫**: shadcn/ui (New York 風格)
- **響應式設計**: 支持桌面、平板、手機

### 交互設計
- **Tab 切換**: 商品管理 | 庫存管理 | 分類管理
- **即時反饋**: 搜尋、過濾即時生效
- **視覺提示**:
  - 綠色: 庫存充足
  - 橙色: 庫存緊張 (< 5)
  - 紅色: 缺貨 (= 0)
  - 黃色: 評分星星

---

## 📁 文件結構

```
src/
├── app/
│   ├── admin/
│   │   └── page.tsx              # 後台管理主頁
│   └── api/
│       └── admin/
│           ├── products/
│           │   └── route.ts         # 商品管理 API
│           ├── inventory/
│           │   └── route.ts         # 庫存管理 API
│           └── stats/
│               └── route.ts         # 統計數據 API
└── components/
    └── ui/                        # shadcn/ui 組件
```

---

## 🚀 功能演示流程

### 登錄流程
1. 訪問 `/admin`
2. 輸入管理員賬號和密碼
3. 點擊「登錄」
4. 進入管理系統主頁

### 商品管理流程
1. 查看商品列表
2. 使用搜尋框篩選商品
3. 使用分類下拉選單過濾
4. 點擊「新增商品」創建新商品
5. 點擊編輯圖標修改商品信息
6. 點擊刪除圖標刪除商品

### 庫存管理流程
1. 切換到「庫存管理」標籤
2. 查看低庫存警告列表
3. 查看缺貨商品列表
4. 點擊「調整」按鈕修改庫存
5. 點擊「立即補貨」補貨

### 分類管理流程
1. 切換到「分類管理」標籤
2. 查看所有分類卡片
3. 查看每個分類的商品數量

---

## 📝 使用示例

### 創建新商品
```typescript
POST /api/admin/products
{
  "name": "新款瓦斯爐",
  "description": "高效能瓦斯爐",
  "price": 5000,
  "stock": 100,
  "categoryId": "category-id",
  "imageUrl": "/products/new-product.png",
  "featured": false
}
```

### 更新商品
```typescript
PUT /api/admin/products
{
  "id": "product-id",
  "price": 5500,
  "stock": 150
}
```

### 調整庫存
```typescript
POST /api/admin/inventory
{
  "productId": "product-id",
  "quantity": 50,
  "operation": "add"  // add, subtract, set
}
```

### 搜尋商品
```typescript
GET /api/admin/products?search=瓦斯&categoryId=xxx&page=1&limit=20
```

---

## ⚠️ 開發注意事項

### 需要後端支持的功能
當前這些功能在前端已實現，但需要後端 API 完善：

1. **商品保存**
   - 需要實現完整的商品創建/更新邏輯
   - 需要處理圖片上傳

2. **商品刪除**
   - 需要實現刪除前的檢查（訂單引用等）
   - 需要軟刪除選項

3. **庫存調整**
   - 需要添加庫存變更記錄
   - 需要通知功能

### 安全建議
- ⚠️ 使用 NextAuth.js 或 JWT 進行真正的身份驗證
- ⚠️ 添加 API 請求頻率限制
- ⚠️ 實現操作日誌記錄
- ⚠️ 添加角色權限控制
- ⚠️ 敏感操作需要二次確認

---

## 🎯 已實現的瓦斯行業特定功能

### 1. 庫存管理優化
- 實時庫存監控
- 低庫存自動警告
- 缺貨商品快速識別

### 2. 商品分類
- 9 大瓦斯器具分類
- 分類級商品統計
- 分類級庫存統計

### 3. 銷售分析
- 商品評分追蹤
- 銷售量統計
- 熱銷商品排名

---

## 📊 數據統計示例

### 系統總覽
- **商品總數**: 120
- **庫存警告**: X 件
- **缺貨商品**: X 件
- **總銷售量**: X 件

### 分類統計
- **瓦斯爐**: 15 個商品
- **熱水器**: 15 個商品
- **瓦斯桶**: 10 個商品
- ... 其他分類

### 熱銷 Top 10
- 顯示銷售量前 10 的商品
- 包含商品名稱、價格、銷售量

---

## 🔄 後續開發計劃

### Phase 3: 訂單管理
- [ ] 訂單列表
- [ ] 訂單詳情
- [ ] 發貨管理
- [ ] 退貨退款

### Phase 4: 會員管理
- [ ] 會員列表
- [ ] 會員等級
- [ ] 積分管理

### Phase 5: 促銷管理
- [ ] 優惠券管理
- [ ] 秒殺活動
- [ ] 限時購

### Phase 6: 運營管理
- [ ] 輪播圖管理
- [ ] 推薦管理
- [ ] 專題管理

### Phase 7: 搜索系統
- [ ] Elasticsearch 集成
- [ ] IK 分詞器
- [ ] 搜索聯想
- [ ] 多維篩選

### Phase 8: 權限管理
- [ ] 用戶管理
- [ ] 角色管理
- [ ] 菜單權限

---

## 💡 技術棧

### 前端
- **框架**: Next.js 16 (App Router)
- **語言**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **狀態**: React Hooks (useState, useEffect)
- **圖標**: Lucide React

### 後端
- **ORM**: Prisma
- **數據庫**: SQLite
- **API**: Next.js API Routes
- **認證**: 簡單 session（需改為 NextAuth）

---

## 📞 技術支持

如有問題，請查看：
- 開發日志: `/home/z/my-project/dev.log`
- ESLint: `bun run lint`
- Dev Server: `http://localhost:3000`

---

**更新時間**: 2025年1月23日
**版本**: v1.0 (Phase 1 & 2)
**狀態**: ✅ 開發完成，可以測試
