'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IOSButton } from '@/components/ui/ios-button'
import { BrandIcon } from '@/components/BrandIcon'
import { triggerHaptic } from '@/lib/ios-utils'
import {
  Database,
  Table as TableIcon,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  ChevronRight,
  Users,
  Package,
  ShoppingCart,
  ClipboardCheck,
  Warehouse,
  Calendar,
  FileText,
  Phone,
  DollarSign,
  Settings,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'

// 定義所有數據表
const TABLES = [
  { id: 'users', name: '用戶管理', icon: Users, color: 'text-blue-600', description: '系統用戶和權限' },
  { id: 'customers', name: '客戶管理', icon: Users, color: 'text-green-600', description: '客戶資料和群組' },
  { id: 'products', name: '產品管理', icon: Package, color: 'text-purple-600', description: '瓦斯產品和價格' },
  { id: 'orders', name: '訂單管理', icon: ShoppingCart, color: 'text-orange-600', description: '瓦斯訂單記錄' },
  { id: 'checks', name: '支票管理', icon: ClipboardCheck, color: 'text-amber-600', description: '支票和票據管理' },
  { id: 'inventory', name: '庫存管理', icon: Warehouse, color: 'text-cyan-600', description: '產品庫存數量' },
  { id: 'meterReadings', name: '抄表記錄', icon: FileText, color: 'text-indigo-600', description: '管線瓦斯抄表' },
  { id: 'callRecords', name: '來電記錄', icon: Phone, color: 'text-rose-600', description: '客戶來電記錄' },
  { id: 'scheduleSheets', name: '休假表', icon: Calendar, color: 'text-violet-600', description: '員工休假申請' },
  { id: 'costRecords', name: '成本記錄', icon: DollarSign, color: 'text-emerald-600', description: '成本和費用記錄' },
]

interface DatabaseRecord {
  id: string
  [key: string]: any
}

export function DatabaseManagement() {
  const [activeTable, setActiveTable] = useState<string | null>(null)
  const [records, setRecords] = useState<DatabaseRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<DatabaseRecord | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  // 載入表格數據
  const loadTableData = async (tableName: string) => {
    setLoading(true)
    triggerHaptic('light')
    try {
      const response = await fetch(`/api/database/${tableName}`)
      if (response.ok) {
        const data = await response.json()
        setRecords(data.records || [])
        setTotalCount(data.total || 0)
        setPage(1)
      } else {
        console.error('載入失敗:', await response.text())
      }
    } catch (error) {
      console.error('載入表格數據失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 刪除記錄
  const deleteRecord = async (tableName: string, recordId: string) => {
    if (!confirm('確定要刪除這筆記錄嗎？')) return

    triggerHaptic('warning')
    setLoading(true)
    try {
      const response = await fetch(`/api/database/${tableName}/${recordId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        triggerHaptic('success')
        loadTableData(tableName)
      } else {
        triggerHaptic('error')
        alert('刪除失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      console.error('刪除失敗:', error)
      alert('刪除失敗')
    } finally {
      setLoading(false)
    }
  }

  // 保存記錄
  const saveRecord = async (tableName: string, recordId: string | null) => {
    triggerHaptic('medium')
    setLoading(true)
    try {
      const url = recordId
        ? `/api/database/${tableName}/${recordId}`
        : `/api/database/${tableName}`

      const response = await fetch(url, {
        method: recordId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })

      if (response.ok) {
        triggerHaptic('success')
        setEditMode(false)
        setSelectedRecord(null)
        setEditData({})
        loadTableData(tableName)
      } else {
        triggerHaptic('error')
        alert('保存失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      console.error('保存失敗:', error)
      alert('保存失敗')
    } finally {
      setLoading(false)
    }
  }

  // 獲取表格的顯示欄位
  const getTableColumns = (tableName: string): string[] => {
    const columnMap: Record<string, string[]> = {
      users: ['id', 'name', 'username', 'email', 'phone', 'role', 'isActive'],
      customers: ['id', 'name', 'phone', 'address', 'paymentType', 'balance', 'creditLimit'],
      products: ['id', 'name', 'code', 'price', 'cost', 'capacity', 'unit', 'isActive'],
      orders: ['id', 'orderNo', 'orderDate', 'total', 'status', 'deliveryDate'],
      checks: ['id', 'checkNo', 'bankName', 'checkDate', 'amount', 'status'],
      inventory: ['id', 'productId', 'quantity', 'minStock'],
      meterReadings: ['id', 'customerId', 'previousReading', 'currentReading', 'usage', 'readingDate'],
      callRecords: ['id', 'customerId', 'phoneNumber', 'callTime', 'duration', 'status'],
      scheduleSheets: ['id', 'title', 'year', 'month', 'status', 'submittedAt'],
      costRecords: ['id', 'type', 'category', 'amount', 'description', 'date'],
    }
    return columnMap[tableName] || ['id']
  }

  // 格式化顯示值
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? '是' : '否'
    if (key.includes('Date') || key.includes('At') || key.includes('Time')) {
      return new Date(value).toLocaleString('zh-TW')
    }
    if (typeof value === 'number' && (key.includes('price') || key.includes('cost') || key.includes('amount') || key.includes('balance') || key.includes('total'))) {
      return `NT$ ${value.toLocaleString()}`
    }
    return String(value)
  }

  // 過濾記錄
  const filteredRecords = records.filter(record =>
    Object.values(record).some(value =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  // 當沒有選擇表格時顯示表格列表
  if (!activeTable) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">數據庫管理</h2>
            <p className="text-slate-600">直接查看和編輯系統數據</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            設定
          </Button>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TABLES.map((table) => {
            const Icon = table.icon
            return (
              <Card
                key={table.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-300"
                onClick={() => {
                  setActiveTable(table.id)
                  loadTableData(table.id)
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <Icon className={`h-6 w-6 ${table.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-lg">{table.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{table.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-blue-600">查看數據</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Database className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">數據庫管理說明</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 點擊表格卡片查看數據</li>
                  <li>• 可以編輯、新增、刪除記錄</li>
                  <li>• 支持搜索和分頁</li>
                  <li>• 變更即時保存到數據庫</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 顯示選定表格的數據
  const columns = getTableColumns(activeTable)
  const currentTable = TABLES.find(t => t.id === activeTable)
  const TableIcon = currentTable?.icon || TableIcon

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveTable(null)
              setRecords([])
              setSearchQuery('')
            }}
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <TableIcon className={`h-6 w-6 ${currentTable?.color}`} />
              {currentTable?.name}
            </h2>
            <p className="text-slate-600">{currentTable?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTableData(activeTable)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <IOSButton
            onClick={() => {
              setEditMode(true)
              setSelectedRecord({})
              setEditData({})
              triggerHaptic('light')
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            新增記錄
          </IOSButton>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="搜索數據..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column} className="bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{column}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="bg-slate-50 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center py-8">
                      <div className="text-slate-500">
                        <Database className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p>沒有找到數據</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      className="cursor-pointer hover:bg-blue-50"
                      onClick={() => {
                        setSelectedRecord(record)
                        setEditData({ ...record })
                        triggerHaptic('light')
                      }}
                    >
                      {columns.map((column) => (
                        <TableCell key={column} className="max-w-[200px]">
                          <div className="truncate" title={formatValue(column, record[column])}>
                            {formatValue(column, record[column])}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteRecord(activeTable, record.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!selectedRecord || editMode} onOpenChange={(open) => {
        if (!open) {
          setSelectedRecord(null)
          setEditMode(false)
          setEditData({})
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TableIcon className={`h-5 w-5 ${currentTable?.color}`} />
              {editMode ? '新增記錄' : '編輯記錄'}
            </DialogTitle>
            <DialogDescription>
              {currentTable?.name} - {editMode ? '填寫新記錄資訊' : '修改記錄資訊'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {columns.map((column) => (
              <div key={column} className="space-y-2">
                <Label htmlFor={column}>{column}</Label>
                <Input
                  id={column}
                  value={editData[column] || ''}
                  onChange={(e) =>
                    setEditData({ ...editData, [column]: e.target.value })
                  }
                  disabled={column === 'id'} // ID 不能修改
                  className={column === 'id' ? 'bg-slate-100' : ''}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRecord(null)
                setEditMode(false)
                setEditData({})
              }}
            >
              取消
            </Button>
            <IOSButton
              onClick={() => saveRecord(activeTable, selectedRecord?.id || null)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editMode ? '新增' : '保存'}
            </IOSButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
