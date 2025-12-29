'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ShoppingCart,
  Plus,
  Search,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  DollarSign,
  Calendar,
  Phone,
  MapPin,
  Trash2
} from 'lucide-react'

// 統一的產品類型定義
interface Product {
  id: string
  name: string
  price: number
  cost: number
  capacity: string
  category: string
  isActive: boolean
  unit: string
}

interface CustomerGroup {
  id: string
  name: string
  discount: number
}

interface Customer {
  id: string
  name: string
  phone: string
  address: string
  group?: CustomerGroup
  groupId?: string | null
}

interface OrderItem {
  productId: string
  quantity: number
  productName?: string
  unitPrice?: number
  subtotal?: number
}

interface Order {
  id: string
  orderNo: string
  orderDate: string
  deliveryDate: string | null
  status: string
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  paidAmount: number
  note: string | null
  customer: Customer
  items: OrderItem[]
  checkId?: string | null
  check?: {
    id: string
    checkNo: string
    bankName: string
    amount: number
    status: string
  }
}

// 支票類型
interface Check {
  id: string
  checkNo: string
  bankName: string
  amount: number
  status: string
}

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [checks, setChecks] = useState<Check[]>([])  // 支票列表
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [formData, setFormData] = useState({
    customerId: '',
    deliveryDate: '',
    note: '',
    checkId: '__none__',  // 支票 ID
  })

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  // 載入資料
  const loadData = async () => {
    try {
      // 載入訂單
      const statusParam = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''
      const ordersRes = await fetch(`/api/orders${statusParam}${searchParam}`)
      if (ordersRes.ok) {
        setOrders(await ordersRes.json())
      }

      // 載入產品
      const productsRes = await fetch('/api/products')
      if (productsRes.ok) {
        setProducts(await productsRes.json())
      }

      // 載入客戶 (包含分組資料，用於計算折扣)
      const customersRes = await fetch('/api/customers')
      if (customersRes.ok) {
        const customersData = await customersRes.json()
        // 同時載入客戶分組資料
        const groupsRes = await fetch('/api/customer-groups')
        if (groupsRes.ok) {
          const groups = await groupsRes.json()
          // 將分組資料關聯到客戶
          const customersWithGroups = customersData.map((customer: any) => ({
            ...customer,
            group: groups.find((g: CustomerGroup) => g.id === customer.groupId),
          }))
          setCustomers(customersWithGroups)
        } else {
          setCustomers(customersData)
        }
      }

      // 載入可用支票（狀態為 pending 的支票）
      const checksRes = await fetch('/api/checks')
      if (checksRes.ok) {
        const allChecks = await checksRes.json()
        // 只顯示待處理的支票
        setChecks(allChecks.filter((c: Check) => c.status === 'pending'))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter, searchTerm])

  // 新增訂單項目
  const addOrderItem = () => {
    if (products.length > 0) {
      setOrderItems([
        ...orderItems,
        {
          productId: products[0].id,
          quantity: 1,
          productName: products[0].name,
          unitPrice: products[0].price,
          subtotal: products[0].price,
        },
      ])
    }
  }

  // 更新訂單項目
  const updateOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...orderItems]
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      newItems[index] = {
        ...newItems[index],
        productId: value,
        productName: product?.name,
        unitPrice: product?.price,
        subtotal: (product?.price || 0) * newItems[index].quantity,
      }
    } else if (field === 'quantity') {
      newItems[index] = {
        ...newItems[index],
        quantity: parseInt(value) || 0,
        subtotal: (newItems[index].unitPrice || 0) * (parseInt(value) || 0),
      }
    }
    setOrderItems(newItems)
  }

  // 刪除訂單項目
  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  // 計算訂單總金額 (包含客戶分組折扣)
  const calculateOrderTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0)

    // 獲取選中客戶的折扣
    const selectedCustomer = customers.find(c => c.id === formData.customerId)
    const discountRate = selectedCustomer?.group?.discount || 0
    const discount = subtotal * discountRate

    const deliveryFee = subtotal >= 2000 ? 0 : 50
    const total = subtotal - discount + deliveryFee

    return { subtotal, discount, discountRate, deliveryFee, total }
  }

  // 新增訂單
  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (orderItems.length === 0) {
      alert('請至少選擇一個產品')
      return
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          items: orderItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          deliveryDate: formData.deliveryDate || null,
          note: formData.note,
          checkId: formData.checkId === '__none__' ? null : formData.checkId || null,
        }),
      })

      if (response.ok) {
        setShowAddDialog(false)
        resetForm()
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || '新增訂單失敗')
      }
    } catch (error) {
      console.error('Error adding order:', error)
      alert('新增訂單失敗')
    }
  }

  // 更新訂單狀態
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        loadData()
      } else {
        alert('更新訂單狀態失敗')
      }
    } catch (error) {
      console.error('Error updating order:', error)
      alert('更新訂單狀態失敗')
    }
  }

  // 刪除訂單
  const deleteOrder = async (orderId: string) => {
    if (!confirm('確定要刪除此訂單嗎？庫存將會還原。')) return

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadData()
      } else {
        alert('刪除訂單失敗')
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      alert('刪除訂單失敗')
    }
  }

  // 重置表單
  const resetForm = () => {
    setFormData({ customerId: '', deliveryDate: '', note: '', checkId: '__none__' })
    setOrderItems([])
  }

  // 獲取狀態徽章
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
      pending: { label: '待處理', variant: 'secondary', icon: Clock },
      delivering: { label: '配送中', variant: 'default', icon: Truck },
      completed: { label: '已完成', variant: 'outline', icon: CheckCircle },
      cancelled: { label: '已取消', variant: 'destructive', icon: XCircle },
    }
    const config = statusConfig[status] || { label: status, variant: 'secondary', icon: Clock }
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const { subtotal, discount, discountRate, deliveryFee, total } = calculateOrderTotal()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">訂單管理</h2>
          <p className="text-gray-600">管理所有瓦斯訂單</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          新增訂單
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜尋訂單編號或客戶..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="篩選狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            <SelectItem value="pending">待處理</SelectItem>
            <SelectItem value="delivering">配送中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Order List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-purple-600" />
            訂單列表 ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500">載入中...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">尚無訂單資料</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {orders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{order.orderNo}</h3>
                            {getStatusBadge(order.status)}
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">客戶:</span>
                              <span>{order.customer.name}</span>
                              <Phone className="h-3 w-3" />
                              <span>{order.customer.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{order.customer.address}</span>
                            </div>
                            {order.deliveryDate && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>配送日期: {new Date(order.deliveryDate).toLocaleDateString('zh-TW')}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                <span>{order.items.length} 種商品</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span className="font-semibold text-gray-900">總額: NT${order.total.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'delivering')}
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              配送
                            </Button>
                          )}
                          {order.status === 'delivering' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'completed')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              完成
                            </Button>
                          )}
                          {order.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteOrder(order.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add Order Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增訂單</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddOrder} className="space-y-4">
            <div>
              <Label htmlFor="customer">
                客戶 *
                {customers.length === 0 && (
                  <span className="ml-2 text-xs text-amber-600 font-normal">(請先新增客戶)</span>
                )}
              </Label>
              {customers.length === 0 ? (
                <div className="w-full">
                  <div className="flex h-10 w-full items-center justify-center rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                    請先新增客戶
                  </div>
                  <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>請先到「客戶」頁面新增客戶資料</span>
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => {
                      // 導航到客戶管理 - 使用 props 傳入的方式
                      const event = new CustomEvent('navigateToCustomers')
                      window.dispatchEvent(event)
                      setShowAddDialog(false)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    前往新增客戶
                  </Button>
                </div>
              ) : (
                <>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                    required
                  >
                    <SelectTrigger id="customer">
                      <SelectValue placeholder="選擇客戶" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-sm">{customer.name}</span>
                            <span className="text-xs text-gray-500">{customer.phone}</span>
                            {customer.group && (
                              <span className="text-xs text-blue-600">
                                {customer.group.name} ({(customer.group.discount * 100).toFixed(0)}% 折)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.customerId && (
                    <p className="mt-1 text-xs text-gray-500">
                      已選擇: {customers.find(c => c.id === formData.customerId)?.name}
                    </p>
                  )}
                </>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">訂單項目 *</h4>
              <div className="space-y-2">
                {orderItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={item.productId}
                      onValueChange={(value) => updateOrderItem(index, 'productId', value)}
                      className="flex-1"
                      disabled={products.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={products.length === 0 ? "請先新增產品" : "選擇產品"} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.length === 0 ? (
                          <div className="p-2 text-center text-sm text-gray-500">
                            尚無產品資料
                            <br />
                            <span className="text-xs">請先到庫存管理新增產品</span>
                          </div>
                        ) : (
                          products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{product.name}</span>
                                <span className="text-xs text-gray-500">
                                  單價: NT${product.price} | 庫存: {product.capacity || '-'}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                      className="w-24"
                      placeholder="數量"
                      disabled={products.length === 0}
                    />
                    <div className="text-sm text-gray-600 w-32 text-right">
                      NT${(item.subtotal || 0).toLocaleString()}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOrderItem(index)}
                      disabled={orderItems.length === 1}
                    >
                      <XCircle className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addOrderItem} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  新增項目
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>小計:</span>
                  <span>NT${subtotal.toLocaleString()}</span>
                </div>
                {discountRate > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>折扣 ({(discountRate * 100).toFixed(0)}%):</span>
                    <span>-NT${discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>配送費:</span>
                  <span>{deliveryFee === 0 ? '免運費' : `NT${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>總計:</span>
                  <span className="text-emerald-600">NT${total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="deliveryDate">配送日期</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="check">關聯支票（可選）</Label>
              <Select
                value={formData.checkId}
                onValueChange={(value) => setFormData({ ...formData, checkId: value })}
              >
                <SelectTrigger id="check">
                  <SelectValue placeholder={
                    checks.length === 0
                      ? "沒有可用支票"
                      : "選擇支票（可選）"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <div className="flex flex-col">
                      <span className="font-medium">不使用支票</span>
                      <span className="text-xs text-gray-500">現金或其他付款方式</span>
                    </div>
                  </SelectItem>
                  {checks.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      沒有待處理的支票
                      <br />
                      <span className="text-xs">請先到支票管理新增支票</span>
                    </div>
                  ) : (
                    checks.map((check) => (
                      <SelectItem key={check.id} value={check.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{check.checkNo}</span>
                          <span className="text-xs text-gray-500">
                            {check.bankName} | NT${check.amount.toLocaleString()}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {checks.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">選擇支票後會自動關聯到本訂單</p>
              )}
              {checks.length === 0 && (
                <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                  <span>💡</span>
                  <span>如需使用支票付款，請先到支票管理新增</span>
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="note">備註</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAddDialog(false); resetForm() }}>
                取消
              </Button>
              <Button type="submit">確認訂單</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
