'use client'

import { useState, useEffect } from 'react'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import { IOSButton } from '@/components/ui/ios-button'
import { useRouter } from 'next/navigation'
import { Bell, AlertTriangle, AlertCircle, Info, X, RefreshCw } from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface Alert {
  id: string
  type: 'inventory' | 'check' | 'payment' | 'order'
  title: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'urgent'
  action?: string
  actionUrl?: string
  createdAt: Date
}

interface AlertSummary {
  total: number
  urgent: number
  high: number
  medium: number
  low: number
}

interface SmartAlertsProps {
  limit?: number
  showHeader?: boolean
}

export function SmartAlerts({ limit = 5, showHeader = true }: SmartAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    loadAlerts()
    // 每 5 分鐘自動刷新
    const interval = setInterval(loadAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
        setSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = (id: string) => {
    triggerHaptic('light')
    setDismissed((prev) => new Set([...prev, id]))
  }

  const handleAction = (alert: Alert) => {
    triggerHaptic('medium')
    if (alert.actionUrl) {
      router.push(alert.actionUrl)
    }
  }

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'urgent':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'high':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case 'medium':
        return <Bell className="h-5 w-5 text-yellow-500" />
      case 'low':
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'urgent':
        return 'border-red-500 bg-red-50'
      case 'high':
        return 'border-orange-500 bg-orange-50'
      case 'medium':
        return 'border-yellow-500 bg-yellow-50'
      case 'low':
        return 'border-blue-500 bg-blue-50'
    }
  }

  const visibleAlerts = alerts.filter((alert) => !dismissed.has(alert.id)).slice(0, limit)

  if (loading) {
    return (
      <IOSCard>
        <IOSCardContent className="p-6">
          <div className="text-center text-gray-500">載入提醒中...</div>
        </IOSCardContent>
      </IOSCard>
    )
  }

  if (visibleAlerts.length === 0) {
    return (
      <IOSCard>
        {showHeader && (
          <IOSCardHeader>
            <IOSCardTitle>智能提醒</IOSCardTitle>
          </IOSCardHeader>
        )}
        <IOSCardContent>
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-easy-body">🎉 目前沒有特別提醒</p>
            <p className="text-easy-caption text-gray-400 mt-1">系統運作正常</p>
          </div>
        </IOSCardContent>
      </IOSCard>
    )
  }

  return (
    <IOSCard>
      {showHeader && (
        <IOSCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IOSCardTitle>智能提醒</IOSCardTitle>
              {summary && summary.urgent > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {summary.urgent}
                </span>
              )}
            </div>
            <IOSButton variant="ghost" size="icon" onClick={loadAlerts}>
              <RefreshCw className="h-4 w-4" />
            </IOSButton>
          </div>
        </IOSCardHeader>
      )}
      <IOSCardContent className="space-y-3">
        {visibleAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-all ${getSeverityColor(alert.severity)}`}
          >
            <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(alert.severity)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-easy-body font-bold text-gray-900">{alert.title}</p>
              <p className="text-easy-body-small text-gray-700 mt-1">{alert.message}</p>
              {alert.action && (
                <button
                  onClick={() => handleAction(alert)}
                  className="mt-2 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  {alert.action} →
                </button>
              )}
            </div>
            <button
              onClick={() => handleDismiss(alert.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ))}

        {alerts.length > limit && (
          <div className="text-center pt-2">
            <p className="text-sm text-gray-500">還有 {alerts.length - limit} 則提醒...</p>
          </div>
        )}
      </IOSCardContent>
    </IOSCard>
  )
}

/**
 * 通知角標組件（用於顯示在圖標上）
 */
export function AlertBadge() {
  const [count, setCount] = useState(0)
  const [hasUrgent, setHasUrgent] = useState(false)

  useEffect(() => {
    const loadAlertCount = async () => {
      try {
        const response = await fetch('/api/alerts')
        if (response.ok) {
          const data = await response.json()
          const urgentCount = data.summary?.urgent || 0
          const totalCount = data.alerts?.length || 0
          setCount(totalCount)
          setHasUrgent(urgentCount > 0)
        }
      } catch (error) {
        console.error('Error loading alert count:', error)
      }
    }

    loadAlertCount()
    const interval = setInterval(loadAlertCount, 60000) // 每分鐘更新
    return () => clearInterval(interval)
  }, [])

  if (count === 0) return null

  return (
    <span
      className={`absolute top-0 right-0 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center ${
        hasUrgent ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
      } text-white`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}
