'use client'

import { useState, useEffect } from 'react'
import { IOSButton } from '@/components/ui/ios-button'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardDescription, IOSCardContent } from '@/components/ui/ios-card'
import { IOSModal } from '@/components/ui/ios-modal'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { IOSInput } from '@/components/ui/ios-input'
import {
  Calendar,
  RefreshCw,
  Check,
  X,
  Search,
  Clock,
  MapPin,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  CalendarCheck,
  CalendarX,
  CalendarClock,
} from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

// TypeScript 類型定義
interface EmployeeScheduleData {
  id: string
  employeeName: string
  scheduleDate: string
  displayDate: string
  isHalfDay: boolean
  isMorning: boolean
  note: string | null
}

interface ScheduleStationData {
  id: string
  stationName: string
  employees: EmployeeScheduleData[]
}

interface ScheduleSheet {
  id: string
  year: number
  month: number
  title: string
  status: 'pending' | 'approved' | 'rejected'
  submittedBy: string | null
  reviewedBy: string | null
  submittedAt: string
  reviewedAt: string | null
  note: string | null
  stations: ScheduleStationData[]
}

// 狀態映射
const STATUS_CONFIG = {
  pending: {
    label: '待審核',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: CalendarClock,
  },
  approved: {
    label: '已核准',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CalendarCheck,
  },
  rejected: {
    label: '已拒絕',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: CalendarX,
  },
}

export function ScheduleManagement() {
  const [sheets, setSheets] = useState<ScheduleSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedSheet, setSelectedSheet] = useState<ScheduleSheet | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [expandedStations, setExpandedStations] = useState<Set<string>>(new Set())

  const loadSheets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      params.append('limit', '50')

      const response = await fetch(`/api/sheets?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSheets(data.sheets || [])
      } else {
        console.error('Failed to load schedule sheets')
      }
    } catch (error) {
      console.error('Error loading schedule sheets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSheets()
  }, [statusFilter])

  const handleApprove = async (sheet: ScheduleSheet) => {
    triggerHaptic('medium')
    try {
      const response = await fetch(`/api/sheets/${sheet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
        }),
      })

      if (response.ok) {
        triggerHaptic('success')
        alert('休假表已核准！')
        loadSheets()
        setShowDetailModal(false)
      } else {
        triggerHaptic('error')
        const error = await response.json()
        alert(error.error || '核准失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      alert('核准失敗')
    }
  }

  const handleReject = async () => {
    if (!selectedSheet) return

    triggerHaptic('medium')
    try {
      const response = await fetch(`/api/sheets/${selectedSheet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          note: rejectNote,
        }),
      })

      if (response.ok) {
        triggerHaptic('success')
        alert('休假表已拒絕！')
        setRejectNote('')
        setShowRejectDialog(false)
        setShowDetailModal(false)
        loadSheets()
      } else {
        triggerHaptic('error')
        const error = await response.json()
        alert(error.error || '拒絕失敗')
      }
    } catch (error) {
      triggerHaptic('error')
      alert('拒絕失敗')
    }
  }

  const toggleStation = (stationId: string) => {
    triggerHaptic('light')
    setExpandedStations((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(stationId)) {
        newSet.delete(stationId)
      } else {
        newSet.add(stationId)
      }
      return newSet
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getEmployeeSchedulesGrouped = (employees: EmployeeScheduleData[]) => {
    const grouped: { [employeeName: string]: EmployeeScheduleData[] } = {}
    employees.forEach((emp) => {
      if (!grouped[emp.employeeName]) {
        grouped[emp.employeeName] = []
      }
      grouped[emp.employeeName].push(emp)
    })
    return grouped
  }

  return (
    <div className="space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-orange-600" />
            休假表管理
          </h1>
          <p className="text-slate-600 mt-1">審核和管理員工休假表</p>
        </div>
        <IOSButton
          onClick={() => {
            triggerHaptic('light')
            loadSheets()
          }}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          重新整理
        </IOSButton>
      </div>

      {/* 狀態篩選 */}
      <IOSCard className="ios-card-touch">
        <IOSCardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            <IOSButton
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                triggerHaptic('light')
                setStatusFilter('all')
              }}
              className={statusFilter === 'all' ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              全部
            </IOSButton>
            <IOSButton
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                triggerHaptic('light')
                setStatusFilter('pending')
              }}
              className={statusFilter === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
            >
              待審核
            </IOSButton>
            <IOSButton
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                triggerHaptic('light')
                setStatusFilter('approved')
              }}
              className={statusFilter === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              已核准
            </IOSButton>
            <IOSButton
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                triggerHaptic('light')
                setStatusFilter('rejected')
              }}
              className={statusFilter === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              已拒絕
            </IOSButton>
          </div>
        </IOSCardContent>
      </IOSCard>

      {/* 休假表列表 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      ) : sheets.length === 0 ? (
        <IOSCard className="ios-card-touch">
          <IOSCardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 text-easy-body">沒有找到休假表記錄</p>
          </IOSCardContent>
        </IOSCard>
      ) : (
        <div className="space-y-3">
          {sheets.map((sheet) => {
            const statusConfig = STATUS_CONFIG[sheet.status]
            const StatusIcon = statusConfig.icon

            return (
              <IOSCard
                key={sheet.id}
                className="ios-card-touch cursor-pointer hover:shadow-lg transition-all"
                onClick={() => {
                  triggerHaptic('light')
                  setSelectedSheet(sheet)
                  setShowDetailModal(true)
                  setExpandedStations(new Set())
                }}
              >
                <IOSCardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 truncate">{sheet.title}</h3>
                        <Badge className={`shrink-0 ${statusConfig.color} gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {sheet.year}年{sheet.month}月
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {sheet.stations.length} 個站點
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {sheet.stations.reduce(
                            (acc, station) =>
                              acc + new Set(station.employees.map((e) => e.employeeName)).size,
                            0
                          )}{' '}
                          位員工
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDate(sheet.submittedAt)}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                  </div>
                </IOSCardContent>
              </IOSCard>
            )
          })}
        </div>
      )}

      {/* 詳細資料對話框 */}
      <IOSModal open={showDetailModal} onOpenChange={setShowDetailModal}>
        <div className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedSheet && (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{selectedSheet.title}</h2>
                    <div className="flex flex-wrap gap-3 text-sm opacity-90">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {selectedSheet.year}年{selectedSheet.month}月
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(selectedSheet.submittedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {selectedSheet.submittedBy || 'LINE Bot'}
                      </span>
                    </div>
                  </div>
                  <Badge
                    className={`${STATUS_CONFIG[selectedSheet.status].color} text-white border-white/30`}
                  >
                    {STATUS_CONFIG[selectedSheet.status].label}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {selectedSheet.stations.map((station) => (
                    <IOSCard key={station.id}>
                      <IOSCardHeader>
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleStation(station.id)}
                        >
                          <IOSCardTitle className="flex items-center gap-2 text-easy-heading">
                            <MapPin className="h-5 w-5 text-orange-600" />
                            {station.stationName}
                          </IOSCardTitle>
                          {expandedStations.has(station.id) ? (
                            <ChevronUp className="h-5 w-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <IOSCardDescription>
                          {new Set(station.employees.map((e) => e.employeeName)).size} 位員工
                          ，共 {station.employees.length} 筆休假記錄
                        </IOSCardDescription>
                      </IOSCardHeader>

                      {expandedStations.has(station.id) && (
                        <IOSCardContent>
                          <div className="space-y-3">
                            {Object.entries(getEmployeeSchedulesGrouped(station.employees)).map(
                              ([employeeName, schedules]) => (
                                <div
                                  key={employeeName}
                                  className="bg-slate-50 rounded-lg p-3 border border-slate-200"
                                >
                                  <div className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-slate-600" />
                                    {employeeName}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {schedules.map((schedule) => (
                                      <Badge
                                        key={schedule.id}
                                        variant="outline"
                                        className={`${schedule.isHalfDay ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-orange-50 border-orange-300 text-orange-700'}`}
                                      >
                                        {schedule.displayDate}
                                        {schedule.isHalfDay && (
                                          <span className="ml-1">
                                            {schedule.isMorning ? '上午' : '下午'}
                                          </span>
                                        )}
                                        {schedule.note && (
                                          <span className="ml-1 text-slate-500">
                                            ({schedule.note})
                                          </span>
                                        )}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </IOSCardContent>
                      )}
                    </IOSCard>
                  ))}
                </div>
              </ScrollArea>

              {/* Footer Actions */}
              <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end gap-3">
                <IOSButton
                  variant="outline"
                  onClick={() => {
                    triggerHaptic('light')
                    setShowDetailModal(false)
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  關閉
                </IOSButton>
                {selectedSheet.status === 'pending' && (
                  <>
                    <IOSButton
                      variant="outline"
                      onClick={() => {
                        triggerHaptic('light')
                        setShowRejectDialog(true)
                      }}
                      className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                      拒絕
                    </IOSButton>
                    <IOSButton
                      onClick={() => handleApprove(selectedSheet)}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" />
                      核准
                    </IOSButton>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </IOSModal>

      {/* 拒絕原因對話框 */}
      <IOSModal open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <div className="max-w-md">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              拒絕休假表
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejectNote">拒絕原因（選填）</Label>
                <IOSInput
                  id="rejectNote"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="請輸入拒絕原因..."
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-3">
                <IOSButton
                  variant="outline"
                  onClick={() => {
                    triggerHaptic('light')
                    setShowRejectDialog(false)
                    setRejectNote('')
                  }}
                >
                  取消
                </IOSButton>
                <IOSButton
                  onClick={handleReject}
                  className="bg-red-600 hover:bg-red-700"
                >
                  確認拒絕
                </IOSButton>
              </div>
            </div>
          </div>
        </div>
      </IOSModal>
    </div>
  )
}
