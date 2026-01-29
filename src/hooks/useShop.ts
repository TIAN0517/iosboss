import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// API 基礎配置
const API_BASE = '/api'

// 通用 fetch 函數
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '請求失敗' }))
    throw new Error(error.error || '請求失敗')
  }

  return response.json()
}

// ============ Cart Hooks ============

export interface CartItem {
  id: string
  productId: string
  quantity: number
  checked: boolean
  product: {
    id: string
    name: string
    price: number
    imageUrl: string | null
    inventory: { quantity: number } | null
  }
}

export interface CartSummary {
  itemCount: number
  checkedItemCount: number
  totalItems: number
  subtotal: number
}

export interface CartResponse {
  items: CartItem[]
  summary: CartSummary
}

// 獲取購物車
export function useCart(options?: { sessionId?: string; userId?: string }) {
  const { sessionId, userId } = options || {}

  return useQuery({
    queryKey: ['cart', { sessionId, userId }],
    queryFn: () => {
      const query = new URLSearchParams()
      if (sessionId) query.set('sessionId', sessionId)
      if (userId) query.set('userId', userId)
      return fetchAPI<CartResponse>(`/ecommerce/cart?${query}`)
    },
    refetchInterval: 30000, // 每 30 秒重新獲取
  })
}

// 新增商品到購物車
export function useAddToCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      productId: string
      quantity: number
      sessionId?: string
      userId?: string
    }) =>
      fetchAPI('/ecommerce/cart', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

// 更新購物車數量或勾選狀態
export function useUpdateCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      cartItemId: string
      quantity?: number
      checked?: boolean
    }) =>
      fetchAPI('/ecommerce/cart', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

// 從購物車移除商品
export function useRemoveFromCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (cartItemId: string) =>
      fetchAPI(`/ecommerce/cart?cartItemId=${cartItemId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

// 清空購物車
export function useClearCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: { sessionId?: string; userId?: string }) => {
      const { sessionId, userId } = options || {}
      // 先獲取所有購物車項目
      const query = new URLSearchParams()
      if (sessionId) query.set('sessionId', sessionId)
      if (userId) query.set('userId', userId)
      const response = await fetch(`${API_BASE}/ecommerce/cart?${query}`)
      const data: CartResponse = await response.json()

      // 逐一刪除
      await Promise.all(
        data.items.map((item) =>
          fetchAPI(`/ecommerce/cart?cartItemId=${item.id}`, {
            method: 'DELETE',
          })
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

// ============ Checkout Hooks ============

export interface CheckoutData {
  sessionId?: string
  userId?: string
  contactName: string
  contactPhone: string
  deliveryAddress: string
  deliveryTime?: 'morning' | 'afternoon' | 'evening'
  note?: string
  couponCode?: string
  paymentMethod?: 'cash' | 'transfer' | 'linepay'
}

export interface CheckoutResult {
  order: {
    id: string
    orderNo: string
    total: number
  }
  orderNo: string
  message: string
}

// 結帳
export function useCheckout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CheckoutData) =>
      fetchAPI<CheckoutResult>('/ecommerce/checkout', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['shop-orders'] })
    },
  })
}

// ============ Shop Order Hooks ============

export interface ShopOrder {
  id: string
  orderNo: string
  customerId: string | null
  guestName: string | null
  guestPhone: string | null
  guestEmail: string | null
  guestAddress: string | null
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  status: string
  paymentMethod: string | null
  paymentAt: Date | null
  contactName: string | null
  contactPhone: string | null
  deliveryAddress: string | null
  deliveryTime: string | null
  note: string | null
  createdAt: Date
  updatedAt: Date
  items: ShopOrderItem[]
}

export interface ShopOrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  productImage: string | null
  quantity: number
  unitPrice: number
  subtotal: number
}

// 獲取商城訂單列表
export function useShopOrders(params?: {
  page?: number
  limit?: number
  status?: string
  userId?: string
}) {
  const { page = 1, limit = 20, status, userId } = params || {}

  return useQuery({
    queryKey: ['shop-orders', { page, limit, status, userId }],
    queryFn: () => {
      const query = new URLSearchParams()
      query.set('page', page.toString())
      query.set('limit', limit.toString())
      if (status) query.set('status', status)
      if (userId) query.set('userId', userId)
      return fetchAPI<{ data: ShopOrder[]; pagination: any }>(
        `/ecommerce/orders?${query}`
      )
    },
  })
}

// 獲取單一訂單詳情
export function useShopOrder(orderNo: string) {
  return useQuery({
    queryKey: ['shop-order', orderNo],
    queryFn: () => fetchAPI<ShopOrder>(`/ecommerce/orders/${orderNo}`),
    enabled: !!orderNo,
  })
}

// 更新訂單狀態（管理員）
export function useUpdateShopOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { orderNo: string; status: string }) =>
      fetchAPI('/ecommerce/orders', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-orders'] })
      queryClient.invalidateQueries({ queryKey: ['shop-order'] })
    },
  })
}

// ============ Coupon Hooks ============

export interface Coupon {
  id: string
  code: string
  type: string
  value: number
  minOrder: number
  maxDiscount: number | null
  isActive: boolean
  expiresAt: Date | null
}

// 驗證優惠券
export function useValidateCoupon() {
  return useMutation({
    mutationFn: (data: { code: string; cartAmount: number }) =>
      fetchAPI<{ valid: boolean; coupon?: Coupon; discount?: number }>(
        '/ecommerce/coupons/validate',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),
  })
}

// ============ Product Review Hooks ============

export interface ProductReview {
  id: string
  productId: string
  userId: string | null
  orderId: string | null
  rating: number
  content: string | null
  images: string[]
  isVerified: boolean
  createdAt: Date
}

// 獲取商品評論
export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () =>
      fetchAPI<ProductReview[]>(
        `/ecommerce/products/reviews?productId=${productId}`
      ),
    enabled: !!productId,
  })
}

// 發表評論
export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      productId: string
      rating: number
      content?: string
    }) =>
      fetchAPI('/ecommerce/products/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['product-reviews', variables.productId],
      })
    },
  })
}
