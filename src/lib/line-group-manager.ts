/**
 * LINE Bot 群組管理服務
 * 管理群組類型、權限、自動同步等功能
 */

import { GroupType } from './line-bot-intent'

// ========================================
// 群組配置介面
// ========================================

export interface LineGroupConfig {
  groupId: string
  groupName: string
  groupType: GroupType
  permissions: string[]
  isActive: boolean
  memberCount?: number
  description?: string
}

// ========================================
// 預設群組配置（從環境變量或預設值）
// ========================================

const DEFAULT_GROUPS: LineGroupConfig[] = [
  {
    groupId: process.env.LINE_ADMIN_GROUP_ID || 'group_admin',
    groupName: '九九瓦斯行管理群',
    groupType: GroupType.ADMIN,
    permissions: ['create_order', 'check_order', 'cancel_order', 'check_inventory', 'check_revenue', 'admin_report'],
    isActive: true,
    description: '管理層專屬群組',
  },
  {
    groupId: process.env.LINE_DRIVER_GROUP_ID || 'group_driver',
    groupName: '配送司機群',
    groupType: GroupType.DRIVER,
    permissions: ['driver_my_tasks', 'driver_complete', 'check_order', 'delivery_status'],
    isActive: true,
    description: '司機專屬群組',
  },
  {
    groupId: process.env.LINE_SALES_GROUP_ID || 'group_sales',
    groupName: '業務員群',
    groupType: GroupType.SALES,
    permissions: ['create_customer', 'search_customer', 'create_order', 'sales_performance'],
    isActive: true,
    description: '業務員專屬群組',
  },
]

// ========================================
// 群組管理器類別
// ========================================

export class LineGroupManager {
  private groups: Map<string, LineGroupConfig> = new Map()

  constructor() {
    // 初始化預設群組
    this.initializeDefaultGroups()
  }

  /**
   * 初始化預設群組
   */
  private initializeDefaultGroups(): void {
    for (const group of DEFAULT_GROUPS) {
      this.groups.set(group.groupId, group)
    }
  }

  /**
   * 根據 groupId 獲取群組配置
   */
  getGroup(groupId: string): LineGroupConfig | undefined {
    return this.groups.get(groupId)
  }

  /**
   * 根據 groupId 獲取群組類型
   */
  getGroupType(groupId: string): GroupType {
    const group = this.groups.get(groupId)
    return group?.groupType || GroupType.GENERAL
  }

  /**
   * 添加或更新群組
   */
  upsertGroup(config: LineGroupConfig): void {
    this.groups.set(config.groupId, config)
  }

  /**
   * 刪除群組
   */
  removeGroup(groupId: string): boolean {
    return this.groups.delete(groupId)
  }

  /**
   * 獲取所有群組
   */
  getAllGroups(): LineGroupConfig[] {
    return Array.from(this.groups.values())
  }

  /**
   * 根據類型獲取群組
   */
  getGroupsByType(groupType: GroupType): LineGroupConfig[] {
    return this.getAllGroups().filter(g => g.groupType === groupType)
  }

  /**
   * 檢查群組權限
   */
  checkPermission(groupId: string, permission: string): boolean {
    const group = this.groups.get(groupId)
    if (!group) return false
    return group.permissions.includes(permission)
  }

  /**
   * 從 LINE API 同步群組信息
   * 注意：需要 Bot 被加入群組後才能獲取
   */
  async syncGroupsFromLINE(accessToken: string): Promise<LineGroupConfig[]> {
    try {
      // 獲取群組摘要列表
      const response = await fetch('https://api.line.me/v2/bot/group/summary', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Failed to sync groups from LINE:', await response.text())
        return this.getAllGroups()
      }

      const data = await response.json()

      // 更新群組信息
      // 注意：LINE API 只能獲取 Bot 加入的群組
      // 無法自動獲取所有群組類型，需要手動配置

      return this.getAllGroups()
    } catch (error) {
      console.error('Error syncing groups:', error)
      return this.getAllGroups()
    }
  }

  /**
   * 根據群組名稱推測群組類型
   * 用於自動識別未配置的群組
   */
  inferGroupTypeFromName(groupName: string): GroupType {
    const name = groupName.toLowerCase()

    if (name.includes('管理') || name.includes('admin') || name.includes('老闆')) {
      return GroupType.ADMIN
    }
    if (name.includes('司機') || name.includes('driver') || name.includes('配送')) {
      return GroupType.DRIVER
    }
    if (name.includes('業務') || name.includes('sales') || name.includes('業務員')) {
      return GroupType.SALES
    }
    if (name.includes('客服') || name.includes('cs') || name.includes('service')) {
      return GroupType.CUSTOMER_SERVICE
    }

    return GroupType.GENERAL
  }

  /**
   * 自動配置新群組
   */
  autoConfigureGroup(groupId: string, groupName: string, memberCount?: number): LineGroupConfig {
    const groupType = this.inferGroupTypeFromName(groupName)

    const config: LineGroupConfig = {
      groupId,
      groupName,
      groupType,
      permissions: this.getDefaultPermissions(groupType),
      isActive: true,
      memberCount,
      description: `自動識別的${this.getGroupTypeLabel(groupType)}群組`,
    }

    this.upsertGroup(config)
    return config
  }

  /**
   * 獲取群組類型的預設權限
   */
  private getDefaultPermissions(groupType: GroupType): string[] {
    const permissions = {
      [GroupType.ADMIN]: [
        'create_order', 'check_order', 'cancel_order', 'modify_order',
        'check_inventory', 'check_price', 'check_revenue', 'check_cost',
        'create_customer', 'search_customer',
        'delivery_status', 'driver_assign',
        'add_check', 'check_status',
        'admin_report', 'admin_export',
        'promotion_list', 'promotion_create',
      ],
      [GroupType.DRIVER]: [
        'driver_my_tasks', 'driver_complete',
        'check_order', 'delivery_status',
      ],
      [GroupType.SALES]: [
        'create_customer', 'search_customer',
        'create_order', 'check_order',
        'sales_target', 'sales_performance',
      ],
      [GroupType.CUSTOMER_SERVICE]: [
        'check_order', 'search_customer',
        'check_inventory', 'check_price',
        'cs_inquiry',
      ],
      [GroupType.GENERAL]: [
        'create_order', 'check_order',
        'check_price', 'greeting', 'help',
      ],
    }

    return permissions[groupType] || permissions[GroupType.GENERAL]
  }

  /**
   * 獲取群組類型標籤
   */
  private getGroupTypeLabel(groupType: GroupType): string {
    const labels = {
      [GroupType.ADMIN]: '管理',
      [GroupType.DRIVER]: '司機',
      [GroupType.SALES]: '業務',
      [GroupType.CUSTOMER_SERVICE]: '客服',
      [GroupType.GENERAL]: '一般',
    }
    return labels[groupType] || '一般'
  }

  /**
   * 導出群組配置（用於備份）
   */
  exportConfiguration(): string {
    const groups = this.getAllGroups()
    return JSON.stringify(groups, null, 2)
  }

  /**
   * 導入群組配置（用於恢復）
   */
  importConfiguration(configJson: string): void {
    try {
      const configs: LineGroupConfig[] = JSON.parse(configJson)
      for (const config of configs) {
        this.upsertGroup(config)
      }
    } catch (error) {
      console.error('Failed to import group configuration:', error)
    }
  }
}

// ========================================
// 導出單例
// ========================================

let groupManagerInstance: LineGroupManager | null = null

export function getGroupManager(): LineGroupManager {
  if (!groupManagerInstance) {
    groupManagerInstance = new LineGroupManager()
  }
  return groupManagerInstance
}

/**
 * 從環境變量初始化群組配置
 */
export function initializeGroupsFromEnv(): void {
  const manager = getGroupManager()

  // 從環境變量讀取群組配置
  const adminGroupId = process.env.LINE_ADMIN_GROUP_ID
  const driverGroupId = process.env.LINE_DRIVER_GROUP_ID
  const salesGroupId = process.env.LINE_SALES_GROUP_ID

  if (adminGroupId) {
    manager.upsertGroup({
      groupId: adminGroupId,
      groupName: '九九瓦斯行管理群',
      groupType: GroupType.ADMIN,
      permissions: manager.getDefaultPermissions(GroupType.ADMIN),
      isActive: true,
      description: '管理層專屬群組',
    })
  }

  if (driverGroupId) {
    manager.upsertGroup({
      groupId: driverGroupId,
      groupName: '配送司機群',
      groupType: GroupType.DRIVER,
      permissions: manager.getDefaultPermissions(GroupType.DRIVER),
      isActive: true,
      description: '司機專屬群組',
    })
  }

  if (salesGroupId) {
    manager.upsertGroup({
      groupId: salesGroupId,
      groupName: '業務員群',
      groupType: GroupType.SALES,
      permissions: manager.getDefaultPermissions(GroupType.SALES),
      isActive: true,
      description: '業務員專屬群組',
    })
  }
}
