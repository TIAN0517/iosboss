'use client'

import { useState } from 'react'
import { IOSButton } from '@/components/ui/ios-button'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IOSInput } from '@/components/ui/ios-input'
import { IOSModal } from '@/components/ui/ios-modal'
import { FileSpreadsheet, Download, Calendar, FileText, Package, DollarSign, CheckCircle, Users, TrendingUp, FileBox } from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface ReportOption {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
}

interface ExcelExportToolProps {
  onClose?: () => void
}

const reportOptions: ReportOption[] = [
  {
    id: 'orders',
    name: '訂單報表',
    description: '詳細訂單記錄與營業額統計',
    icon: <FileText className="h-6 w-6" />,
    color: 'text-blue-600',
  },
  {
    id: 'inventory',
    name: '庫存報表',
    description: '目前庫存量與庫存價值',
    icon: <Package className="h-6 w-6" />,
    color: 'text-green-600',
  },
  {
    id: 'costs',
    name: '成本報表',
    description: '各項成本支出明細',
    icon: <DollarSign className="h-6 w-6" />,
    color: 'text-red-600',
  },
  {
    id: 'checks',
    name: '支票報表',
    description: '支票兌現狀況統計',
    icon: <CheckCircle className="h-6 w-6" />,
    color: 'text-purple-600',
  },
  {
    id: 'customers',
    name: '客戶資料',
    description: '客戶名單與欠款情況',
    icon: <Users className="h-6 w-6" />,
    color: 'text-orange-600',
  },
  {
    id: 'monthly',
    name: '月結報表',
    description: '月結客戶應收帳款',
    icon: <Calendar className="h-6 w-6" />,
    color: 'text-indigo-600',
  },
  {
    id: 'profit-loss',
    name: '損益報表',
    description: '營收與利潤分析',
    icon: <TrendingUp className="h-6 w-6" />,
    color: 'text-emerald-600',
  },
  {
    id: 'complete',
    name: '完整報表',
    description: '包含以上所有報表',
    icon: <FileBox className="h-6 w-6" />,
    color: 'text-pink-600',
  },
]

export function ExcelExportTool({ onClose }: ExcelExportToolProps) {
  const [selectedReport, setSelectedReport] = useState<string>('orders')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [exporting, setExporting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleExport = async () => {
    triggerHaptic('light')
    setExporting(true)

    try {
      const response = await fetch('/api/export/excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: selectedReport,
          startDate,
          endDate,
          format: 'xlsx',
        }),
      })

      if (!response.ok) {
        throw new Error('導出失敗')
      }

      // 下載文件
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = getFileName()
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      triggerHaptic('success')
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        onClose?.()
      }, 2000)
    } catch (error) {
      console.error('導出錯誤:', error)
      triggerHaptic('error')
      alert('導出失敗，請稍後再試')
    } finally {
      setExporting(false)
    }
  }

  const getFileName = () => {
    const option = reportOptions.find((opt) => opt.id === selectedReport)
    const dates = `${startDate}_${endDate}`
    return `${option?.name || '報表'}_${dates}.xlsx`
  }

  const getQuickDateRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  const selectedOption = reportOptions.find((opt) => opt.id === selectedReport)

  return (
    <>
      <div className="space-y-6 pb-24 md:pb-6">
        {/* 標題 */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <FileSpreadsheet className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-easy-title font-bold text-gray-900">會計 Excel 導出工具</h2>
            <p className="text-easy-body text-gray-600">選擇報表類型並導出 Excel 文件</p>
          </div>
        </div>

        {/* 報表類型選擇 */}
        <IOSCard>
          <IOSCardHeader>
            <IOSCardTitle>選擇報表類型</IOSCardTitle>
          </IOSCardHeader>
          <IOSCardContent>
            <div className="grid grid-cols-2 gap-3">
              {reportOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    triggerHaptic('light')
                    setSelectedReport(option.id)
                  }}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    selectedReport === option.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={option.color}>{option.icon}</div>
                  <div className="text-center">
                    <div className="text-easy-body font-semibold text-gray-900">{option.name}</div>
                    <div className="text-easy-caption text-gray-600">{option.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </IOSCardContent>
        </IOSCard>

        {/* 日期範圍選擇 */}
        <IOSCard>
          <IOSCardHeader>
            <IOSCardTitle>選擇日期範圍</IOSCardTitle>
          </IOSCardHeader>
          <IOSCardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <label className="mb-2 block text-easy-body font-semibold text-gray-900">開始日期</label>
                <IOSInput
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label className="mb-2 block text-easy-body font-semibold text-gray-900">結束日期</label>
                <IOSInput
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* 快速選擇 */}
            <div className="flex flex-wrap gap-2">
              <IOSButton
                variant="outline"
                size="sm"
                onClick={() => {
                  triggerHaptic('light')
                  getQuickDateRange(7)
                }}
              >
                近7天
              </IOSButton>
              <IOSButton
                variant="outline"
                size="sm"
                onClick={() => {
                  triggerHaptic('light')
                  getQuickDateRange(30)
                }}
              >
                近30天
              </IOSButton>
              <IOSButton
                variant="outline"
                size="sm"
                onClick={() => {
                  triggerHaptic('light')
                  getQuickDateRange(90)
                }}
              >
                近3個月
              </IOSButton>
              <IOSButton
                variant="outline"
                size="sm"
                onClick={() => {
                  triggerHaptic('light')
                  getQuickDateRange(365)
                }}
              >
                近一年
              </IOSButton>
              <IOSButton
                variant="outline"
                size="sm"
                onClick={() => {
                  triggerHaptic('light')
                  const today = new Date()
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                  setStartDate(firstDay.toISOString().split('T')[0])
                  setEndDate(today.toISOString().split('T')[0])
                }}
              >
                本月
              </IOSButton>
              <IOSButton
                variant="outline"
                size="sm"
                onClick={() => {
                  triggerHaptic('light')
                  const today = new Date()
                  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
                  setStartDate(lastMonth.toISOString().split('T')[0])
                  setEndDate(lastMonthEnd.toISOString().split('T')[0])
                }}
              >
                上月
              </IOSButton>
            </div>
          </IOSCardContent>
        </IOSCard>

        {/* 預覽與導出 */}
        <IOSCard>
          <IOSCardHeader>
            <IOSCardTitle>導出確認</IOSCardTitle>
          </IOSCardHeader>
          <IOSCardContent className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className={selectedOption?.color}>{selectedOption?.icon}</div>
                <div className="text-easy-subheading font-bold text-gray-900">{selectedOption?.name}</div>
              </div>
              <div className="space-y-2 text-easy-body text-gray-700">
                <div>📅 日期範圍：{startDate} 至 {endDate}</div>
                <div>📁 檔案名稱：{getFileName()}</div>
                <div>📊 格式：Excel (.xlsx)</div>
              </div>
            </div>

            <IOSButton
              onClick={handleExport}
              loading={exporting}
              className="w-full gap-2"
              size="lg"
            >
              <Download className="h-5 w-5" />
              {exporting ? '導出中...' : '導出 Excel'}
            </IOSButton>
          </IOSCardContent>
        </IOSCard>
      </div>

      {/* 成功提示 */}
      {showSuccess && (
        <IOSModal isOpen={showSuccess} onClose={() => setShowSuccess(false)}>
          <div className="flex flex-col items-center gap-4 p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center">
              <div className="text-easy-heading font-bold text-gray-900">導出成功！</div>
              <div className="text-easy-body text-gray-600">Excel 文件已下載</div>
            </div>
          </div>
        </IOSModal>
      )}
    </>
  )
}
