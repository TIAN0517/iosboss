'use client'

import { useState } from 'react'
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
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  Trash2,
  Edit,
  DollarSign,
  Database
} from 'lucide-react'
import { useCustomers, useCustomerGroups, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useApi'
import { showSuccess, showError, showLoading, dismissToast } from '@/hooks/useToast'

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
  paymentType: string
  groupId?: string | null
  group?: CustomerGroup
  note?: string | null
  balance?: number
  creditLimit?: number
  lastOrderAt?: string | null
  createdAt: string
}

export function CustomerManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [chuanjiLoading, setChuanjiLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    paymentType: 'cash',
    groupId: '',
    note: '',
    creditLimit: '0',
  })

  // 使用 React Query hooks
  const { data: customersData, isLoading: loading } = useCustomers({
    search: searchTerm,
    limit: 100, // 客戶數量通常較少
  })
  const { data: groupsData } = useCustomerGroups()

  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()

  const customers = customersData?.data || []
  const groups = groupsData || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const toastId = showLoading(selectedCustomer ? '更新客戶中...' : '新增客戶中...')

    try {
      const submitData = {
        ...formData,
        groupId: formData.groupId === '__none__' ? null : formData.groupId || null,
        creditLimit: parseFloat(formData.creditLimit),
      }

      if (selectedCustomer) {
        await updateCustomer.mutateAsync({ id: selectedCustomer.id, data: submitData })
        showSuccess('客戶更新成功')
      } else {
        await createCustomer.mutateAsync(submitData)
        showSuccess('客戶新增成功')
      }

      setShowAddDialog(false)
      resetForm()
    } catch (error: any) {
      showError(error.message || '操作失敗，請稍後再試')
    } finally {
      dismissToast(toastId)
    }
  }

  const handleDelete = async (id: string) => {
    const toastId = showLoading('刪除客戶中...')

    try {
      await deleteCustomer.mutateAsync(id)
      showSuccess('客戶刪除成功')
    } catch (error: any) {
      showError(error.message || '刪除失敗，請稍後再試')
    } finally {
      dismissToast(toastId)
    }
  }

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      paymentType: customer.paymentType,
      groupId: customer.groupId || '',
      note: customer.note || '',
      creditLimit: String(customer.creditLimit || 0),
    })
    setShowAddDialog(true)
  }

  // 查詢川紀客戶
  const handleQueryChuanji = async () => {
    if (!formData.phone) {
      showError('請先輸入電話號碼')
      return
    }

    setChuanjiLoading(true)
    try {
      const res = await fetch(`/api/integration/chuanji/customers?phone=${formData.phone}&syncLocal=true`)
      const data = await res.json()

      if (data.found && data.customer) {
        // 自動填入表單
        setFormData({
          name: data.customer.name,
          phone: data.customer.phone,
          address: data.customer.address,
          paymentType: data.customer.paymentType,
          groupId: '',
          note: '',
          creditLimit: String(data.customer.creditLimit || 0),
        })
        showSuccess(`找到客戶：${data.customer.name}`)
      } else {
        showWarning('在川紀系統中找不到此客戶')
      }
    } catch (error) {
      console.error('查詢川紀失敗:', error)
      showError('查詢失敗，請稍後再試')
    } finally {
      setChuanjiLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      paymentType: 'cash',
      groupId: '',
      note: '',
      creditLimit: '0',
    })
    setSelectedCustomer(null)
  }

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            客戶管理
          </CardTitle>
          <CardDescription>管理瓦斯客戶資料</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜尋客戶名稱、電話、地址..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => { resetForm(); setShowAddDialog(true) }}>
              <Plus className="w-4 h-4 mr-2" />
              新增客戶
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                {searchTerm ? '找不到符合的客戶' : '尚無客戶資料'}
              </p>
              {!searchTerm && (
                <Button onClick={() => { resetForm(); setShowAddDialog(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增第一位客戶
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {customers.map((customer) => (
                  <Card key={customer.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{customer.name}</h3>
                          <Badge variant={customer.paymentType === 'cash' ? 'default' : 'secondary'}>
                            {customer.paymentType === 'cash' ? '現金' : '月結'}
                          </Badge>
                          {customer.group && (
                            <Badge variant="outline">{customer.group.name}</Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {customer.phone}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {customer.address}
                          </div>
                          {customer.creditLimit && customer.creditLimit > 0 && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              信用額度: ${customer.creditLimit}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(customer)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(customer.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCustomer ? '編輯客戶' : '新增客戶'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">客戶名稱 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">電話 *</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleQueryChuanji}
                    disabled={chuanjiLoading || !formData.phone}
                    title="查詢川紀客戶"
                  >
                    <Database className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">點擊圖示從川紀系統查詢客戶</p>
              </div>

              <div>
                <Label htmlFor="address">地址 *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="paymentType">付款方式</Label>
                <Select
                  value={formData.paymentType}
                  onValueChange={(value) => setFormData({ ...formData, paymentType: value })}
                >
                  <SelectTrigger id="paymentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">現金</SelectItem>
                    <SelectItem value="monthly">月結</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="group">客戶分組</Label>
                <Select
                  value={formData.groupId}
                  onValueChange={(value) => setFormData({ ...formData, groupId: value })}
                >
                  <SelectTrigger id="group">
                    <SelectValue placeholder={groups.length === 0 ? "尚無分組資料" : "選擇分組"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">無分組</SelectItem>
                    {groups.length === 0 ? (
                      <div className="p-2 text-center text-sm text-gray-500">
                        尚無分組資料
                        <br />
                        <span className="text-xs">可在管理設定新增分組</span>
                      </div>
                    ) : (
                      groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{group.name}</span>
                            <span className="text-xs text-green-600">{group.discount}% 折扣</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {groups.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">選擇分組可自動享有折扣優惠</p>
                )}
              </div>

              <div>
                <Label htmlFor="creditLimit">信用額度</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="note">備註</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                取消
              </Button>
              <Button type="submit">
                {selectedCustomer ? '更新' : '新增'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
