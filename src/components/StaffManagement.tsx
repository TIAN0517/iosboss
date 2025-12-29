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
  Users,
  RefreshCw,
  Plus,
  Search,
  Shield,
  UserCog,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  ExternalLink,
} from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface Staff {
  id: string
  name: string
  username: string
  email: string | null
  phone: string | null
  role: 'admin' | 'staff' | 'driver' | 'accountant'
  isActive: boolean
  createdAt: Date
}

const ROLE_MAP = {
  admin: { label: '系統管理員', color: 'destructive', icon: Shield },
  staff: { label: '一般員工', color: 'default', icon: Users },
  driver: { label: '司機', color: 'secondary', icon: UserCog },
  accountant: { label: '會計', color: 'outline', icon: UserCog },
}

export function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    role: 'staff' as Staff['role'],
    isActive: true,
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/staff')
      if (res.ok) {
        const data = await res.json()
        setStaff(data)
      }
    } catch (error) {
      console.error('Error loading staff:', error)
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

    if (!formData.name || !formData.username || !formData.password || !formData.role) {
      alert('請填寫必要欄位')
      return
    }

    try {
      triggerHaptic('medium')
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          password: formData.password,
          email: formData.email || null,
          phone: formData.phone || null,
          role: formData.role,
        }),
      })

      if (response.ok) {
        triggerHaptic('success')
        alert('員工新增成功！')
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
      alert('新增失敗')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    triggerHaptic('light')

    if (!selectedStaff) return

    try {
      triggerHaptic('medium')
      const response = await fetch(`/api/staff/${selectedStaff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          role: formData.role,
          isActive: formData.isActive,
          ...(formData.password && { password: formData.password }),
        }),
      })

      if (response.ok) {
        triggerHaptic('success')
        alert('員工更新成功！')
        setShowEditDialog(false)
        setSelectedStaff(null)
        resetForm()
        loadData()
      } else {
        triggerHaptic('error')
        const error = await response.json()
        alert(error.error || '更新失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      alert('更新失敗')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此員工嗎？')) return

    triggerHaptic('light')
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        triggerHaptic('success')
        alert('員工已刪除')
        loadData()
      } else {
        triggerHaptic('error')
        alert('刪除失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      alert('刪除失敗')
    }
  }

  const handleToggleActive = async (staff: Staff) => {
    triggerHaptic('light')
    try {
      const response = await fetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !staff.isActive }),
      })

      if (response.ok) {
        triggerHaptic('success')
        loadData()
      }
    } catch (error) {
      triggerHaptic('error')
    }
  }

  const openEditDialog = (staff: Staff) => {
    setSelectedStaff(staff)
    setFormData({
      name: staff.name,
      username: staff.username,
      password: '',
      email: staff.email || '',
      phone: staff.phone || '',
      role: staff.role,
      isActive: staff.isActive,
    })
    setShowEditDialog(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      email: '',
      phone: '',
      role: 'staff',
      isActive: true,
    })
  }

  const filteredStaff = staff.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || '').includes(searchTerm)
    const matchRole = roleFilter === 'all' || s.role === roleFilter
    return matchSearch && matchRole
  })

  const stats = {
    total: staff.length,
    active: staff.filter(s => s.isActive).length,
    inactive: staff.filter(s => !s.isActive).length,
    admins: staff.filter(s => s.role === 'admin').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-easy-title font-bold text-gray-900">員工管理</h2>
          <p className="text-easy-body text-gray-600">管理員工資訊和職責分配</p>
        </div>
        <div className="flex gap-2">
          <IOSButton onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            新增員工
          </IOSButton>
          <IOSButton 
            variant="outline" 
            onClick={() => window.open('/register', '_blank')} 
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            員工申請
            <ExternalLink className="h-3 w-3" />
          </IOSButton>
          <IOSButton variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </IOSButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">總員工數</div>
            <div className="text-easy-title font-bold text-gray-900">{stats.total}</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">在職中</div>
            <div className="text-easy-title font-bold text-green-600">{stats.active}</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">已停用</div>
            <div className="text-easy-title font-bold text-red-600">{stats.inactive}</div>
          </IOSCardContent>
        </IOSCard>
        <IOSCard>
          <IOSCardContent className="pt-6">
            <div className="text-easy-subheading text-gray-600 mb-1">管理員</div>
            <div className="text-easy-title font-bold text-orange-600">{stats.admins}</div>
          </IOSCardContent>
        </IOSCard>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <IOSInput
            placeholder="搜尋姓名、帳號或電話..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="篩選角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            <SelectItem value="admin">系統管理員</SelectItem>
            <SelectItem value="staff">一般員工</SelectItem>
            <SelectItem value="driver">司機</SelectItem>
            <SelectItem value="accountant">會計</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 員工申請提示卡片 */}
      <IOSCard className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <IOSCardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-3 rounded-xl">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-easy-heading font-bold text-gray-900">員工自行申請帳號</h3>
                <p className="text-easy-body text-gray-600 mt-1">新員工可以自行申請帳號，審核通過後即可使用</p>
              </div>
            </div>
            <IOSButton 
              onClick={() => window.open('/register', '_blank')}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="h-4 w-4" />
              前往申請頁面
              <ExternalLink className="h-3 w-3" />
            </IOSButton>
          </div>
        </IOSCardContent>
      </IOSCard>

      <IOSCard>
        <IOSCardHeader>
          <IOSCardTitle className="flex items-center gap-2 text-easy-heading">
            <Users className="h-6 w-6 text-indigo-600" />
            員工列表 ({filteredStaff.length})
          </IOSCardTitle>
        </IOSCardHeader>
        <IOSCardContent>
          {loading ? (
            <div className="text-center py-12 text-easy-body text-gray-500">載入中...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">尚無員工記錄</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {filteredStaff.map((s) => {
                  const role = ROLE_MAP[s.role]
                  const RoleIcon = role.icon
                  return (
                    <div key={s.id} className={`p-5 border-2 rounded-xl transition-all ${s.isActive ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-50'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <h3 className="text-easy-heading font-bold text-gray-900">
                              {s.name}
                            </h3>
                            <Badge variant={role.color as any} className="flex items-center gap-1 text-easy-caption font-semibold px-2.5 py-1">
                              <RoleIcon className="h-3.5 w-3.5" />
                              {role.label}
                            </Badge>
                            <Badge variant={s.isActive ? 'default' : 'secondary'} className="text-easy-caption font-semibold px-2.5 py-1">
                              {s.isActive ? '在職' : '停用'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                            <div className="space-y-2">
                              <div className="text-easy-caption text-gray-600 font-semibold">帳號</div>
                              <div className="text-easy-body font-bold text-gray-900 break-words leading-relaxed">{s.username}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-easy-caption text-gray-600 font-semibold">電話</div>
                              <div className="text-easy-body font-bold text-gray-900 break-words leading-relaxed">{s.phone || '-'}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-easy-caption text-gray-600 font-semibold">Email</div>
                              <div className="text-easy-body font-bold text-gray-900 break-all leading-relaxed">{s.email || '-'}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-easy-caption text-gray-600 font-semibold">加入日期</div>
                              <div className="text-easy-body font-bold text-gray-900 leading-relaxed">{new Date(s.createdAt).toLocaleDateString('zh-TW')}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <IOSButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(s)}
                            title={s.isActive ? '停用' : '啟用'}
                          >
                            {s.isActive ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                          </IOSButton>
                          <IOSButton
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(s)}
                          >
                            <Edit className="h-4 w-4" />
                          </IOSButton>
                          <IOSButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(s.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增員工</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>姓名 *</Label>
                <IOSInput value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label>帳號 *</Label>
                <IOSInput value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label>密碼 *</Label>
              <IOSInput type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
            </div>
            <div>
              <Label>角色 *</Label>
              <Select value={formData.role} onValueChange={(v: any) => setFormData({ ...formData, role: v })} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">系統管理員</SelectItem>
                  <SelectItem value="staff">一般員工</SelectItem>
                  <SelectItem value="driver">司機</SelectItem>
                  <SelectItem value="accountant">會計</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>電話</Label>
                <IOSInput value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="0912345678" />
              </div>
              <div>
                <Label>Email</Label>
                <IOSInput type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="example@mail.com" />
              </div>
            </div>
            <DialogFooter>
              <IOSButton type="button" variant="outline" onClick={() => { setShowAddDialog(false); resetForm() }}>取消</IOSButton>
              <IOSButton type="submit">確認新增</IOSButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯員工</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <Label>姓名 *</Label>
              <IOSInput value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>角色 *</Label>
                <Select value={formData.role} onValueChange={(v: any) => setFormData({ ...formData, role: v })} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">系統管理員</SelectItem>
                    <SelectItem value="staff">一般員工</SelectItem>
                    <SelectItem value="driver">司機</SelectItem>
                    <SelectItem value="accountant">會計</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5"
                />
                <Label htmlFor="isActive">在職中</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>電話</Label>
                <IOSInput value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <IOSInput type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>新密碼（選填，留空則不改）</Label>
              <IOSInput type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            </div>
            <DialogFooter>
              <IOSButton type="button" variant="outline" onClick={() => { setShowEditDialog(false); setSelectedStaff(null); resetForm() }}>取消</IOSButton>
              <IOSButton type="submit">確認更新</IOSButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
