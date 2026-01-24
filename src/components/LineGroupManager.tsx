'use client'

import { useState, useEffect } from 'react'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import { IOSButton } from '@/components/ui/ios-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BrandIcon } from '@/components/BrandIcon'
import { triggerHaptic } from '@/lib/ios-utils'

interface LineGroup {
  id: string                // 數據庫 ID
  groupId: string           // LINE 群組 ID
  groupName: string
  groupType: string
  memberCount: number | null
  isActive: boolean
  permissions: string[]
  description?: string
  createdAt: string
  lastMessageAt?: string | null
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
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)  // 展開的群組

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
  const copyGroupId = (groupId: string, id?: string) => {
    const textToCopy = id ? `DB ID: ${id}\nLINE Group ID: ${groupId}` : groupId
    navigator.clipboard.writeText(textToCopy)
    setCopied(groupId)
    triggerHaptic('light')
    setTimeout(() => setCopied(null), 2000)
  }

  // 複製數據庫 ID
  const copyDbId = (dbId: string) => {
    navigator.clipboard.writeText(dbId)
    setCopied('db-' + dbId)
    triggerHaptic('light')
    setTimeout(() => setCopied(null), 2000)
  }

  // 切換群組展開
  const toggleGroup = (groupId: string) => {
    triggerHaptic('light')
    setExpandedGroup(expandedGroup === groupId ? null : groupId)
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
            <BrandIcon size={24} />
            <IOSCardTitle>LINE 群組管理</IOSCardTitle>
          </div>
          <IOSButton
            variant="outline"
            size="sm"
            onClick={loadGroups}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-block animate-spin">⟳</span>
            ) : '刷新'}
          </IOSButton>
        </div>
      </IOSCardHeader>
      <IOSCardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <span className="text-red-500 text-xl">⚠</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-4xl animate-spin text-blue-500">⟳</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BrandIcon size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-easy-body font-medium">尚無群組記錄</p>
            <p className="text-easy-caption mt-2">
              請在 LINE 群組中發送訊息，系統會自動捕獲群組 ID
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const isExpanded = expandedGroup === group.groupId
              return (
                <div
                  key={group.groupId}
                  className="border border-gray-200 rounded-xl bg-white hover:border-blue-300 transition-all overflow-hidden"
                >
                  {/* 群組標題（可點擊展開） */}
                  <div
                    onClick={() => toggleGroup(group.groupId)}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-easy-body text-gray-900 mb-1 flex items-center gap-2">
                          {group.groupName || '未命名群組'}
                          {group.isActive ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">活躍</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">非活躍</span>
                          )}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>成員: {group.memberCount || '未知'}</span>
                          <span>•</span>
                          <span className="font-mono">ID: {group.groupId.slice(-8)}...</span>
                        </div>
                      </div>
                      <span className="text-gray-400 text-xl">{isExpanded ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {/* 展開詳情 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                      {/* 數據庫 ID */}
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs font-medium text-blue-900 mb-2">數據庫 ID (DB ID)</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-blue-700 bg-white px-2 py-1 rounded flex-1 overflow-hidden">
                            {group.id}
                          </code>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyDbId(group.id) }}
                            className="p-2 bg-white hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                            title="複製數據庫 ID"
                          >
                            {copied === 'db-' + group.id ? (
                              <span className="text-green-500">✓</span>
                            ) : (
                              <span className="text-blue-600">📋</span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* LINE 群組 ID */}
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-700 mb-2">LINE 群組 ID</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-gray-700 bg-white px-2 py-1 rounded flex-1 overflow-hidden">
                            {group.groupId}
                          </code>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyGroupId(group.groupId, group.id) }}
                            className="p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                            title="複製所有 ID"
                          >
                            {copied === group.groupId ? (
                              <span className="text-green-500">✓</span>
                            ) : (
                              <span>📋</span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 權限顯示 */}
                      {group.permissions && group.permissions.length > 0 && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs font-medium text-purple-900 mb-2">群組權限</p>
                          <div className="flex flex-wrap gap-1">
                            {group.permissions.map((perm, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                {perm}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

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
                        <div className="pt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); copyEnvConfig(group.groupId, group.groupType) }}
                            className="w-full p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            {copied === group.groupId + '-env' ? (
                              <>
                                <span>✓</span>
                                已複製環境變量
                              </>
                            ) : (
                              <>
                                <span>📋</span>
                                複製環境變量配置
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {updating === group.groupId && (
                        <div className="flex items-center justify-center gap-2 py-2 text-blue-600">
                          <span className="inline-block animate-spin">⟳</span>
                          <span className="text-sm">更新中...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 使用說明 */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-semibold text-sm text-blue-900 mb-2">📝 使用說明</h5>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
            <li>在 LINE 群組中發送任意訊息，系統會自動捕獲群組 ID</li>
            <li>點擊群組卡片展開查看詳細信息</li>
            <li>選擇群組類型（老闆群組/員工群組等）</li>
            <li>可複製數據庫 ID 或 LINE 群組 ID</li>
            <li>複製環境變量配置到 .env 文件</li>
            <li>重啟應用使配置生效</li>
          </ol>

          <div className="mt-3 p-2 bg-white rounded border border-blue-200">
            <p className="text-xs text-blue-800 font-medium mb-1">💡 ID 說明</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>數據庫 ID</strong>: 系統內部使用的唯一識別碼</li>
              <li>• <strong>LINE 群組 ID</strong>: LINE 平台的群組識別碼</li>
            </ul>
          </div>
      </div>
      </IOSCardContent>
    </IOSCard>
  )
}

export default LineGroupManager
