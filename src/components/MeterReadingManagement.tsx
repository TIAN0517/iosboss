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
import { Textarea } from '@/components/ui/textarea'
import {
  Calculator,
  RefreshCw,
  Plus,
  Search,
  Calendar,
  User,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface Customer {
  id: string
  name: string
  phone: string
  address: string
  lastMeterReadAt: Date | null
}

interface MeterReading {
  id: string
  customerId: string
  previousReading: number
  currentReading: number
  usage: number
  unitPrice: number
  amount: number
  periodStart: Date
  periodEnd: Date
  note: string | null
  readingDate: Date
  customer: Customer
}

export function MeterReadingManagement() {
  const [readings, setReadings] = useState<MeterReading[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [monthFilter, setMonthFilter] = useState('')

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    previousReading: '',
    currentReading: '',
    unitPrice: '18', // 預設單價
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    note: '',
  })

  // 載入資料
  const loadData = async () => {
    setLoading(true)
    try {
      // 載入客戶（只顯示使用管線瓦斯的客戶）
      const customersRes = await fetch('/api/customers')
      if (customersRes.ok) {
        const data = await customersRes.json()
        // 假設管線瓦斯客戶有特定標記，這裡先顯示所有客戶
        setCustomers(data)
      }

      // 載入抄錶記錄
      await loadReadings()
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReadings = async () => {
    try {
      const params = new URLSearchParams()
      if (monthFilter) params.append('month', monthFilter)

      const res = await fetch(`/api/meter-readings?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setReadings(data)
      }
    } catch (error) {
      console.error('Error loading readings:', error)
    }
  }

  useEffect(() => {
    loadData()
  }, [monthFilter])

  // 新增抄錶記錄
  const handleAddReading = async (e: React.FormEvent) => {
    e.preventDefault()
    triggerHaptic('light')

    if (!formData.customerId || !formData.currentReading || !formData.unitPrice) {
      alert('請填寫必要欄位')
      return
    }

    const currentReading = parseFloat(formData.currentReading)
    const previousReading = parseFloat(formData.previousReading) || 0

    if (currentReading < previousReading) {
      alert('本期讀數不能小於上期讀數')
      return
    }

    try {
      triggerHaptic('medium')
      const response = await fetch('/api/meter-readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          previousReading,
          currentReading,
          unitPrice: parseFloat(formData.unitPrice),
          periodStart: formData.periodStart,
          periodEnd: formData.periodEnd,
          note: formData.note.trim() || null,
        }),
      })

      if (response.ok) {
        triggerHaptic('success')
        const result = await response.json()
        alert(`抄錶記錄新增成功！\n用量：${result.usage} m³\n金額：NT$${result.amount}`)
        setShowAddDialog(false)
        resetForm()
        loadReadings()
      } else {
        triggerHaptic('error')
        const error = await response.json()
        alert(error.error || '新增失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      console.error('Error adding reading:', error)
      alert('新增失敗')
    }
  }

  // 當選擇客戶時，自動填入上次讀數
  const handleCustomerChange = async (customerId: string) => {
    setFormData({ ...formData, customerId })

    // 獲取該客戶最近的抄錶記錄
    try {
      const res = await fetch(`/api/meter-readings?customerId=${customerId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.length > 0) {
          setFormData(prev => ({
            ...prev,
            customerId,
            previousReading: data[0].currentReading.toString(),
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching last reading:', error)
    }
  }

  // 計算用量和金額
  const calculatePreview = () => {
    const current = parseFloat(formData.currentReading) || 0
    const previous = parseFloat(formData.previousReading) || 0
    const unitPrice = parseFloat(formData.unitPrice) || 0

    const usage = current - previous
    const amount = usage * unitPrice

    return { usage: Math.max(0, usage), amount: Math.max(0, amount) }
  }

  // 重置表單
  const resetForm = () => {
    setFormData({
      customerId: '',
      previousReading: '',
      currentReading: '',
      unitPrice: '18',
      periodStart: new Date().toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
      note: '',
    })
  }

  // 過濾記錄
  const filteredReadings = readings.filter(reading => {
    const matchSearch =
      reading.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reading.customer.address.toLowerCase().includes(searchTerm.toLowerCase())
    return matchSearch
  })

  // 計算統計
  const stats = {
    totalReadings: readings.length,
    totalUsage: readings.reduce((sum, r) => sum + r.usage, 0),
    totalAmount: readings.reduce((sum, r) => sum + r.amount, 0),
    avgUsage: readings.length > 0 ? readings.reduce((sum, r) => sum + r.usage, 0) / readings.length : 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-easy-title font-bold text-gray-900">抄錶計算</h2>
          <p className="text-easy-body text-gray-600">管線瓦斯抄錶，自動計算用量和費用</p>
        </div>
        <div className="flex gap-2">
          <IOSButton onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            新增抄錶
          </IOSButton>
          <IOSButton variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </IOSButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">抄錶次數</div>
            <div className="text-easy-title font-bold text-gray-900">{stats.totalReadings}</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">總用量</div>
            <div className="text-easy-title font-bold text-blue-600">{stats.totalUsage.toFixed(1)} m³</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">總金額</div>
            <div className="text-easy-title font-bold text-green-600">NT${stats.totalAmount.toLocaleString()}</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">平均用量</div>
            <div className="text-easy-title font-bold text-orange-600">{stats.avgUsage.toFixed(1)} m³</div>
          </IOSCardContent>
        </IOSCard>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <IOSInput
            placeholder="搜尋客戶名稱或地址..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <IOSInput
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-full sm:w-[200px]"
        />
      </div>

      {/* Readings List */}
      <IOSCard>
        <IOSCardHeader>
          <IOSCardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-cyan-600" />
            抄錶記錄 ({filteredReadings.length})
          </IOSCardTitle>
        </IOSCardHeader>
        <IOSCardContent>
          {loading ? (
            <div className="text-center py-12 text-easy-body text-gray-500">載入中...</div>
          ) : filteredReadings.length === 0 ? (
            <div className="text-center py-12">
              <Calculator className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">尚無抄錶記錄</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {filteredReadings.map((reading) => (
                  <div key={reading.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-easy-heading font-semibold text-gray-900">
                            {reading.customer.name}
                          </h3>
                          <div className="text-xs text-gray-500">
                            {new Date(reading.readingDate).toLocaleDateString('zh-TW')}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {reading.customer.address}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-gray-500">上期讀數</div>
                            <div className="font-semibold text-gray-900">{reading.previousReading}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">本期讀數</div>
                            <div className="font-semibold text-gray-900">{reading.currentReading}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">用量</div>
                            <div className="font-semibold text-blue-600">{reading.usage} m³</div>
                          </div>
                          <div>
                            <div className="text-gray-500">金額</div>
                            <div className="font-semibold text-green-600">NT${reading.amount}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          統計期間：{new Date(reading.periodStart).toLocaleDateString('zh-TW')} ~ {new Date(reading.periodEnd).toLocaleDateString('zh-TW')}
                        </div>
                        {reading.note && (
                          <div className="mt-2 text-xs text-gray-600">
                            備註：{reading.note}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </IOSCardContent>
      </IOSCard>

      {/* Add Reading Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增抄錶記錄</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddReading} className="space-y-4">
            <div>
              <Label>客戶 *</Label>
              <Select
                value={formData.customerId}
                onValueChange={handleCustomerChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇客戶" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>上期讀數</Label>
                <IOSInput
                  type="number"
                  step="0.01"
                  value={formData.previousReading}
                  onChange={(e) => setFormData({ ...formData, previousReading: e.target.value })}
                  placeholder="自動帶入上次讀數"
                />
              </div>
              <div>
                <Label>本期讀數 *</Label>
                <IOSInput
                  type="number"
                  step="0.01"
                  value={formData.currentReading}
                  onChange={(e) => setFormData({ ...formData, currentReading: e.target.value })}
                  placeholder="輸入本期讀數"
                  required
                />
              </div>
            </div>

            <div>
              <Label>單價 (NT$/m³) *</Label>
              <IOSInput
                type="number"
                step="0.1"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                required
              />
            </div>

            {/* 預覽計算結果 */}
            {formData.currentReading && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-900 mb-2">預覽計算：</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-blue-700">用量：</span>
                    <span className="font-semibold text-blue-900">{calculatePreview().usage.toFixed(1)} m³</span>
                  </div>
                  <div>
                    <span className="text-blue-700">金額：</span>
                    <span className="font-semibold text-blue-900">NT${calculatePreview().amount.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>統計開始日期</Label>
                <IOSInput
                  type="date"
                  value={formData.periodStart}
                  onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                />
              </div>
              <div>
                <Label>統計結束日期</Label>
                <IOSInput
                  type="date"
                  value={formData.periodEnd}
                  onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>備註（選填）</Label>
              <Textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="其他說明"
                rows={2}
              />
            </div>

            <DialogFooter>
              <IOSButton
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false)
                  resetForm()
                }}
              >
                取消
              </IOSButton>
              <IOSButton type="submit">確認記錄</IOSButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
