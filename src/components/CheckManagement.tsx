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
  CheckSquare,
  Plus,
  RefreshCw,
  Search,
  Calendar,
  DollarSign,
  Building2,
  FileText,
  User,
  Trash2,
  Edit,
  AlertCircle,
} from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface Customer {
  id: string
  name: string
  phone: string
}

interface Order {
  id: string
  orderNo: string
  totalAmount: number
}

interface Check {
  id: string
  customerId: string | null
  orderId: string | null
  checkNo: string
  bankName: string
  checkDate: Date
  amount: number
  status: 'pending' | 'deposited' | 'cleared' | 'bounced' | 'cancelled'
  note: string | null
  customer: Customer | null
  order: Order | null
  createdAt: Date
}

export function CheckManagement() {
  const [checks, setChecks] = useState<Check[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [selectedCheck, setSelectedCheck] = useState<Check | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    orderId: '',
    checkNo: '',
    bankName: '',
    checkDate: '',
    amount: '',
    note: '',
  })

  const [statusUpdate, setStatusUpdate] = useState({
    checkId: '',
    status: 'pending' as Check['status'],
  })

  // 載入資料
  const loadData = async () => {
    setLoading(true)
    try {
      // 載入客戶
      const customersRes = await fetch('/api/customers')
      if (customersRes.ok) {
        const data = await customersRes.json()
        setCustomers(data)
      }

      // 載入訂單
      const ordersRes = await fetch('/api/orders')
      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(data)
      }

      // 載入支票
      await loadChecks()
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadChecks = async () => {
    try {
      const res = await fetch('/api/checks')
      if (res.ok) {
        const data = await res.json()
        setChecks(data)
      }
    } catch (error) {
      console.error('Error loading checks:', error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 新增支票
  const handleAddCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    triggerHaptic('light')

    if (!formData.checkNo || !formData.bankName || !formData.checkDate || !formData.amount) {
      alert('請填寫必要欄位')
      return
    }

    try {
      triggerHaptic('medium')
      const response = await fetch('/api/checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId || null,
          orderId: formData.orderId || null,
          checkNo: formData.checkNo.trim(),
          bankName: formData.bankName.trim(),
          checkDate: formData.checkDate,
          amount: parseFloat(formData.amount),
          note: formData.note.trim() || null,
        }),
      })

      if (response.ok) {
        triggerHaptic('success')
        alert('支票新增成功！')
        setShowAddDialog(false)
        setFormData({
          customerId: '',
          orderId: '',
          checkNo: '',
          bankName: '',
          checkDate: '',
          amount: '',
          note: '',
        })
        loadChecks()
      } else {
        triggerHaptic('error')
        const error = await response.json()
        alert(error.error || '新增失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      console.error('Error adding check:', error)
      alert('新增失敗')
    }
  }

  // 更新支票狀態
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    triggerHaptic('light')

    if (!statusUpdate.checkId) return

    try {
      triggerHaptic('medium')
      const response = await fetch(`/api/checks/${statusUpdate.checkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusUpdate.status }),
      })

      if (response.ok) {
        triggerHaptic('success')
        alert('支票狀態更新成功！')
        setShowStatusDialog(false)
        loadChecks()
      } else {
        triggerHaptic('error')
        const error = await response.json()
        alert(error.error || '更新失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      console.error('Error updating status:', error)
      alert('更新失敗')
    }
  }

  // 刪除支票
  const handleDeleteCheck = async (id: string) => {
    if (!confirm('確定要刪除此支票記錄嗎？')) return

    triggerHaptic('light')
    try {
      const response = await fetch(`/api/checks/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        triggerHaptic('success')
        alert('支票已刪除')
        loadChecks()
      } else {
        triggerHaptic('error')
        const error = await response.json()
        alert(error.error || '刪除失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      console.error('Error deleting check:', error)
      alert('刪除失敗')
    }
  }

  // 獲取狀態文字
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待兌現',
      deposited: '已存入',
      cleared: '已兌現',
      bounced: '退票',
      cancelled: '已取消',
    }
    return statusMap[status] || status
  }

  // 獲取狀態顏色
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, any> = {
      pending: 'secondary',
      deposited: 'default',
      cleared: 'default',
      bounced: 'destructive',
      cancelled: 'outline',
    }
    return colorMap[status] || 'outline'
  }

  // 過濾支票
  const filteredChecks = checks.filter(check => {
    const matchSearch =
      check.checkNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      check.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (check.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = statusFilter === 'all' || check.status === statusFilter
    return matchSearch && matchStatus
  })

  // 計算統計數據
  const stats = {
    total: checks.length,
    pending: checks.filter(c => c.status === 'pending').length,
    deposited: checks.filter(c => c.status === 'deposited').length,
    cleared: checks.filter(c => c.status === 'cleared').length,
    bounced: checks.filter(c => c.status === 'bounced').length,
    totalAmount: checks
      .filter(c => c.status !== 'cancelled' && c.status !== 'bounced')
      .reduce((sum, c) => sum + c.amount, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-easy-title font-bold text-gray-900">支票管理</h2>
          <p className="text-easy-body text-gray-600">登記客戶支票，追蹤到期日和兌現狀態</p>
        </div>
        <div className="flex gap-2">
          <IOSButton onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            新增支票
          </IOSButton>
          <IOSButton variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </IOSButton>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">總支票數</div>
            <div className="text-easy-title font-bold text-gray-900">{stats.total}</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">待兌現</div>
            <div className="text-easy-title font-bold text-orange-600">{stats.pending}</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">已存入</div>
            <div className="text-easy-title font-bold text-blue-600">{stats.deposited}</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">已兌現</div>
            <div className="text-easy-title font-bold text-green-600">{stats.cleared}</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">總金額</div>
            <div className="text-easy-title font-bold text-green-600">
              NT${stats.totalAmount.toLocaleString()}
            </div>
          </IOSCardContent>
        </IOSCard>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <IOSInput
            placeholder="搜尋支票號碼、銀行或客戶..."
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
            <SelectItem value="pending">待兌現</SelectItem>
            <SelectItem value="deposited">已存入</SelectItem>
            <SelectItem value="cleared">已兌現</SelectItem>
            <SelectItem value="bounced">退票</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Checks List */}
      <IOSCard>
        <IOSCardHeader>
          <IOSCardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-pink-600" />
            支票列表 ({filteredChecks.length})
          </IOSCardTitle>
        </IOSCardHeader>
        <IOSCardContent>
          {loading ? (
            <div className="text-center py-12 text-easy-body text-gray-500">載入中...</div>
          ) : filteredChecks.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">尚無支票記錄</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {filteredChecks.map((check) => (
                  <div key={check.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-easy-heading font-semibold text-gray-900">
                            {check.checkNo}
                          </h3>
                          <Badge variant={getStatusColor(check.status)} className="flex items-center gap-1">
                            {getStatusText(check.status)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">銀行</div>
                            <div className="font-semibold text-gray-900">{check.bankName}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">到期日</div>
                            <div className="font-semibold text-gray-900">
                              {new Date(check.checkDate).toLocaleDateString('zh-TW')}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">金額</div>
                            <div className="font-semibold text-green-600">
                              NT${check.amount.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">客戶</div>
                            <div className="font-semibold text-gray-900">
                              {check.customer?.name || '-'}
                            </div>
                          </div>
                        </div>
                        {check.note && (
                          <div className="mt-2 text-xs text-gray-600">
                            備註：{check.note}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <IOSButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCheck(check)
                            setStatusUpdate({ checkId: check.id, status: check.status })
                            setShowStatusDialog(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </IOSButton>
                        <IOSButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCheck(check.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </IOSButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </IOSCardContent>
      </IOSCard>

      {/* Add Check Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增支票</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCheck} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>支票號碼 *</Label>
                <IOSInput
                  value={formData.checkNo}
                  onChange={(e) => setFormData({ ...formData, checkNo: e.target.value })}
                  placeholder="例：12345678"
                  required
                />
              </div>
              <div>
                <Label>銀行名稱 *</Label>
                <IOSInput
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="例：台灣銀行"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>到期日 *</Label>
                <IOSInput
                  type="date"
                  value={formData.checkDate}
                  onChange={(e) => setFormData({ ...formData, checkDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>金額 *</Label>
                <IOSInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="輸入金額"
                  required
                />
              </div>
            </div>

            <div>
              <Label>關聯客戶（選填）</Label>
              <Select
                value={formData.customerId}
                onValueChange={(value) => setFormData({ ...formData, customerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇客戶" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>關聯訂單（選填）</Label>
              <Select
                value={formData.orderId}
                onValueChange={(value) => setFormData({ ...formData, orderId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇訂單" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.orderNo} - NT${order.totalAmount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>備註（選填）</Label>
              <IOSInput
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="其他說明"
              />
            </div>

            <DialogFooter>
              <IOSButton
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false)
                  setFormData({
                    customerId: '',
                    orderId: '',
                    checkNo: '',
                    bankName: '',
                    checkDate: '',
                    amount: '',
                    note: '',
                  })
                }}
              >
                取消
              </IOSButton>
              <IOSButton type="submit">確認新增</IOSButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新支票狀態</DialogTitle>
          </DialogHeader>
          {selectedCheck && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div><strong>支票號碼：</strong>{selectedCheck.checkNo}</div>
                <div><strong>銀行：</strong>{selectedCheck.bankName}</div>
                <div><strong>金額：</strong>NT${selectedCheck.amount.toLocaleString()}</div>
              </div>
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div>
                  <Label>新狀態 *</Label>
                  <Select
                    value={statusUpdate.status}
                    onValueChange={(value: any) => setStatusUpdate({ ...statusUpdate, status: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待兌現</SelectItem>
                      <SelectItem value="deposited">已存入</SelectItem>
                      <SelectItem value="cleared">已兌現</SelectItem>
                      <SelectItem value="bounced">退票</SelectItem>
                      <SelectItem value="cancelled">已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <IOSButton
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowStatusDialog(false)
                      setSelectedCheck(null)
                    }}
                  >
                    取消
                  </IOSButton>
                  <IOSButton type="submit">確認更新</IOSButton>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
