// ========================================
// 权限系统 - 基于群组类型的访问控制
// ========================================

import { db } from './db'

// ========================================
// 类型定义
// ========================================

export type GroupType = 'admin' | 'driver' | 'sales' | 'staff' | 'cs' | 'general'

export type Permission =
  // 订单相关
  | 'order_create'        // 创建订单
  | 'order_view_own'      // 查看自己的订单
  | 'order_view_all'      // 查看所有订单
  | 'order_edit'          // 编辑订单
  | 'order_delete'        // 删除订单
  // 客户相关
  | 'customer_create'     // 创建客户
  | 'customer_view_own'   // 查看自己的客户
  | 'customer_view_all'   // 查看所有客户
  | 'customer_edit'       // 编辑客户
  | 'customer_delete'     // 删除客户
  // 库存相关
  | 'inventory_view'      // 查看库存
  | 'inventory_edit'      // 编辑库存
  // 休假表相关
  | 'schedule_create'     // 创建休假表
  | 'schedule_view_own'   // 查看自己的休假
  | 'schedule_view_all'   // 查看所有休假
  | 'schedule_approve'    // 审核休假表
  // 财务相关
  | 'finance_view'        // 查看财务数据
  | 'finance_export'      // 导出财务报表
  // 系统相关
  | 'system_config'       // 系统配置
  | 'search_all'          // 万能搜索（老板专属）
  | 'view_reports'        // 查看报表

export interface UserContext {
  userId?: string
  groupId?: string
  groupType: GroupType
  permissions: Permission[]
}

// ========================================
// 群组权限配置
// ========================================

const GROUP_PERMISSIONS: Record<GroupType, Permission[]> = {
  // 老板群组（管理员） - 全部权限
  admin: [
    // 订单 - 全部
    'order_create', 'order_view_own', 'order_view_all', 'order_edit', 'order_delete',
    // 客户 - 全部
    'customer_create', 'customer_view_own', 'customer_view_all', 'customer_edit', 'customer_delete',
    // 库存 - 全部
    'inventory_view', 'inventory_edit',
    // 休假表 - 全部
    'schedule_create', 'schedule_view_own', 'schedule_view_all', 'schedule_approve',
    // 财务 - 全部
    'finance_view', 'finance_export',
    // 系统 - 全部
    'system_config', 'search_all', 'view_reports',
  ],

  // 司机群组
  driver: [
    'order_view_own',           // 查看分配给自己的订单
    'inventory_view',           // 查看库存
    'schedule_view_own',        // 查看自己的休假
  ],

  // 销售群组
  sales: [
    'order_create',             // 创建订单
    'order_view_own',           // 查看自己的订单
    'customer_create',          // 创建客户
    'customer_view_own',        // 查看自己的客户
    'customer_edit',            // 编辑客户
    'inventory_view',           // 查看库存
    'schedule_view_own',        // 查看自己的休假
  ],

  // 员工群组
  staff: [
    'order_view_own',           // 查看自己的订单
    'inventory_view',           // 查看库存
    'schedule_view_own',        // 查看自己的休假
  ],

  // 客服群组
  cs: [
    'order_create',             // 创建订单
    'order_view_all',           // 查看所有订单（用于客服）
    'customer_create',          // 创建客户
    'customer_view_all',        // 查看所有客户
    'customer_edit',            // 编辑客户
    'inventory_view',           // 查看库存
    'schedule_view_all',        // 查看所有休假
  ],

  // 一般群组（访客）
  general: [
    'inventory_view',           // 只能查看库存
  ],
}

// ========================================
// 权限检查函数
// ========================================

/**
 * 获取用户权限上下文
 */
export async function getUserContext(
  groupId?: string,
  userId?: string
): Promise<UserContext> {
  // 默认为一般用户
  let groupType: GroupType = 'general'

  if (groupId) {
    // 从数据库获取群组类型
    const group = await db.lineGroup.findUnique({
      where: { groupId },
      select: { groupType: true, isActive: true },
    })

    if (group && group.isActive) {
      // 验证群组类型是否有效
      const validTypes: GroupType[] = ['admin', 'driver', 'sales', 'staff', 'cs', 'general']
      if (validTypes.includes(group.groupType as GroupType)) {
        groupType = group.groupType as GroupType
      }
    }
  }

  // 获取该群组的权限列表
  const permissions = GROUP_PERMISSIONS[groupType] || []

  return {
    userId,
    groupId,
    groupType,
    permissions,
  }
}

/**
 * 检查用户是否有特定权限
 */
export function hasPermission(
  context: UserContext,
  permission: Permission
): boolean {
  return context.permissions.includes(permission)
}

/**
 * 检查用户是否有任一权限
 */
export function hasAnyPermission(
  context: UserContext,
  permissions: Permission[]
): boolean {
  return permissions.some(p => context.permissions.includes(p))
}

/**
 * 检查用户是否是管理员（老板）
 */
export function isAdmin(context: UserContext): boolean {
  return context.groupType === 'admin'
}

/**
 * 获取权限错误消息
 */
export function getPermissionError(
  context: UserContext,
  requiredPermission: Permission
): string {
  if (context.groupType === 'general') {
    return '⛔ 此功能需要加入群组后才能使用'
  }

  const groupNames: Record<GroupType, string> = {
    admin: '管理員',
    driver: '司機',
    sales: '銷售',
    staff: '員工',
    cs: '客服',
    general: '一般用戶',
  }

  return `⛔ 此功能需要管理員權限，您目前是 ${groupNames[context.groupType]}`
}

// ========================================
// 数据过滤函数（基于权限）
// ========================================

/**
 * 过滤订单数据（基于权限）
 */
export async function filterOrdersByPermission(
  context: UserContext,
  userId?: string
): Promise<{ canViewAll: boolean, assignedToId?: string }> {
  const canViewAll = hasPermission(context, 'order_view_all')

  if (!canViewAll && userId) {
    return { canViewAll: false, assignedToId: userId }
  }

  return { canViewAll: true }
}

/**
 * 过滤客户数据（基于权限）
 */
export async function filterCustomersByPermission(
  context: UserContext,
  userId?: string
): Promise<{ canViewAll: boolean, createdBy?: string }> {
  const canViewAll = hasPermission(context, 'customer_view_all')

  if (!canViewAll && userId) {
    return { canViewAll: false, createdBy: userId }
  }

  return { canViewAll: true }
}
