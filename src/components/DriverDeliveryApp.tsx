'use client'

import { useState, useEffect } from 'react'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import { IOSButton } from '@/components/ui/ios-button'
import { IOSModal } from '@/components/ui/ios-modal'
import { IOSInput } from '@/components/ui/ios-input'
import { Truck, MapPin, Phone, CheckCircle, Clock, Navigation, Camera, RotateCcw, Package } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { triggerHaptic } from '@/lib/ios-utils'
import { useRouter } from 'next/navigation'

interface DeliveryOrder {
  id: string
  orderNo: string
  customerName: string
  customerPhone: string
  address: string
  items: string
  totalAmount: number
  status: string
  notes?: string
  createdAt: Date
}

export function DriverDeliveryApp() {
  const router = useRouter()
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [deliveryNote, setDeliveryNote] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    loadDeliveryOrders()
    // 每 30 秒自動更新
    const interval = setInterval(loadDeliveryOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDeliveryOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=pending,processing')
      if (response.ok) {
        const data = await response.json()
        setOrders(data || [])
      }
    } catch (error) {
      console.error('Error loading delivery orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(true)
    triggerHaptic('medium')

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          deliveryNote: deliveryNote,
        }),
      })

      if (response.ok) {
        triggerHaptic('success')
        setShowConfirmModal(false)
        setSelectedOrder(null)
        setDeliveryNote('')
        loadDeliveryOrders()
      } else {
        throw new Error('更新失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      alert('❌ 更新失敗，請稍後再試')
    } finally {
      setUpdating(false)
    }
  }

  const openNavigation = (address: string) => {
    // 打開 Google Maps 導航
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    window.open(url, '_blank')
  }

  const makePhoneCall = (phone: string) => {
    // 直接撥打電話
    window.location.href = `tel:${phone}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'delivering':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待出貨'
      case 'processing':
        return '配送中'
      case 'delivering':
        return '配送中'
      case 'completed':
        return '已完成'
      default:
        return '未知'
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* 標題 */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Truck className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-easy-title font-bold text-gray-900">司機配送助手</h2>
          <p className="text-easy-body text-gray-600">共 {orders.length} 筆待配送訂單</p>
        </div>
      </div>

      {/* 待配送訂單列表 */}
      {!loading && orders.length === 0 ? (
        <IOSCard>
          <IOSCardContent className="p-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-easy-title font-bold text-gray-900">🎉 太棒了！</p>
            <p className="text-easy-body text-gray-600 mt-2">所有訂單都已配送完成</p>
          </IOSCardContent>
        </IOSCard>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <IOSCard
              key={order.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                order.status === 'delivering' ? 'border-purple-500 bg-purple-50' : ''
              }`}
              onClick={() => {
                triggerHaptic('light')
                setSelectedOrder(order)
              }}
            >
              <IOSCardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-easy-subheading font-bold text-gray-900">
                        {order.customerName}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <p className="text-easy-caption text-gray-600">#{order.orderNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-easy-subheading font-bold text-orange-600">
                      NT${order.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-easy-body text-gray-700">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="flex-1">{order.address}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Package className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="flex-1">{order.items}</p>
                  </div>
                  {order.notes && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800">📝 {order.notes}</p>
                    </div>
                  )}
                </div>

                {/* 快速操作按鈕 */}
                <div className="flex gap-2 mt-4">
                  <IOSButton
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerHaptic('light')
                      openNavigation(order.address)
                    }}
                  >
                    <Navigation className="h-4 w-4" />
                    導航
                  </IOSButton>
                  <IOSButton
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerHaptic('light')
                      makePhoneCall(order.customerPhone)
                    }}
                  >
                    <Phone className="h-4 w-4" />
                    電話
                  </IOSButton>
                  <IOSButton
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerHaptic('medium')
                      setSelectedOrder(order)
                      setShowConfirmModal(true)
                    }}
                  >
                    <CheckCircle className="h-4 w-4" />
                    完成
                  </IOSButton>
                </div>
              </IOSCardContent>
            </IOSCard>
          ))}
        </div>
      )}

      {/* 配送確認對話框 */}
      <IOSModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="確認配送完成" size="md">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">客戶：</span>
                <span className="font-semibold">{selectedOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">地址：</span>
                <span className="font-semibold text-right">{selectedOrder.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">金額：</span>
                <span className="font-semibold text-orange-600">NT${selectedOrder.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-easy-body font-semibold text-gray-900">
                配送備註（選填）
              </label>
              <IOSInput
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="例如：客戶不在，改明日再送"
              />
            </div>

            <div className="flex gap-2">
              <IOSButton
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmModal(false)}
              >
                取消
              </IOSButton>
              <IOSButton
                className="flex-1 gap-2"
                onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                loading={updating}
              >
                <CheckCircle className="h-4 w-4" />
                確認完成
              </IOSButton>
            </div>
          </div>
        )}
      </IOSModal>

      {/* 底部操作欄 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 ios-safe-area-bottom md:relative md:border-t-0 md:p-0 md:pb-6">
        <div className="flex gap-2">
          <IOSButton
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => {
              triggerHaptic('light')
              loadDeliveryOrders()
            }}
          >
            <RotateCcw className="h-4 w-4" />
            重新整理
          </IOSButton>
          <IOSButton
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => {
              triggerHaptic('light')
              router.push('/')
            }}
          >
            返回首頁
          </IOSButton>
        </div>
      </div>
    </div>
  )
}
