'use client'

import { useState } from 'react'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import { IOSButton } from '@/components/ui/ios-button'
import { IOSModal } from '@/components/ui/ios-modal'
import { IOSInput } from '@/components/ui/ios-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart,
  Package,
  FileSpreadsheet,
  TrendingUp,
  Plus,
  Zap,
  Star,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface QuickAction {
  id: string
  icon: React.ReactNode
  label: string
  description: string
  color: string
  action: () => void
}

const commonProducts = [
  { id: '1', name: '20kg 瓦斯', defaultQty: 1 },
  { id: '2', name: '50kg 瓦斯', defaultQty: 1 },
  { id: '3', name: '桶裝瓦斯 20kg', defaultQty: 2 },
  { id: '4', name: '瓦斯桶 20kg', defaultQty: 1 },
]

interface QuickActionsProps {
  onQuickOrder?: (customerId: string, items: Array<{ productId: string; quantity: number }>) => void
  onSectionChange?: (section: string) => void
}

export function QuickActions({ onQuickOrder, onSectionChange }: QuickActionsProps) {
  const router = useRouter()
  const [showQuickOrder, setShowQuickOrder] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('1')
  const [quantity, setQuantity] = useState('1')
  const [loading, setLoading] = useState(false)

  // 快速操作項目
  const actions: QuickAction[] = [
    {
      id: 'new-order',
      icon: <ShoppingCart className="h-6 w-6" />,
      label: '快速訂單',
      description: '常用客戶快速下單',
      color: 'text-blue-600',
      action: () => {
        triggerHaptic('light')
        setShowQuickOrder(true)
      },
    },
    {
      id: 'today-report',
      icon: <TrendingUp className="h-6 w-6" />,
      label: '今日報表',
      description: '查看今日營收',
      color: 'text-green-600',
      action: () => {
        triggerHaptic('light')
        if (onSectionChange) {
          onSectionChange('reports')
        } else {
          router.push('/')
        }
      },
    },
    {
      id: 'inventory-check',
      icon: <Package className="h-6 w-6" />,
      label: '庫存查詢',
      description: '檢查瓦斯庫存',
      color: 'text-orange-600',
      action: () => {
        triggerHaptic('light')
        if (onSectionChange) {
          onSectionChange('inventory')
        } else {
          router.push('/')
        }
      },
    },
    {
      id: 'export-excel',
      icon: <FileSpreadsheet className="h-6 w-6" />,
      label: '導出報表',
      description: 'Excel 報表下載',
      color: 'text-purple-600',
      action: () => {
        triggerHaptic('light')
        if (onSectionChange) {
          onSectionChange('excel-export')
        } else {
          router.push('/')
        }
      },
    },
  ]

  const handleQuickOrder = async () => {
    triggerHaptic('medium')
    setLoading(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer,
          items: [
            {
              productId: selectedProduct,
              quantity: parseInt(quantity) || 1,
            },
          ],
        }),
      })

      if (response.ok) {
        triggerHaptic('success')
        setShowQuickOrder(false)
        alert('✅ 訂單創建成功！')
        router.push('/orders')
      } else {
        throw new Error('創建訂單失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      alert('❌ 訂單創建失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <IOSCard>
        <IOSCardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-orange-500" />
            <IOSCardTitle>快速操作</IOSCardTitle>
          </div>
        </IOSCardHeader>
        <IOSCardContent>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-orange-300 hover:bg-orange-50 active:scale-95"
              >
                <div className={action.color}>{action.icon}</div>
                <div className="text-center">
                  <p className="text-easy-body font-bold text-gray-900">{action.label}</p>
                  <p className="text-easy-caption text-gray-600">{action.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* 常用客戶快捷下單 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <p className="text-easy-subheading font-bold text-gray-900">常用客戶</p>
            </div>
            <div className="space-y-2">
              <FavoriteCustomerButtons />
            </div>
          </div>
        </IOSCardContent>
      </IOSCard>

      {/* 快速訂單對話框 */}
      <IOSModal isOpen={showQuickOrder} onClose={() => setShowQuickOrder(false)} title="快速訂單" size="md">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-easy-body font-semibold text-gray-900">客戶</label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="選擇客戶" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash-customer">現金客戶</SelectItem>
                {/* 從數據庫加載客戶列表 */}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-easy-body font-semibold text-gray-900">產品</label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {commonProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-easy-body font-semibold text-gray-900">數量</label>
            <IOSInput
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="輸入數量"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <IOSButton
              variant="outline"
              className="flex-1"
              onClick={() => setShowQuickOrder(false)}
            >
              取消
            </IOSButton>
            <IOSButton
              className="flex-1 gap-2"
              onClick={handleQuickOrder}
              loading={loading}
              disabled={!selectedCustomer}
            >
              <Plus className="h-4 w-4" />
              創建訂單
            </IOSButton>
          </div>
        </div>
      </IOSModal>
    </>
  )
}

/**
 * 常用客戶快捷按鈕
 */
function FavoriteCustomerButtons() {
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string }>>([])
  const router = useRouter()

  // 這裡可以從 localStorage 或數據庫加載常用客戶
  // 目前使用示例數據
  const favoriteCustomers = customers.length > 0 ? customers : [
    { id: '1', name: '王小姐', phone: '0912345678' },
    { id: '2', name: '陳先生', phone: '0923456789' },
    { id: '3', name: '林太太', phone: '0934567890' },
  ]

  return (
    <div className="grid grid-cols-1 gap-2">
      {favoriteCustomers.map((customer) => (
        <button
          key={customer.id}
          onClick={() => {
            triggerHaptic('light')
            router.push(`/orders?customer=${customer.id}`)
          }}
          className="flex items-center justify-between rounded-lg border-2 border-gray-200 bg-gray-50 p-3 text-left transition-all hover:border-orange-300 hover:bg-orange-50"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-easy-body font-semibold text-gray-900">{customer.name}</p>
              <p className="text-easy-caption text-gray-600">{customer.phone}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </button>
      ))}
    </div>
  )
}
