'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  RefreshCw, 
  Download, 
  Search, 
  Filter, 
  Trash2, 
  Eye,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Settings
} from 'lucide-react'
import { lineLogger, type LogEntry, type LineMessage } from '@/lib/line-logger'

interface LogViewerProps {
  className?: string
}

export function LogViewer({ className = "" }: LogViewerProps) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('ALL')
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30)

  // 加載日誌
  const loadLogs = async () => {
    setLoading(true)
    try {
      const localLogs = lineLogger.getLocalLogs(500)
      
      // 如果有 Supabase，可以從遠程獲取
      // const response = await fetch('/api/logs?limit=500')
      // const remoteLogs = await response.json()
      
      setLogs(localLogs)
    } catch (error) {
      console.error('加載日誌失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 過濾日誌
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.message_content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event_type?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter
    const matchesCategory = categoryFilter === 'ALL' || log.category === categoryFilter
    const matchesSource = sourceFilter === 'ALL' || log.source === sourceFilter
    
    return matchesSearch && matchesLevel && matchesCategory && matchesSource
  })

  // 自動刷新
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      loadLogs()
    }, refreshInterval * 1000)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // 初始加載
  useEffect(() => {
    loadLogs()
  }, [])

  // 獲取級別圖標
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'INFO':
        return <Info className="h-4 w-4 text-blue-500" />
      case 'DEBUG':
        return <Clock className="h-4 w-4 text-gray-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  // 獲取級別顏色
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'WARN':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'INFO':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'DEBUG':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  // 獲取分類顏色
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MESSAGE':
        return 'bg-purple-100 text-purple-800'
      case 'API':
        return 'bg-indigo-100 text-indigo-800'
      case 'USER_ACTION':
        return 'bg-green-100 text-green-800'
      case 'SYSTEM':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  // 導出日誌
  const exportLogs = () => {
    const data = JSON.stringify(filteredLogs, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `line-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 清除日誌
  const clearLogs = () => {
    if (confirm('確定要清除所有本地日誌嗎？此操作無法撤銷。')) {
      lineLogger.clearLocalLogs()
      setLogs([])
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            LINE 系統日誌管理器
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索和過濾 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">搜索</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="搜索日誌內容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="level">級別</Label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部級別</SelectItem>
                  <SelectItem value="ERROR">錯誤</SelectItem>
                  <SelectItem value="WARN">警告</SelectItem>
                  <SelectItem value="INFO">信息</SelectItem>
                  <SelectItem value="DEBUG">調試</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">分類</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部分類</SelectItem>
                  <SelectItem value="MESSAGE">消息</SelectItem>
                  <SelectItem value="API">API</SelectItem>
                  <SelectItem value="USER_ACTION">用戶操作</SelectItem>
                  <SelectItem value="SYSTEM">系統</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source">來源</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部來源</SelectItem>
                  <SelectItem value="frontend">前端</SelectItem>
                  <SelectItem value="backend">後端</SelectItem>
                  <SelectItem value="line_bot">LINE Bot</SelectItem>
                  <SelectItem value="ai_service">AI 服務</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* 控制按鈕 */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={loadLogs} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            
            <Button onClick={exportLogs} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              導出
            </Button>
            
            <Button onClick={clearLogs} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              清除
            </Button>
            
            <div className="flex items-center gap-2 ml-auto">
              <Label htmlFor="auto-refresh">自動刷新</Label>
              <input
                id="auto-refresh"
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(Number(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10秒</SelectItem>
                  <SelectItem value="30">30秒</SelectItem>
                  <SelectItem value="60">60秒</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日誌列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>日誌記錄 ({filteredLogs.length} 條)</span>
            <Badge variant="secondary">
              顯示 {filteredLogs.length} / {logs.length} 條
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {logs.length === 0 ? '暫無日誌記錄' : '沒有符合條件的日誌'}
                </div>
              ) : (
                filteredLogs.map((log, index) => (
                  <div
                    key={log.id || index}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getLevelIcon(log.level)}
                          <Badge variant="outline" className={getLevelColor(log.level)}>
                            {log.level}
                          </Badge>
                          <Badge variant="outline" className={getCategoryColor(log.category)}>
                            {log.category}
                          </Badge>
                          <Badge variant="secondary">
                            {log.source}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="font-medium text-gray-900">
                            {log.event_type}
                          </div>
                          
                          {log.user_name && (
                            <div className="text-gray-600">
                              用戶: {log.user_name}
                            </div>
                          )}
                          
                          {log.message_summary && (
                            <div className="text-gray-700 truncate">
                              {log.message_summary}
                            </div>
                          )}
                          
                          {log.error_message && (
                            <div className="text-red-600 text-sm">
                              錯誤: {log.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 text-xs text-gray-500">
                        <div>
                          {new Date(log.timestamp || log.created_at).toLocaleString('zh-TW')}
                        </div>
                        {log.response_time && (
                          <div>
                            {log.response_time}ms
                          </div>
                        )}
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 日誌詳情對話框 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>日誌詳情</DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">時間戳</Label>
                    <p className="text-sm text-gray-600">
                      {new Date(selectedLog.timestamp || selectedLog.created_at).toLocaleString('zh-TW')}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">級別</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getLevelIcon(selectedLog.level)}
                      <Badge variant="outline" className={getLevelColor(selectedLog.level)}>
                        {selectedLog.level}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">分類</Label>
                    <Badge variant="outline" className={getCategoryColor(selectedLog.category)}>
                      {selectedLog.category}
                    </Badge>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">來源</Label>
                    <Badge variant="secondary">
                      {selectedLog.source}
                    </Badge>
                  </div>
                </div>
                
                {selectedLog.user_name && (
                  <div>
                    <Label className="text-sm font-medium">用戶</Label>
                    <p className="text-sm text-gray-600">{selectedLog.user_name}</p>
                  </div>
                )}
                
                {selectedLog.message_content && (
                  <div>
                    <Label className="text-sm font-medium">消息內容</Label>
                    <div className="bg-gray-50 rounded p-3 mt-1">
                      <p className="text-sm whitespace-pre-wrap">{selectedLog.message_content}</p>
                    </div>
                  </div>
                )}
                
                {selectedLog.ai_response && (
                  <div>
                    <Label className="text-sm font-medium">AI 回應</Label>
                    <div className="bg-blue-50 rounded p-3 mt-1">
                      <p className="text-sm whitespace-pre-wrap">{selectedLog.ai_response}</p>
                    </div>
                  </div>
                )}
                
                {selectedLog.error_message && (
                  <div>
                    <Label className="text-sm font-medium">錯誤信息</Label>
                    <div className="bg-red-50 rounded p-3 mt-1">
                      <p className="text-sm text-red-800">{selectedLog.error_message}</p>
                    </div>
                  </div>
                )}
                
                {selectedLog.business_context && (
                  <div>
                    <Label className="text-sm font-medium">業務上下文</Label>
                    <div className="bg-gray-50 rounded p-3 mt-1">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(selectedLog.business_context, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {selectedLog.metadata && (
                  <div>
                    <Label className="text-sm font-medium">元數據</Label>
                    <div className="bg-gray-50 rounded p-3 mt-1">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
