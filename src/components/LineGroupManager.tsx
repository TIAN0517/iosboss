'use client'

import { useState, useEffect } from 'react'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import { IOSButton } from '@/components/ui/ios-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Copy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface LineGroup {
  groupId: string
  groupName: string
  groupType: string
  memberCount: number | null
  isActive: boolean
  createdAt: string
}

/**
 * LINE 群組管理組件
 * 用於獲取群組 ID 並設置群組類型（員工群組/老闆群組）
 */
export function LineGroupManager() {
  const [groups, setGroups] = useState<LineGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 載入群組列表
  const loadGroups = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/webhook/line/get-groups')
        const data = await response.json()

      if (data.success) {
        setGroups(data.groups || [])
      } else {
        setError(data.error || '載入群組失敗')
      }
    } catch (err: any) {
      setError(err.message || '載入群組失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGroups()
  }, [])

  // 更新群組類型
  const updateGroupType = async (groupId: string, groupType: string) => {
    setUpdating(groupId)
    setError(null)
    triggerHaptic('light')

    try {
      const response = await fetch('/api/webhook/line/get-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, groupType }),
      })

      const data = await response.json()

      if (data.success) {
        triggerHaptic('success')
        // 重新載入群組列表
        await loadGroups()
      } else {
        triggerHaptic('error')
        setError(data.error || '更新失敗')
      }
    } catch (err: any) {
      triggerHaptic('error')
      setError(err.message || '更新失敗')
    } finally {
      setUpdating(null)
    }
  }

  // 複製群組 ID
  const copyGroupId = (groupId: string) => {
    navigator.clipboard.writeText(groupId)
    setCopied(groupId)
    triggerHaptic('light')
    setTimeout(() => setCopied(null), 2000)
    }

  // 複製環境變量配置
  const copyEnvConfig = (groupId: string, groupType: string) => {
    let envVar = ''
    if (groupType === 'admin' || groupType === 'boss') {
      envVar = `LINE_ADMIN_GROUP_ID="${groupId}"`
    } else if (groupType === 'staff') {
      envVar = `LINE_STAFF_GROUP_ID="${groupId}"`
    } else {
      envVar = `LINE_${groupType.toUpperCase()}_GROUP_ID="${groupId}"`
    }

    navigator.clipboard.writeText(envVar)
    setCopied(groupId + '-env')
    triggerHaptic('success')
    setTimeout(() => setCopied(null), 2000)
  }

  // 群組類型選項
  const groupTypeOptions = [
    { value: 'boss', label: '👑 老闆群組', description: '老闆專屬群組' },
    { value: 'admin', label: '⚙️ 管理群組', description: '管理員群組' },
    { value: 'staff', label: '👥 員工群組', description: '一般員工群組' },
    { value: 'driver', label: '🚗 司機群組', description: '司機專屬群組' },
    { value: 'sales', label: '💼 業務群組', description: '業務人員群組' },
    { value: 'cs', label: '📞 客服群組', description: '客服人員群組' },
    { value: 'general', label: '📢 一般群組', description: '一般用途群組' },
  ]

  return (
    <IOSCard>
      <IOSCardHeader>
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            <IOSCardTitle>LINE 群組管理</IOSCardTitle>
          </div>
          <IOSButton
            variant="outline"
            size="sm"
            onClick={loadGroups}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '刷新'}
          </IOSButton>
        </div>
      </IOSCardHeader>
      <IOSCardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-easy-body font-medium">尚無群組記錄</p>
            <p className="text-easy-caption mt-2">
              請在 LINE 群組中發送訊息，系統會自動捕獲群組 ID
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div
                key={group.groupId}
                className="p-4 border border-gray-200 rounded-xl bg-white hover:border-blue-300 transition-all"
              >
                {/* 群組信息 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-easy-body text-gray-900 mb-1">
                      {group.groupName || '未命名群組'}
                      </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>成員: {group.memberCount || '未知'}</span>
                      <span>•</span>
                      <span className={group.isActive ? 'text-green-600' : 'text-gray-400'}>
                        {group.isActive ? '活躍' : '非活躍'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyGroupId(group.groupId)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="複製群組 ID"
                  >
                    {copied === group.groupId ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Copy className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* 群組 ID */}
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">群組 ID</p>
                  <p className="text-xs font-mono text-gray-700 break-all">
                    {group.groupId}
                  </p>
                    </div>

                {/* 群組類型選擇 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">
                    群組類型
                  </label>
                  <Select
                    value={group.groupType}
                    onValueChange={(value) => updateGroupType(group.groupId, value)}
                    disabled={updating === group.groupId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {groupTypeOptions.find((opt) => opt.value === group.groupType)?.label ||
                          group.groupType}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {groupTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-gray-500">{option.description}</span>
                      </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>

                {/* 環境變量配置 */}
                {(group.groupType === 'boss' ||
                  group.groupType === 'admin' ||
                  group.groupType === 'staff') && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => copyEnvConfig(group.groupId, group.groupType)}
                      className="w-full text-xs text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
                    >
                      {copied === group.groupId + '-env' ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          已複製環境變量
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          複製環境變量配置
                        </>
                      )}
                    </button>
                  </div>
                )}

                {updating === group.groupId && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>更新中...</span>
                  </div>
                )}
              </div>
            ))}
                </div>
        )}

        {/* 使用說明 */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-semibold text-sm text-blue-900 mb-2">📝 使用說明</h5>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
            <li>在 LINE 群組中發送任意訊息，系統會自動捕獲群組 ID</li>
            <li>選擇群組類型（老闆群組/員工群組等）</li>
            <li>複製環境變量配置到 .env 文件</li>
            <li>重啟應用使配置生效</li>
          </ol>
      </div>
      </IOSCardContent>
    </IOSCard>
  )
}

export default LineGroupManager
