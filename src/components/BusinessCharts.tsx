'use client'

import { useState, useEffect } from 'react'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ChartData {
  revenueByMonth: Array<{ month: string; revenue: number; cost: number; profit: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  costByCategory: Array<{ category: string; amount: number }>
  dailyRevenue: Array<{ date: string; revenue: number }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

interface BusinessChartsProps {
  startDate?: string
  endDate?: string
}

export function BusinessCharts({ startDate, endDate }: BusinessChartsProps) {
  const [data, setData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'revenue' | 'products' | 'cost' | 'daily'>('revenue')

  useEffect(() => {
    loadChartData()
  }, [startDate, endDate])

  const loadChartData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/charts/business?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error loading chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <IOSCard>
        <IOSCardContent className="p-12">
          <div className="text-center text-gray-500">載入圖表中...</div>
        </IOSCardContent>
      </IOSCard>
    )
  }

  // 標籤選項
  const tabs = [
    { id: 'revenue' as const, label: '營收趨勢', icon: '📈' },
    { id: 'products' as const, label: '熱銷商品', icon: '🏆' },
    { id: 'cost' as const, label: '成本結構', icon: '💰' },
    { id: 'daily' as const, label: '每日營收', icon: '📅' },
  ]

  return (
    <div className="space-y-4">
      {/* 標籤切換 */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 營收趨勢圖 */}
      {activeTab === 'revenue' && (
        <IOSCard>
          <IOSCardHeader>
            <IOSCardTitle>月度營收趨勢</IOSCardTitle>
          </IOSCardHeader>
          <IOSCardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 14 }} />
                <YAxis tick={{ fontSize: 14 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #f97316',
                    borderRadius: '12px',
                    fontSize: '14px',
                  }}
                  formatter={(value: number) => `NT$${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="revenue" name="營收" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="cost" name="成本" fill="#ef4444" radius={[8, 8, 0, 0]} />
                <Bar dataKey="profit" name="利潤" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </IOSCardContent>
        </IOSCard>
      )}

      {/* 熱銷商品排行 */}
      {activeTab === 'products' && (
        <IOSCard>
          <IOSCardHeader>
            <IOSCardTitle>瓦斯銷量排行榜</IOSCardTitle>
          </IOSCardHeader>
          <IOSCardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 14 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 14 }} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #f97316',
                    borderRadius: '12px',
                    fontSize: '14px',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'quantity' ? `${value} 桶` : `NT$${value.toLocaleString()}`,
                    name === 'quantity' ? '銷量' : '營收',
                  ]}
                />
                <Bar dataKey="quantity" name="銷量" fill="#f97316" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </IOSCardContent>
        </IOSCard>
      )}

      {/* 成本結構餅圖 */}
      {activeTab === 'cost' && (
        <IOSCard>
          <IOSCardHeader>
            <IOSCardTitle>成本結構分析</IOSCardTitle>
          </IOSCardHeader>
          <IOSCardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.costByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {data.costByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #f97316',
                    borderRadius: '12px',
                    fontSize: '14px',
                  }}
                  formatter={(value: number) => `NT$${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {data.costByCategory.map((item, index) => (
                <div key={item.category} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium">{item.category}</span>
                  <span className="text-sm text-gray-600 ml-auto">
                    NT${item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </IOSCardContent>
        </IOSCard>
      )}

      {/* 每日營收折線圖 */}
      {activeTab === 'daily' && (
        <IOSCard>
          <IOSCardHeader>
            <IOSCardTitle>每日營收變化</IOSCardTitle>
          </IOSCardHeader>
          <IOSCardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 14 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #f97316',
                    borderRadius: '12px',
                    fontSize: '14px',
                  }}
                  formatter={(value: number) => `NT$${value.toLocaleString()}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="營收"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ fill: '#f97316', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </IOSCardContent>
        </IOSCard>
      )}
    </div>
  )
}
