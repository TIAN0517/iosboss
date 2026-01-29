import { z } from 'zod'

// ============ 商城相關驗證 ============

// 購物車新增項目
export const cartItemSchema = z.object({
  productId: z.string().min(1, '請選擇產品'),
  quantity: z.number().int().min(1, '數量必須大於0'),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
})

// 結帳資料
export const checkoutSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  contactName: z.string().min(1, '聯絡人姓名為必填'),
  contactPhone: z.string().min(1, '聯絡電話為必填'),
  deliveryAddress: z.string().min(1, '配送地址為必填'),
  deliveryTime: z.enum(['morning', 'afternoon', 'evening']).optional(),
  note: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(['cash', 'transfer', 'linepay']).default('cash'),
})

// 商城訂單更新
export const shopOrderUpdateSchema = z.object({
  orderNo: z.string().min(1, '訂單編號為必填'),
  status: z.enum(['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled']),
})

// 商品評論
export const productReviewSchema = z.object({
  productId: z.string().min(1, '請選擇產品'),
  rating: z.number().int().min(1, '評分至少1分').max(5, '評分最高5分'),
  content: z.string().optional(),
})

// 優惠券驗證
export const couponValidateSchema = z.object({
  code: z.string().min(1, '優惠券代碼為必填'),
  cartAmount: z.number().min(0, '消費金額不能為負數'),
})

// ============ 現有驗證 ============

// 客戶表單驗證
export const customerSchema = z.object({
  name: z.string().min(1, '客戶名稱為必填項'),
  phone: z
    .string()
    .min(1, '電話為必填項')
    .regex(/^09\d{8}$/, '電話格式錯誤，請輸入09開頭的10位數字'),
  address: z.string().min(1, '地址為必填項'),
  paymentType: z.enum(['cash', 'monthly']),
  groupId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  creditLimit: z.number().min(0, '信用額度不能為負數').optional(),
})

// 訂單項目驗證
export const orderItemSchema = z.object({
  productId: z.string().min(1, '請選擇產品'),
  quantity: z.number().int().min(1, '數量必須大於0'),
  price: z.number().min(0, '價格不能為負數'),
})

// 訂單表單驗證
export const orderSchema = z.object({
  customerId: z.string().min(1, '請選擇客戶'),
  items: z.array(orderItemSchema).min(1, '至少需要一個訂單項目'),
  deliveryAddress: z.string().optional(),
  note: z.string().optional(),
})

// 員工表單驗證
export const staffSchema = z.object({
  username: z.string().min(3, '用戶名至少需要3個字符').max(50),
  name: z.string().min(1, '姓名為必填項'),
  email: z.string().email('Email格式錯誤').optional().or(z.literal('')),
  phone: z.string().regex(/^09\d{8}$/, '電話格式錯誤').optional().or(z.literal('')),
  role: z.enum(['admin', 'manager', 'staff', 'driver']),
  department: z.string().optional(),
})

// 成本記錄驗證
export const costSchema = z.object({
  type: z.string().min(1, '請選擇類型'),
  category: z.string().min(1, '請選擇類別'),
  amount: z.number().positive('金額必須大於0'),
  description: z.string().min(1, '說明為必填項'),
  date: z.string().optional(),
})

// 庫存調整驗證
export const inventorySchema = z.object({
  productId: z.string().min(1, '請選擇產品'),
  quantity: z.number().int().min(0, '數量不能為負數'),
  type: z.string().min(1, '請選擇調整類型'),
  reason: z.string().optional(),
})

// 通用搜索參數
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// 導出類型推導
export type CustomerFormData = z.infer<typeof customerSchema>
export type OrderFormData = z.infer<typeof orderSchema>
export type StaffFormData = z.infer<typeof staffSchema>
export type CostFormData = z.infer<typeof costSchema>
export type InventoryFormData = z.infer<typeof inventorySchema>
