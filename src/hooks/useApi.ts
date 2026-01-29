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

// ============ Customers ============

export function useCustomers(params?: { page?: number; limit?: number; search?: string; groupId?: string }) {
  const { page = 1, limit = 50, search, groupId } = params || {}

  return useQuery({
    queryKey: ['customers', { page, limit, search, groupId }],
    queryFn: () => {
      const query = new URLSearchParams()
      query.set('page', page.toString())
      query.set('limit', limit.toString())
      if (search) query.set('search', search)
      if (groupId) query.set('groupId', groupId)

      return fetchAPI<{ data: any[]; pagination: any }>(`/customers?${query}`)
    },
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => fetchAPI<any>(`/customers/${id}`),
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) =>
      fetchAPI('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchAPI(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// ============ Orders ============

export function useOrders(params?: { page?: number; limit?: number; status?: string; customerId?: string }) {
  const { page = 1, limit = 20, status, customerId } = params || {}

  return useQuery({
    queryKey: ['orders', { page, limit, status, customerId }],
    queryFn: () => {
      const query = new URLSearchParams()
      query.set('page', page.toString())
      query.set('limit', limit.toString())
      if (status) query.set('status', status)
      if (customerId) query.set('customerId', customerId)

      return fetchAPI<{ data: any[]; pagination: any }>(`/orders?${query}`)
    },
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchAPI<any>(`/orders/${id}`),
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) =>
      fetchAPI('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchAPI(`/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/orders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

// ============ Inventory ============

export function useInventory(params?: { lowStock?: boolean; page?: number; limit?: number }) {
  const { lowStock, page = 1, limit = 50 } = params || {}

  return useQuery({
    queryKey: ['inventory', { lowStock, page, limit }],
    queryFn: () => {
      const query = new URLSearchParams()
      query.set('page', page.toString())
      query.set('limit', limit.toString())
      if (lowStock) query.set('lowStock', 'true')
      return fetchAPI<{ data: any[]; pagination: any }>(`/inventory?${query}`)
    },
  })
}

export function useUpdateInventory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) =>
      fetchAPI('/inventory', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

// ============ Products ============

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => fetchAPI<any[]>('/products'),
  })
}

// ============ Customer Groups ============

export function useCustomerGroups() {
  return useQuery({
    queryKey: ['customer-groups'],
    queryFn: () => fetchAPI<any[]>('/customer-groups'),
  })
}

// ============ Staff ============

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: () => fetchAPI<any[]>('/staff'),
  })
}

// ============ Costs ============

export function useCosts(params?: { page?: number; limit?: number }) {
  const { page = 1, limit = 50 } = params || {}

  return useQuery({
    queryKey: ['costs', { page, limit }],
    queryFn: () => {
      const query = new URLSearchParams()
      query.set('page', page.toString())
      query.set('limit', limit.toString())
      return fetchAPI<{ data: any[]; pagination: any }>(`/costs?${query}`)
    },
  })
}

// ============ Reports ============

export function useMonthlyReports(month: string) {
  return useQuery({
    queryKey: ['monthly-reports', month],
    queryFn: () => fetchAPI<any[]>(`/monthly?month=${month}`),
    enabled: !!month,
  })
}
