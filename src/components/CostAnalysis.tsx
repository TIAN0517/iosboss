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
  TrendingUp,
  RefreshCw,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface CostRecord {
  id: string
  type: string
  category: string
  amount: number
  description: string | null
  date: Date
  items?: Array<{
    id: string
    item: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
}

interface CostAnalysisData {
  summary: {
    totalCost: number
    revenue: number
    profit: number
    profitMargin: string
    orderCount: number
  }
  costByType: Record<string, number>
  costByCategory: Record<string, number>
  records: CostRecord[]
}

const COST_TYPES = [
  { value: 'purchase', label: '進貨成本' },
  { value: 'delivery', label: '配送成本' },
  { value: 'labor', label: '人工成本' },
  { value: 'utility', label: '水電費' },
  { value: 'rent', label: '租金' },
  { value: 'maintenance', label: '維護費用' },
  { value: 'other', label: '其他' },
]

const COST_CATEGORIES = [
  { value: 'gas', label: '瓦斯相關' },
  { value: 'equipment', label: '設備耗材' },
  { value: 'vehicle', label: '車輛相關' },
  { value: 'personnel', label: '人員相關' },
  { value: 'facility', label: '場地設施' },
  { value: 'marketing', label: '行銷推廣' },
  { value: 'administrative', label: '行政費用' },
  { value: 'other', label: '其他' },
]

export function CostAnalysis() {
  const [data, setData] = useState<CostAnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // 篩選條件
  const [filterType, setFilterType] = useState<string>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  // 表單狀態
  const [formData, setFormData] = useState({
    type: 'purchase',
    category: 'gas',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    items: [{ item: '', quantity: 1, unitPrice: '' }],
  })

  // 載入數據
  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.append('type', filterType)
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)

      const response = await fetch(`/api/cost-analysis?${params.toString()}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error loading cost analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filterType, dateRange])

  // 新增成本記錄
  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault()
    triggerHaptic('light')

    if (!formData.amount || !formData.date) {
      alert('請填寫必要欄位')
      return
    }

    // 驗證明細項目
    const validItems = formData.items.filter(item => item.item && item.unitPrice)
    if (validItems.length === 0) {
      alert('請至少填寫一項明細')
      return
    }

    try {
      triggerHaptic('medium')
      const response = await fetch('/api/costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
          date: formData.date,
          items: validItems,
        }),
      })

      if (response.ok) {
        triggerHaptic('success')
        alert('成本記錄新增成功！')
        setShowAddDialog(false)
        resetForm()
        loadData()
      } else {
        triggerHaptic('error')
        const error = await response.json()
        alert(error.error || '新增失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      console.error('Error adding cost:', error)
      alert('新增失敗')
    }
  }

  // 新增明細項目
  const addFormItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item: '', quantity: 1, unitPrice: '' }],
    })
  }

  // 移除明細項目
  const removeFormItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  // 重置表單
  const resetForm = () => {
    setFormData({
      type: 'purchase',
      category: 'gas',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      items: [{ item: '', quantity: 1, unitPrice: '' }],
    })
  }

  // 獲取成本類型標籤
  const getTypeLabel = (type: string) => {
    return COST_TYPES.find(t => t.value === type)?.label || type
  }

  // 獲得分類標籤
  const getCategoryLabel = (category: string) => {
    return COST_CATEGORIES.find(c => c.value === category)?.label || category
  }

  // 計算明細總額
  const calculateItemsTotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.unitPrice) || 0) * (item.quantity || 1)
    }, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-easy-title font-bold text-gray-900">成本分析</h2>
          <p className="text-easy-body text-gray-600">記錄和分析各類成本，計算利潤</p>
        </div>
        <div className="flex gap-2">
          <IOSButton onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            記錄成本
          </IOSButton>
          <IOSButton variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </IOSButton>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <IOSCard>
            <IOSCardContent className="pt-6">
              <div className="flex items-center gap-2 text-easy-subheading text-gray-600 mb-1">
                <ShoppingCart className="h-4 w-4" />
                總成本
              </div>
              <div className="text-easy-title font-bold text-red-600">
                NT${data.summary.totalCost.toLocaleString()}
              </div>
            </IOSCardContent>
          </IOSCard>
          <IOSCard>
            <IOSCardContent className="pt-6">
              <div className="flex items-center gap-2 text-easy-subheading text-gray-600 mb-1">
                <DollarSign className="h-4 w-4" />
                營業額
              </div>
              <div className="text-easy-title font-bold text-blue-600">
                NT${data.summary.revenue.toLocaleString()}
              </div>
            </IOSCardContent>
          </IOSCard>
          <IOSCard>
            <IOSCardContent className="pt-6">
              <div className="flex items-center gap-2 text-easy-subheading text-gray-600 mb-1">
                <TrendingUp className="h-4 w-4" />
                利潤
              </div>
              <div className={`text-easy-title font-bold ${data.summary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                NT${data.summary.profit.toLocaleString()}
              </div>
            </IOSCardContent>
          </IOSCard>
          <IOSCard>
            <IOSCardContent className="pt-6">
              <div className="text-easy-subheading text-gray-600 mb-1">利潤率</div>
              <div className={`text-easy-title font-bold ${parseFloat(data.summary.profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.summary.profitMargin}%
              </div>
            </IOSCardContent>
          </IOSCard>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="篩選類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部類型</SelectItem>
            {COST_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IOSInput
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          className="flex-1"
        />
        <IOSInput
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          className="flex-1"
        />
      </div>

      {/* Cost by Type */}
      {data && Object.keys(data.costByType).length > 0 && (
        <IOSCard>
          <IOSCardHeader>
            <IOSCardTitle>按類型統計</IOSCardTitle>
          </IOSCardHeader>
          <IOSCardContent>
            <div className="space-y-3">
              {Object.entries(data.costByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, amount]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-easy-body font-medium">{getTypeLabel(type)}</span>
                    <span className="text-easy-heading font-bold text-red-600">
                      NT${amount.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </IOSCardContent>
        </IOSCard>
      )}

      {/* Cost by Category */}
      {data && Object.keys(data.costByCategory).length > 0 && (
        <IOSCard>
          <IOSCardHeader>
            <IOSCardTitle>按分類統計</IOSCardTitle>
          </IOSCardHeader>
          <IOSCardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(data.costByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-easy-body font-medium">{getCategoryLabel(category)}</span>
                    <span className="text-easy-subheading font-bold text-red-600">
                      NT${amount.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </IOSCardContent>
        </IOSCard>
      )}

      {/* Cost Records List */}
      <IOSCard>
        <IOSCardHeader>
          <IOSCardTitle>成本記錄明細</IOSCardTitle>
        </IOSCardHeader>
        <IOSCardContent>
          {loading ? (
            <div className="text-center py-12 text-easy-body text-gray-500">載入中...</div>
          ) : !data || data.records.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">尚無成本記錄</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {data.records.map((record) => (
                  <div key={record.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{getTypeLabel(record.type)}</Badge>
                          <Badge variant="secondary">{getCategoryLabel(record.category)}</Badge>
                          <div className="text-xs text-gray-500">
                            {new Date(record.date).toLocaleDateString('zh-TW')}
                          </div>
                        </div>
                        {record.description && (
                          <p className="text-easy-body text-gray-900 mb-2">{record.description}</p>
                        )}
                        <div className="text-easy-heading font-bold text-red-600">
                          NT${record.amount.toLocaleString()}
                        </div>
                        {record.items && record.items.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            <div className="font-medium mb-1">明細：</div>
                            <ul className="list-disc list-inside space-y-1">
                              {record.items.map((item, idx) => (
                                <li key={idx}>
                                  {item.item} x {item.quantity} = NT${item.subtotal.toLocaleString()}
                                </li>
                              ))}
                            </ul>
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

      {/* Add Cost Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>記錄成本</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCost} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>成本類型 *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>成本分類 *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>日期 *</Label>
                <IOSInput
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>總金額（自動計算）*</Label>
                <IOSInput
                  type="number"
                  step="0.01"
                  value={formData.amount || calculateItemsTotal()}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="自動計算或手動輸入"
                  readOnly={formData.items.some(i => i.item && i.unitPrice)}
                  required
                />
              </div>
            </div>

            <div>
              <Label>說明</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="成本說明（選填）"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>明細項目</Label>
                <IOSButton type="button" variant="outline" size="sm" onClick={addFormItem}>
                  <Plus className="h-3 w-3" />
                </IOSButton>
              </div>
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <IOSInput
                      placeholder="項目名稱"
                      value={item.item}
                      onChange={(e) => {
                        const newItems = [...formData.items]
                        newItems[index].item = e.target.value
                        setFormData({ ...formData, items: newItems })
                      }}
                      className="flex-1"
                    />
                    <IOSInput
                      type="number"
                      min="1"
                      placeholder="數量"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const newItems = [...formData.items]
                        newItems[index].quantity = parseInt(e.target.value) || 1
                        setFormData({ ...formData, items: newItems })
                      }}
                      className="w-20"
                    />
                    <IOSInput
                      type="number"
                      step="0.01"
                      placeholder="單價"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const newItems = [...formData.items]
                        newItems[index].unitPrice = e.target.value
                        setFormData({ ...formData, items: newItems })
                      }}
                      className="w-24"
                    />
                    <IOSButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFormItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </IOSButton>
                  </div>
                ))}
              </div>
              {calculateItemsTotal() > 0 && (
                <div className="mt-2 text-sm text-gray-600 text-right">
                  明細小計：NT${calculateItemsTotal().toLocaleString()}
                </div>
              )}
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
