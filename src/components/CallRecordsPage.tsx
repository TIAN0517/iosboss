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
import { Textarea } from '@/components/ui/textarea'
import {
  Phone,
  RefreshCw,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
} from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface Customer {
  id: string
  name: string
  phone: string
}

interface CallRecord {
  id: string
  customerId: string | null
  phoneNumber: string
  duration: number
  status: 'answered' | 'missed' | 'voicemail' | 'callback'
  notes: string | null
  callTime: Date
  customer: Customer | null
}

const STATUS_MAP = {
  answered: { label: '已接聽', color: 'default', icon: CheckCircle },
  missed: { label: '未接', color: 'destructive', icon: XCircle },
  voicemail: { label: '語音留言', color: 'secondary', icon: AlertCircle },
  callback: { label: '待回電', color: 'secondary', icon: Clock },
}

export function CallRecordsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)

  const [formData, setFormData] = useState({
    customerId: '',
    phoneNumber: '',
    duration: '',
    status: 'answered' as CallRecord['status'],
    notes: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [callsRes, customersRes] = await Promise.all([
        fetch('/api/call-records'),
        fetch('/api/customers'),
      ])
      if (callsRes.ok) setCalls(await callsRes.json())
      if (customersRes.ok) setCustomers(await customersRes.json())
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
      const response = await fetch('/api/call-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          duration: parseInt(formData.duration) || 0,
          customerId: formData.customerId || null,
        }),
      })
      if (response.ok) {
        triggerHaptic('success')
        setShowAddDialog(false)
        setFormData({ customerId: '', phoneNumber: '', duration: '', status: 'answered', notes: '' })
        loadData()
      }
    } catch (error) {
      triggerHaptic('error')
    }
  }

  const filteredCalls = calls.filter(c =>
    c.phoneNumber.includes(searchTerm) ||
    (c.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-easy-title font-bold text-gray-900">來電記錄</h2>
          <p className="text-easy-body text-gray-600">記錄客戶來電，追蹤回電狀態</p>
        </div>
        <div className="flex gap-2">
          <IOSButton onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            記錄來電
          </IOSButton>
          <IOSButton variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </IOSButton>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <IOSInput
          placeholder="搜尋電話號碼或客戶名稱..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <IOSCard>
        <IOSCardHeader>
          <IOSCardTitle>來電記錄 ({filteredCalls.length})</IOSCardTitle>
        </IOSCardHeader>
        <IOSCardContent>
          {loading ? (
            <div className="text-center py-12 text-easy-body text-gray-500">載入中...</div>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">尚無來電記錄</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {filteredCalls.map((call) => {
                  const status = STATUS_MAP[call.status]
                  const StatusIcon = status.icon
                  return (
                    <div key={call.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={status.color as any} className="flex items-center gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(call.callTime).toLocaleString('zh-TW')}
                            </span>
                          </div>
                          <div className="text-easy-heading font-semibold text-gray-900 mb-1">
                            {call.phoneNumber}
                          </div>
                          {call.customer && (
                            <div className="text-sm text-gray-600 mb-1">
                              <User className="h-3 w-3 inline mr-1" />
                              {call.customer.name}
                            </div>
                          )}
                          {call.duration > 0 && (
                            <div className="text-xs text-gray-500">
                              通話時長：{Math.floor(call.duration / 60)}分{call.duration % 60}秒
                            </div>
                          )}
                          {call.notes && (
                            <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {call.notes}
                            </div>
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>記錄來電</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <Label>客戶（選填）</Label>
              <Select value={formData.customerId || "none"} onValueChange={(v) => setFormData({ ...formData, customerId: v === "none" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="選擇客戶" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">無對應客戶</SelectItem>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>來電號碼 *</Label>
              <IOSInput value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} placeholder="0912345678" required />
            </div>
            <div>
              <Label>通話狀態 *</Label>
              <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="answered">已接聽</SelectItem>
                  <SelectItem value="missed">未接</SelectItem>
                  <SelectItem value="voicemail">語音留言</SelectItem>
                  <SelectItem value="callback">待回電</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>通話時長（秒）</Label>
              <IOSInput type="number" min="0" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>備註</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="來電內容摘要..." rows={3} />
            </div>
            <DialogFooter>
              <IOSButton type="button" variant="outline" onClick={() => setShowAddDialog(false)}>取消</IOSButton>
              <IOSButton type="submit">確認記錄</IOSButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
