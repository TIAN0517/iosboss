import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * 獲取所有 LINE 群組 ID
 * 用於設置員工群組和老闆群組
 */

export async function GET(request: NextRequest) {
  try {
    // 獲取所有群組
    const groups = await db.lineGroup.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        groupId: true,
        groupName: true,
        groupType: true,
        memberCount: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      groups,
      total: groups.length,
      hint: '將群組 ID 複製到 .env 的 LINE_ADMIN_GROUP_ID 或 LINE_STAFF_GROUP_ID',
      example: {
        admin: 'LINE_ADMIN_GROUP_ID="Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"',
        staff: 'LINE_STAFF_GROUP_ID="Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"',
      },
    })
  } catch (error: any) {
    console.error('Failed to get groups:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * 更新群組類型（設置為員工群組或老闆群組）
 */
export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: '請求格式錯誤' },
        { status: 400 }
      )
    }
    const { groupId, groupType } = body

    if (!groupId || !groupType) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數：groupId 和 groupType' },
        { status: 400 }
      )
    }

    // 驗證 groupType
    const validTypes = ['admin', 'driver', 'sales', 'staff', 'cs', 'general', 'boss']
    if (!validTypes.includes(groupType)) {
      return NextResponse.json(
        { success: false, error: `無效的群組類型。有效類型：${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // 更新群組類型
    const updatedGroup = await db.lineGroup.update({
      where: { groupId },
      data: {
        groupType: groupType as any,
        updatedAt: new Date(),
      },
      select: {
        groupId: true,
        groupName: true,
        groupType: true,
        memberCount: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: '群組類型已更新',
      group: updatedGroup,
      envConfig: {
        admin: groupType === 'admin' || groupType === 'boss' 
          ? `LINE_ADMIN_GROUP_ID="${groupId}"`
          : null,
        staff: groupType === 'staff' 
          ? `LINE_STAFF_GROUP_ID="${groupId}"`
          : null,
      },
    })
  } catch (error: any) {
    console.error('Failed to update group type:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
