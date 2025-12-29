'use client'

import { useState, useEffect } from 'react'
import { IOSButton } from '@/components/ui/ios-button'
import { IOSInput } from '@/components/ui/ios-input'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  FileText,
  RefreshCw,
  Plus,
  Calendar,
  DollarSign,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface Customer {
  id: string
  name: string
  phone: string
}

interface MonthlyStatement {
  id: string
  customerId: string
  month: string
  periodStart: Date
  periodEnd: Date
  totalOrders: number
  totalAmount: number
  paidAmount: number
  balance: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  createdAt: Date
  customer: Customer
}

const STATUS_MAP = {
  draft: { label: '草稿', color: 'secondary', icon: FileText },
  sent: { label: '已發送', color: 'default', icon: Clock },
  paid: { label: '已付款', color: 'default', icon: CheckCircle },
  overdue: { label: '逾期', color: 'destructive', icon: AlertTriangle },
}

export function MonthlyStatementPage() {
  const [statements, setStatements] = useState<MonthlyStatement[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [monthFilter, setMonthFilter] = useState('')

  const [formData, setFormData] = useState({
    customerId: '',
    month: new Date().toISOString().slice(0, 7),
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [customersRes, statementsRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/monthly-statements'),
      ])
      if (customersRes.ok) setCustomers(await customersRes.json())
      if (statementsRes.ok) setStatements(await statementsRes.json())
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    triggerHaptic('light')
    try {
      const response = await fetch('/api/monthly-statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        triggerHaptic('success')
        alert('月結報表生成成功！')
        setShowGenerateDialog(false)
        loadData()
      } else {
        triggerHaptic('error')
        const error = await response.json()
        alert(error.error || '生成失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      alert('生成失敗')
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    triggerHaptic('light')
    try {
      const response = await fetch('/api/monthly-statements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (response.ok) {
        triggerHaptic('success')
        loadData()
      }
    } catch (error) {
      triggerHaptic('error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-easy-title font-bold text-gray-900">月結報表</h2>
          <p className="text-easy-body text-gray-600">自動生成月結單，管理月結客戶帳務</p>
        </div>
        <div className="flex gap-2">
          <IOSButton onClick={() => setShowGenerateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            生成月結
          </IOSButton>
          <IOSButton variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </IOSButton>
        </div>
      </div>

      <IOSInput
        type="month"
        value={monthFilter}
        onChange={(e) => setMonthFilter(e.target.value)}
        className="w-full sm:w-[200px]"
      />

      <IOSCard>
        <IOSCardHeader>
          <IOSCardTitle>月結報表列表</IOSCardTitle>
        </IOSCardHeader>
        <IOSCardContent>
          {loading ? (
            <div className="text-center py-12 text-easy-body text-gray-500">載入中...</div>
          ) : statements.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">尚無月結報表</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {statements
                  .filter(s => !monthFilter || s.month.startsWith(monthFilter))
                  .map((stmt) => {
                    const status = STATUS_MAP[stmt.status]
                    const StatusIcon = status.icon
                    return (
                      <div key={stmt.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-easy-heading font-semibold">{stmt.customer.name}</h3>
                              <Badge variant={status.color as any} className="flex items-center gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                              <span className="text-xs text-gray-500">{stmt.month}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-3 text-sm">
                              <div>
                                <div className="text-gray-500">訂單數</div>
                                <div className="font-semibold">{stmt.totalOrders}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">總額</div>
                                <div className="font-semibold text-gray-900">NT${stmt.totalAmount}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">已付</div>
                                <div className="font-semibold text-green-600">NT${stmt.paidAmount}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">餘額</div>
                                <div className={`font-semibold ${stmt.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  NT${stmt.balance}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {stmt.status !== 'paid' && (
                              <IOSButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateStatus(stmt.id, 'paid')}
                              >
                                標記已付
                              </IOSButton>
                            )}
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

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>生成月結報表</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <Label>客戶 *</Label>
              <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v })} required>
                <SelectTrigger><SelectValue placeholder="選擇客戶" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>月份 *</Label>
              <IOSInput
                type="month"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <IOSButton type="button" variant="outline" onClick={() => setShowGenerateDialog(false)}>取消</IOSButton>
              <IOSButton type="submit">生成報表</IOSButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
