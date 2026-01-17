'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { fetchWithErrorHandling } from '@/lib/fetch-utils'
import {
  MessageCircle,
  Send,
  Users,
  Radio,
  History,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Bot,
  Sparkles,
  Zap
} from 'lucide-react'
import { LineGroupManager } from './LineGroupManager'

type SenderIdentity = 'admin' | 'bot' | 'ai'

interface SenderOption {
  value: SenderIdentity
  label: string
  icon: React.ReactNode
  prefix: string
  color: string
}

const SENDER_OPTIONS: SenderOption[] = [
  {
    value: 'admin',
    label: '管理員',
    icon: <Users className="h-4 w-4" />,
    prefix: '',
    color: 'bg-blue-50 border-blue-300 text-blue-700'
  },
  {
    value: 'bot',
    label: 'Bot',
    icon: <Bot className="h-4 w-4" />,
    prefix: '🤖 ',
    color: 'bg-green-50 border-green-300 text-green-700'
  },
  {
    value: 'ai',
    label: 'AI 助手',
    icon: <Sparkles className="h-4 w-4" />,
    prefix: '✨ AI助手：',
    color: 'bg-purple-50 border-purple-300 text-purple-700'
  }
]

export function LineBotManagement() {
  const [activeTab, setActiveTab] = useState('send')
  const [messageType, setMessageType] = useState<'text' | 'flex'>('text')
  const [messageContent, setMessageContent] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [senderIdentity, setSenderIdentity] = useState<SenderIdentity>('bot')
  const [quickMessage, setQuickMessage] = useState('')
  const [groups, setGroups] = useState<any[]>([])
  const [messageHistory, setMessageHistory] = useState<any[]>([])
  const [sending, setSending] = useState(false)
  const [botStatus, setBotStatus] = useState('active')
  const [expandedGroupQuickSend, setExpandedGroupQuickSend] = useState<string | null>(null)
  const [groupQuickMessages, setGroupQuickMessages] = useState<Record<string, string>>({})

  // 載入群組列表
  useEffect(() => {
    loadGroups()
    loadMessageHistory()
  }, [])

  const loadGroups = async () => {
    const { data, error } = await fetchWithErrorHandling('/api/linebot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getGroups' }),
    })

    if (data && data.groups) {
      setGroups(data.groups)
    } else {
      console.error('載入群組列表失敗:', error)
      // 使用默認數據
      setGroups([
        { groupId: 'group001', groupName: '九九瓦斯行管理群', memberCount: 25 },
        { groupId: 'group002', groupName: '配送司機群', memberCount: 10 },
        { groupId: 'group003', groupName: '業務員群', memberCount: 8 },
      ])
    }
  }

  const loadMessageHistory = async () => {
    try {
      const response = await fetch('/api/linebot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getHistory', data: { limit: 20 } }),
      })
      if (response.ok) {
        const data = await response.json()
        setMessageHistory(data.messages || [])
      }
    } catch (error) {
      console.error('載入訊息歷史失敗:', error)
    }
  }

  // 獲取當前發送者選項
  const getSenderOption = (): SenderOption => {
    return SENDER_OPTIONS.find(opt => opt.value === senderIdentity) || SENDER_OPTIONS[0]
  }

  // 處理發送訊息（添加發送者身份前綴）
  const prepareMessageContent = (content: string): string => {
    const senderOption = getSenderOption()
    return senderOption.prefix + content
  }

  // 發送訊息到群組
  const handleSendToGroup = async () => {
    if (!messageContent.trim() || !selectedGroup) {
      alert('請選擇群組並輸入訊息內容')
      return
    }

    setSending(true)
    try {
      const finalContent = prepareMessageContent(messageContent)

      const response = await fetch('/api/linebot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendToGroup',
          data: {
            groupId: selectedGroup,
            type: messageType,
            content: messageType === 'text' ? finalContent : JSON.parse(messageContent),
          },
        }),
      })

      if (response.ok) {
        alert('訊息發送成功！')
        setMessageContent('')
        loadMessageHistory()
      } else {
        try {
          const error = await response.json()
          alert(error.error || '發送失敗')
        } catch {
          alert('發送失敗，請稍後再試')
        }
      }
    } catch (error) {
      console.error('發送訊息失敗:', error)
      alert('發送失敗')
    } finally {
      setSending(false)
    }
  }

  // 快速發送訊息
  const handleQuickSend = async (groupId?: string) => {
    const targetGroup = groupId || selectedGroup

    if (!quickMessage.trim() || !targetGroup) {
      alert('請選擇群組並輸入訊息內容')
      return
    }

    setSending(true)
    try {
      const finalContent = prepareMessageContent(quickMessage)

      const response = await fetch('/api/linebot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendToGroup',
          data: {
            groupId: targetGroup,
            type: 'text',
            content: finalContent,
          },
        }),
      })

      if (response.ok) {
        alert('訊息發送成功！')
        setQuickMessage('')
        loadMessageHistory()
      } else {
        try {
          const error = await response.json()
          alert(error.error || '發送失敗')
        } catch {
          alert('發送失敗，請稍後再試')
        }
      }
    } catch (error) {
      console.error('發送訊息失敗:', error)
      alert('發送失敗')
    } finally {
      setSending(false)
    }
  }

  // 廣播到所有群組
  const handleBroadcast = async () => {
    if (!messageContent.trim()) {
      alert('請輸入訊息內容')
      return
    }

    setSending(true)
    try {
      const finalContent = prepareMessageContent(messageContent)

      const response = await fetch('/api/linebot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          data: {
            type: messageType,
            content: messageType === 'text' ? finalContent : JSON.parse(messageContent),
          },
        }),
      })

      if (response.ok) {
        alert('廣播發送成功！')
        setMessageContent('')
        loadMessageHistory()
      } else {
        try {
          const error = await response.json()
          alert(error.error || '廣播失敗')
        } catch {
          alert('廣播失敗，請稍後再試')
        }
      }
    } catch (error) {
      console.error('廣播失敗:', error)
      alert('廣播失敗')
    } finally {
      setSending(false)
    }
  }

  // 發送預設訊息
  const sendQuickMessage = (message: string) => {
    setMessageContent(message)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">LINE Bot 管理</h2>
          <p className="text-slate-600">九九瓦斯行管理系統 - LINE訊息推送與管理</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" />
          重新整理
        </Button>
      </div>

      {/* Bot Status */}
      <Card className="border-slate-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Bot 狀態
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={botStatus === 'active' ? 'default' : 'secondary'} className="text-sm">
              {botStatus === 'active' ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  運作中
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  已停止
                </>
              )}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="h-4 w-4" />
              <span>已連接 {groups.length} 個群組</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="send">發送訊息</TabsTrigger>
          <TabsTrigger value="groups">群組管理</TabsTrigger>
          <TabsTrigger value="history">訊息歷史</TabsTrigger>
          <TabsTrigger value="templates">訊息範本</TabsTrigger>
        </TabsList>

        {/* Send Message Tab */}
        <TabsContent value="send" className="space-y-4">
          {/* 快速發送區塊 */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                快速發送
              </CardTitle>
              <CardDescription>快速打字發送訊息到群組</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 發送者身份選擇 */}
              <div>
                <Label className="text-sm">發送者身份</Label>
                <div className="flex gap-2 mt-2">
                  {SENDER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSenderIdentity(option.value)}
                      className={`px-3 py-2 border-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2 ${
                        senderIdentity === option.value
                          ? option.color
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 選擇群組和輸入 */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">選擇群組...</option>
                    {groups.map((group) => (
                      <option key={group.groupId} value={group.groupId}>
                        {group.groupName} ({group.memberCount}人)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-2 flex-[3]">
                  <Input
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                    placeholder="快速輸入訊息..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleQuickSend()
                      }
                    }}
                    className="text-sm"
                  />
                </div>
                <Button
                  onClick={() => handleQuickSend()}
                  disabled={sending || !quickMessage.trim() || !selectedGroup}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-1" />
                  發送
                </Button>
              </div>

              {/* 預覽 */}
              {quickMessage && (
                <div className="p-2 bg-white rounded border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">預覽：</p>
                  <p className="text-sm text-slate-900">
                    {prepareMessageContent(quickMessage)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Send to Group */}
            <Card>
              <CardHeader>
                <CardTitle>發送到群組</CardTitle>
                <CardDescription>選擇目標群組並發送訊息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>選擇群組</Label>
                  <div className="space-y-2 mt-2">
                    {groups.map((group) => (
                      <div
                        key={group.groupId}
                        onClick={() => setSelectedGroup(group.groupId)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedGroup === group.groupId
                            ? 'border-green-500 bg-green-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-600" />
                            <span className="font-medium text-slate-900">{group.groupName}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {group.memberCount} 人
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>訊息類型</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={messageType === 'text' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMessageType('text')}
                    >
                      <Radio className="h-4 w-4 mr-2" />
                      文字訊息
                    </Button>
                    <Button
                      variant={messageType === 'flex' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMessageType('flex')}
                    >
                      <Radio className="h-4 w-4 mr-2" />
                      Flex訊息
                    </Button>
                  </div>
                </div>

                {/* 發送者身份選擇 */}
                {messageType === 'text' && (
                  <div>
                    <Label>發送者身份</Label>
                    <p className="text-xs text-slate-500 mb-2">選擇訊息顯示的發送者身份，會自動添加對應前綴</p>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {SENDER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSenderIdentity(option.value)}
                          className={`p-3 border-2 rounded-lg transition-all flex flex-col items-center gap-2 ${
                            senderIdentity === option.value
                              ? option.color
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {option.icon}
                          <span className="text-xs font-medium">{option.label}</span>
                          {senderIdentity === option.value && (
                            <CheckCircle className="h-3 w-3" />
                          )}
                        </button>
                      ))}
                    </div>
                    {/* 預覽 */}
                    <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">訊息預覽：</p>
                      <p className="text-sm text-slate-900">
                        {prepareMessageContent(messageContent || '你的訊息內容')}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <Label>訊息內容</Label>
                  {messageType === 'text' ? (
                    <Textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="輸入要發送的文字訊息..."
                      rows={6}
                      className="mt-2"
                    />
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder='輸入JSON格式的Flex訊息，例如：{"type":"bubble","altText":"通知","contents":[{"type":"text","text":"訊息內容"}]}'
                        rows={6}
                        className="mt-2 font-mono text-sm"
                      />
                      <p className="text-xs text-slate-500">
                        * Flex訊息需要符合LINE Messaging API格式
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSendToGroup}
                    disabled={sending || !messageContent.trim() || !selectedGroup}
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? '發送中...' : '發送訊息'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setMessageContent('')}
                  >
                    清空
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Broadcast */}
            <Card>
              <CardHeader>
                <CardTitle>廣播訊息</CardTitle>
                <CardDescription>發送訊息到所有群組</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">廣播功能說明</p>
                      <p>此功能將訊息發送到所有已連接的LINE群組（{groups.length}個）。請謹慎使用以避免發送過多訊息。</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>訊息內容</Label>
                  <Textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="輸入要廣播的訊息內容..."
                    rows={6}
                    className="mt-2"
                  />
                </div>

                <Button
                  onClick={handleBroadcast}
                  disabled={sending || !messageContent.trim()}
                  className="w-full"
                >
                  <Radio className="h-4 w-4 mr-2" />
                  {sending ? '廣播中...' : '廣播到所有群組'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <LineGroupManager />
          <Card>
            <CardHeader>
              <CardTitle>已連接群組</CardTitle>
              <CardDescription>管理LINE Bot連接的群組列表並快速發送訊息</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {groups.map((group) => {
                    const isExpanded = expandedGroupQuickSend === group.groupId
                    return (
                      <div key={group.groupId} className="border border-slate-200 rounded-lg hover:border-green-300 transition-all overflow-hidden">
                        {/* 群組標題 */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-lg">
                              <Users className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{group.groupName}</h3>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Badge variant="outline" className="text-xs">
                                  ID: {group.groupId}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span>{group.memberCount} 位成員</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={botStatus === 'active' ? 'default' : 'secondary'}>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              已連接
                            </Badge>
                            <Button
                              variant={isExpanded ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setExpandedGroupQuickSend(isExpanded ? null : group.groupId)}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              快速發送
                            </Button>
                          </div>
                        </div>

                        {/* 快速發送表單 */}
                        {isExpanded && (
                          <div className="border-t border-slate-200 p-4 bg-slate-50">
                            {/* 發送者身份 */}
                            <div className="mb-3">
                              <Label className="text-sm">發送者身份</Label>
                              <div className="flex gap-2 mt-2">
                                {SENDER_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={() => setSenderIdentity(option.value)}
                                    className={`px-3 py-2 border-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2 ${
                                      senderIdentity === option.value
                                        ? option.color
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                                  >
                                    {option.icon}
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 訊息輸入 */}
                            <div className="flex gap-2">
                              <Input
                                value={groupQuickMessages[group.groupId] || ''}
                                onChange={(e) =>
                                  setGroupQuickMessages((prev) => ({
                                    ...prev,
                                    [group.groupId]: e.target.value,
                                  }))
                                }
                                placeholder="輸入訊息..."
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleQuickSend(group.groupId)
                                  }
                                }}
                                className="flex-1"
                              />
                              <Button
                                onClick={() => handleQuickSend(group.groupId)}
                                disabled={sending || !(groupQuickMessages[group.groupId]?.trim())}
                                size="sm"
                              >
                                <Send className="h-4 w-4 mr-1" />
                                發送
                              </Button>
                            </div>

                            {/* 預覽 */}
                            {groupQuickMessages[group.groupId] && (
                              <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                                <p className="text-xs text-slate-500 mb-1">預覽：</p>
                                <p className="text-sm text-slate-900">
                                  {prepareMessageContent(groupQuickMessages[group.groupId])}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>訊息發送歷史</CardTitle>
              <CardDescription>查看所有已發送的訊息記錄</CardDescription>
            </CardHeader>
            <CardContent>
              {messageHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">尚無發送記錄</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-3">
                    {messageHistory.map((msg) => (
                      <div key={msg.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {msg.type === 'text' ? '文字' : 'Flex'}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                {new Date(msg.sentAt).toLocaleString('zh-TW')}
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              {msg.type === 'text' ? (
                                <p className="text-slate-900">{msg.messagePreview}</p>
                              ) : (
                                <pre className="text-xs text-slate-700 overflow-x-auto">
                                  {msg.messagePreview}
                                </pre>
                              )}
                            </div>
                            <div className="mt-2 text-sm">
                              <Badge variant="secondary" className="mr-2">
                                發送至
                              </Badge>
                              <span className="text-slate-600">
                                {msg.sentTo === 'all' ? '全體群組' : msg.sentToName}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          已發送
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>快速訊息範本</CardTitle>
                <CardDescription>點擊使用預設訊息範本</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['今日瓦斯訂單已更新，請查看系統', '提醒：庫存即將不足，請安排進貨', '今日配送任務已分配，請查詢', '新客戶優惠活動開始，請查看系統', '月結報表已生成，請確認', '支票到期提醒，請處理'].map((template, index) => (
                    <div
                      key={index}
                      onClick={() => sendQuickMessage(template)}
                      className="p-3 border border-slate-200 rounded-lg hover:border-green-300 hover:bg-green-50 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-900">{template}</span>
                        <Button variant="ghost" size="icon">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Flex訊息範本</CardTitle>
                <CardDescription>點擊使用Flex訊息範本</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    {
                      name: '訂單通知',
                      content: JSON.stringify({
                        type: 'bubble',
                        altText: '新訂單通知',
                        contents: [
                          { type: 'text', text: '📦 新訂單已建立' },
                          { type: 'text', text: '客戶：{{客戶名稱}}' },
                          { type: 'text', text: '訂單編號：{{訂單編號}}' },
                          { type: 'text', text: '金額：NT${{金額}}' },
                        ],
                      }),
                    },
                    {
                      name: '配送提醒',
                      content: JSON.stringify({
                        type: 'bubble',
                        altText: '配送提醒',
                        contents: [
                          { type: 'text', text: '🚚 準備配送' },
                          { type: 'text', text: '司機：{{司機名稱}}' },
                          { type: 'text', text: '預計時間：{{預計時間}}' },
                          { type: 'text', text: '地點：{{配送地址}}' },
                        ],
                      }),
                    },
                    {
                      name: '庫存警告',
                      content: JSON.stringify({
                        type: 'bubble',
                        altText: '庫存警告',
                        contents: [
                          { type: 'text', text: '⚠️ 庫存警告' },
                          { type: 'text', text: '產品：{{產品名稱}}' },
                          { type: 'text', text: '剩餘：{{剩餘數量}}' },
                          { type: 'text', text: '最低庫存：{{最低庫存}}' },
                        ],
                      }),
                    },
                    {
                      name: '優惠活動',
                      content: JSON.stringify({
                        type: 'bubble',
                        altText: '優惠活動',
                        contents: [
                          { type: 'text', text: '🎉 新客戶優惠活動開始！' },
                          { type: 'text', text: '現金客戶享2%折扣，VIP客戶享5%折扣' },
                        ],
                      }),
                    },
                  ].map((template, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setMessageType('flex')
                        setMessageContent(template.content)
                      }}
                      className="p-3 border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-slate-900">{template.name}</span>
                          <p className="text-xs text-slate-500 mt-1">
                            {template.content.substring(0, 50)}...
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Flex
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
              <CardHeader>
                <CardTitle>使用說明</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-green-800">
                <ol className="list-decimal list-inside space-y-1">
                  <li>點擊範本可自動填入訊息內容</li>
                  <li>可根據需求修改範本內容中的變數，如：雙花括號包圍的變數名稱</li>
                  <li>文字訊息：簡單的純文字內容</li>
                  <li>Flex訊息：支援更豐富的訊息格式（圖片、按鈕等）</li>
                  <li>發送前請確認訊息內容正確</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
