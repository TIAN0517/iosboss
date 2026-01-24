'use client'

import { useState, useEffect } from 'react'
import { IOSButton } from '@/components/ui/ios-button'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IOSInput } from '@/components/ui/ios-input'
import { BarChart3, RefreshCw, TrendingUp, DollarSign, Users, Package, Calendar } from 'lucide-react'
import { BusinessCharts } from '@/components/BusinessCharts'

interface ReportData {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  avgOrderValue: number
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  revenueByMonth: Array<{ month: string; revenue: number }>
  profitMargin: number
}

export function ReportsAnalysis() {
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('30')
  const [data, setData] = useState<ReportData | null>(null)
  const [showCharts, setShowCharts] = useState(true)

  const loadReport = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/cost-analysis?startDate=${getStartDate()}`)
      if (response.ok) {
        const result = await response.json()
        setData({
          totalRevenue: result.summary.revenue,
          totalOrders: result.summary.orderCount,
          totalCustomers: 0, // 需要另外獲取
          avgOrderValue: result.summary.orderCount > 0 ? result.summary.revenue / result.summary.orderCount : 0,
          topProducts: [],
          revenueByMonth: [],
          profitMargin: parseFloat(result.summary.profitMargin),
        })
      }
    } catch (error) {
      console.error('Error loading report:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [period])

  const getStartDate = () => {
    const date = new Date()
    date.setDate(date.getDate() - parseInt(period))
    return date.toISOString().split('T')[0]
  }

  const getEndDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-easy-title font-bold text-gray-900">統計分析</h2>
          <p className="text-easy-body text-gray-600">多維度數據分析，圖表化營運概況</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">近7天</SelectItem>
              <SelectItem value="30">近30天</SelectItem>
              <SelectItem value="90">近90天</SelectItem>
              <SelectItem value="365">近一年</SelectItem>
            </SelectContent>
          </Select>
          <IOSButton variant="outline" onClick={loadReport} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </IOSButton>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <IOSCard>
              <IOSCardContent className="pt-6">
                <div className="flex items-center gap-2 text-easy-subheading text-gray-600 mb-1">
                  <DollarSign className="h-4 w-4" />
                  營業額
                </div>
                <div className="text-easy-title font-bold text-blue-600">
                  NT${data.totalRevenue.toLocaleString()}
                </div>
              </IOSCardContent>
            </IOSCard>
            <IOSCard>
              <IOSCardContent className="pt-6">
                <div className="flex items-center gap-2 text-easy-subheading text-gray-600 mb-1">
                  <BarChart3 className="h-4 w-4" />
                  訂單數
                </div>
                <div className="text-easy-title font-bold text-green-600">
                  {data.totalOrders}
                </div>
              </IOSCardContent>
            </IOSCard>
            <IOSCard>
              <IOSCardContent className="pt-6">
                <div className="flex items-center gap-2 text-easy-subheading text-gray-600 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  利潤率
                </div>
                <div className={`text-easy-title font-bold ${data.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.profitMargin.toFixed(1)}%
                </div>
              </IOSCardContent>
            </IOSCard>
            <IOSCard>
              <IOSCardContent className="pt-6">
                <div className="text-easy-subheading text-gray-600 mb-1">平均訂單</div>
                <div className="text-easy-title font-bold text-purple-600">
                  NT${Math.round(data.avgOrderValue).toLocaleString()}
                </div>
              </IOSCardContent>
            </IOSCard>
          </div>

          {/* 圖表視覺化 */}
          <BusinessCharts startDate={getStartDate()} endDate={getEndDate()} />
        </>
      )}
    </div>
  )
}
