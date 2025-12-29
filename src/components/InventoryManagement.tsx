'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IOSButton } from '@/components/ui/ios-button'
import { IOSInput } from '@/components/ui/ios-input'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpDown,
  History
} from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface Product {
  id: string
  name: string
  category: string
  capacity: string
  price: number
}

interface Inventory {
  id: string
  productId: string
  quantity: number
  minStock: number
  lastRestocked: Date
  product: Product
}

interface InventoryTransaction {
  id: string
  productId: string
  type: 'purchase' | 'sale' | 'return' | 'adjustment'
  quantity: number
  quantityBefore: number
  quantityAfter: number
  reason: string
  createdAt: Date
}

export function InventoryManagement() {
  const [inventories, setInventories] = useState<Inventory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Dialog states
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    productId: '',
    type: 'purchase' as 'purchase' | 'sale' | 'return' | 'adjustment',
    quantity: '',
    reason: '',
  })

  // 載入資料
  const loadData = async () => {
    setLoading(true)
    try {
      // 載入產品
      const productsRes = await fetch('/api/products')
      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData)
      }

      // 載入庫存
      const inventoryRes = await fetch('/api/inventory')
      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json()
        setInventories(inventoryData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 載入庫存變動歷史
  const loadTransactions = async (productId: string) => {
    try {
      const res = await fetch(`/api/inventory/transactions?productId=${productId}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data)
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 更新庫存
  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault()
    triggerHaptic('light')

    if (!formData.productId || !formData.quantity) {
      alert('請選擇產品並輸入數量')
      return
    }

    try {
      triggerHaptic('medium')
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: formData.productId,
          type: formData.type,
          quantity: parseInt(formData.quantity),
          reason: formData.reason,
        }),
      })

      if (response.ok) {
        triggerHaptic('success')
        const result = await response.json()
        alert(`庫存更新成功！\n${result.productName}\n${result.previousQuantity} → ${result.newQuantity}`)
        setShowUpdateDialog(false)
        setFormData({ productId: '', type: 'purchase', quantity: '', reason: '' })
        loadData()
      } else {
        triggerHaptic('error')
        const error = await response.json()
        alert(error.error || '更新失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      console.error('Error updating inventory:', error)
      alert('更新失敗')
    }
  }

  // 獲取庫存狀態
  const getStockStatus = (inventory: Inventory) => {
    if (inventory.quantity <= 0) return { label: '缺貨', color: 'destructive', icon: AlertTriangle }
    if (inventory.quantity <= inventory.minStock) return { label: '庫存不足', color: 'secondary', icon: AlertTriangle }
    return { label: '充足', color: 'default', icon: Package }
  }

  // 獲取變動類型文字
  const getTypeText = (type: string) => {
    const types: Record<string, string> = {
      purchase: '進貨',
      sale: '銷售',
      return: '退貨',
      adjustment: '調整',
    }
    return types[type] || type
  }

  // 獲取變動類型顏色
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      purchase: 'text-green-600',
      sale: 'text-red-600',
      return: 'text-blue-600',
      adjustment: 'text-orange-600',
    }
    return colors[type] || 'text-gray-600'
  }

  // 過濾庫存
  const filteredInventories = inventories.filter(inv => {
    const matchSearch = inv.product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategory = categoryFilter === 'all' || inv.product.category === categoryFilter
    return matchSearch && matchCategory
  })

  // 計算統計數據
  const stats = {
    totalProducts: inventories.length,
    lowStock: inventories.filter(i => i.quantity <= i.minStock).length,
    outOfStock: inventories.filter(i => i.quantity <= 0).length,
    totalValue: inventories.reduce((sum, i) => sum + (i.quantity * i.product.price), 0),
  }

  // 獲取類別列表
  const categories = ['all', ...Array.from(new Set(inventories.map(i => i.product.category)))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-easy-title font-bold text-gray-900">庫存管理</h2>
          <p className="text-easy-body text-gray-600">管理瓦斯、爐具、熱水器等產品庫存</p>
        </div>
        <div className="flex gap-2">
          <IOSButton onClick={() => setShowUpdateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            進貨/調整
          </IOSButton>
          <IOSButton variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </IOSButton>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">產品總數</div>
            <div className="text-easy-title font-bold text-gray-900">{stats.totalProducts}</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">庫存不足</div>
            <div className="text-easy-title font-bold text-orange-600">{stats.lowStock}</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">缺貨</div>
            <div className="text-easy-title font-bold text-red-600">{stats.outOfStock}</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">庫存總值</div>
            <div className="text-easy-title font-bold text-green-600">NT${stats.totalValue.toLocaleString()}</div>
          </IOSCardContent>
        </IOSCard>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <IOSInput
            placeholder="搜尋產品名稱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="篩選類別" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat === 'all' ? '全部類別' : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Inventory List */}
      <IOSCard>
        <IOSCardHeader>
          <IOSCardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            產品庫存列表 ({filteredInventories.length})
          </IOSCardTitle>
        </IOSCardHeader>
        <IOSCardContent>
          {loading ? (
            <div className="text-center py-12 text-easy-body text-gray-500">載入中...</div>
          ) : filteredInventories.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">沒有找到庫存記錄</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {filteredInventories.map((inv) => {
                  const status = getStockStatus(inv)
                  const StatusIcon = status.icon
                  return (
                    <div key={inv.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-easy-heading font-semibold text-gray-900">
                              {inv.product.name}
                            </h3>
                            <Badge variant="outline">{inv.product.category}</Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">規格</div>
                              <div className="font-semibold text-gray-900">{inv.product.capacity}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">單價</div>
                              <div className="font-semibold text-gray-900">NT${inv.product.price}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">庫存量</div>
                              <div className="font-semibold text-gray-900">{inv.quantity}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">最低庫存</div>
                              <div className="font-semibold text-orange-600">{inv.minStock}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={status.color as any} className="flex items-center gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                          <IOSButton
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              loadTransactions(inv.productId)
                              setShowHistoryDialog(true)
                            }}
                            className="gap-1"
                          >
                            <History className="h-3 w-3" />
                            歷史
                          </IOSButton>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </IOSCardContent>
      </IOSCard>

      {/* Update Stock Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新庫存</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStock} className="space-y-4">
            <div>
              <Label>產品 *</Label>
              <Select
                value={formData.productId}
                onValueChange={(value) => setFormData({ ...formData, productId: value })}
                required
              >
                <SelectTrigger className="w-full h-auto min-h-[3rem]">
                  <SelectValue placeholder="選擇產品">
                    {formData.productId && (() => {
                      const selectedProduct = products.find(p => p.id === formData.productId)
                      const inventory = inventories.find(inv => inv.productId === formData.productId)
                      const currentStock = inventory?.quantity || 0
                      
                      return selectedProduct ? (
                        <div className="flex flex-col items-start gap-1 text-left">
                          <span className="font-semibold">{selectedProduct.name}</span>
                          <span className="text-xs text-gray-600">
                            {selectedProduct.capacity} • NT${selectedProduct.price} • 庫存: {currentStock}
                          </span>
                        </div>
                      ) : null
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                  {products.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      尚無產品資料
                      <br />
                      <span className="text-xs">請先到產品管理新增產品</span>
                    </div>
                  ) : (
                    products.map((product) => {
                      // 獲取當前庫存數量
                      const inventory = inventories.find(inv => inv.productId === product.id)
                      const currentStock = inventory?.quantity || 0
                      
                      return (
                        <SelectItem key={product.id} value={product.id} className="py-3">
                          <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-base">{product.name}</span>
                              <span className="text-sm font-medium text-orange-600">
                                NT${product.price}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>規格: {product.capacity}</span>
                              <span className={`font-medium ${currentStock < 10 ? 'text-red-600' : currentStock < 30 ? 'text-orange-600' : 'text-green-600'}`}>
                                庫存: {currentStock}
                              </span>
                            </div>
                            {product.category && (
                              <span className="text-xs text-gray-400">分類: {product.category}</span>
                            )}
                          </div>
                    </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>變動類型 *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">進貨 (+)</SelectItem>
                  <SelectItem value="sale">銷售 (-)</SelectItem>
                  <SelectItem value="return">退貨 (+)</SelectItem>
                  <SelectItem value="adjustment">調整 (+/-)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>數量 *</Label>
              <IOSInput
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="輸入數量"
                required
              />
            </div>

            <div>
              <Label>原因說明</Label>
              <IOSInput
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="進貨來源、調整原因等（選填）"
              />
            </div>

            <DialogFooter>
              <IOSButton
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUpdateDialog(false)
                  setFormData({ productId: '', type: 'purchase', quantity: '', reason: '' })
                }}
              >
                取消
              </IOSButton>
              <IOSButton type="submit">確認更新</IOSButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>庫存變動歷史</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暫無變動記錄</div>
            ) : (
              <div className="space-y-2">
                {transactions.map((txn) => (
                  <div key={txn.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{getTypeText(txn.type)}</Badge>
                      <div className="text-xs text-gray-500">
                        {new Date(txn.createdAt).toLocaleString('zh-TW')}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">變動前：</span>
                        <span className="font-semibold">{txn.quantityBefore}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">變動量：</span>
                        <span className={`font-semibold ${getTypeColor(txn.type)}`}>
                          {txn.type === 'sale' ? '-' : '+'}{Math.abs(txn.quantity)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">變動後：</span>
                        <span className="font-semibold">{txn.quantityAfter}</span>
                      </div>
                    </div>
                    {txn.reason && (
                      <div className="mt-2 text-xs text-gray-600">
                        原因：{txn.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
