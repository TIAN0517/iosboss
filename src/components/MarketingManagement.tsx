'use client'

import { useState, useEffect } from 'react'
import { IOSButton } from '@/components/ui/ios-button'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { IOSInput } from '@/components/ui/ios-input'
import { Megaphone, RefreshCw, Plus, Calendar, Tag, Gift } from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface Promotion {
  id: string
  name: string
  type: 'percentage' | 'fixed' | 'free_shipping'
  discountValue: number
  minAmount: number | null
  startDate: Date
  endDate: Date
  description: string | null
  isActive: boolean
}

const PROMOTION_TYPES = [
  { value: 'percentage', label: '折扣百分比' },
  { value: 'fixed', label: '固定金額' },
  { value: 'free_shipping', label: '免運費' },
]

export function MarketingManagement() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [customerGroups, setCustomerGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage' as Promotion['type'],
    discountValue: '',
    minAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [promotionsRes, groupsRes] = await Promise.all([
        fetch('/api/promotions'),
        fetch('/api/customer-groups'),
      ])
      if (promotionsRes.ok) setPromotions(await promotionsRes.json())
      if (groupsRes.ok) setCustomerGroups(await groupsRes.json())
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    triggerHaptic('light')
    try {
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        triggerHaptic('success')
        setShowAddDialog(false)
        loadData()
      }
    } catch (error) {
      triggerHaptic('error')
    }
  }

  const getTypeLabel = (type: string) => {
    return PROMOTION_TYPES.find(t => t.value === type)?.label || type
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-easy-title font-bold text-gray-900">營銷活動</h2>
          <p className="text-easy-body text-gray-600">管理促銷活動、優惠券和客戶分組</p>
        </div>
        <div className="flex gap-2">
          <IOSButton onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            新增活動
          </IOSButton>
          <IOSButton variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </IOSButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IOSCard>
          <IOSCardHeader>
            <IOSCardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-red-600" />
              促銷活動 ({promotions.length})
            </IOSCardTitle>
          </IOSCardHeader>
          <IOSCardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">載入中...</div>
            ) : promotions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">尚無促銷活動</div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {promotions.map((p) => (
                    <div key={p.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{p.name}</h4>
                        <Badge variant={p.isActive ? 'default' : 'secondary'}>
                          {p.isActive ? '進行中' : '已結束'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>類型：{getTypeLabel(p.type)}</div>
                        <div>優惠：{p.type === 'percentage' ? `${p.discountValue}%` : `NT$${p.discountValue}`}</div>
                        {p.minAmount && <div>最低消費：NT${p.minAmount}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </IOSCardContent>
        </IOSCard>

        <IOSCard>
          <IOSCardHeader>
            <IOSCardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-600" />
              客戶分組 ({customerGroups.length})
            </IOSCardTitle>
          </IOSCardHeader>
          <IOSCardContent className="p-0">
            {loading ? (
              <div className="text-center py-8 text-gray-500">載入中...</div>
            ) : customerGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">尚無客戶分組</div>
            ) : (
              <div className="space-y-2 px-6 pb-6">
                {customerGroups.map((g) => {
                  // 計算正確的折扣百分比（discount 是小數，需要轉換為百分比）
                  const discountPercent = typeof g.discount === 'number' 
                    ? (g.discount < 1 ? g.discount * 100 : g.discount).toFixed(0)
                    : '0'
                  
                  return (
                    <div 
                      key={g.id} 
                      className="p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base text-gray-900 mb-1">{g.name}</h4>
                          <div className="text-sm text-gray-600 leading-relaxed">
                            {g.description || '無描述'}
                          </div>
                          {g.creditTerm && (
                            <div className="text-xs text-blue-600 mt-1">
                              信用期限: {g.creditTerm} 天
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <Badge 
                            variant="secondary" 
                            className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1 text-sm font-semibold whitespace-nowrap"
                          >
                            {discountPercent}% 折扣
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>
            )}
          </IOSCardContent>
        </IOSCard>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增促銷活動</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <Label>活動名稱 *</Label>
              <IOSInput value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="例：新春優惠" required />
            </div>
            <div>
              <Label>活動類型 *</Label>
              <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROMOTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>優惠值 *</Label>
                <IOSInput type="number" step="0.01" value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })} required />
              </div>
              <div>
                <Label>最低消費</Label>
                <IOSInput type="number" step="0.01" value={formData.minAmount} onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })} placeholder="選填" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>開始日期 *</Label>
                <IOSInput type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
              </div>
              <div>
                <Label>結束日期 *</Label>
                <IOSInput type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
              </div>
            </div>
            <DialogFooter>
              <IOSButton type="button" variant="outline" onClick={() => setShowAddDialog(false)}>取消</IOSButton>
              <IOSButton type="submit">新增活動</IOSButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
