import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

/**
 * LINE Bot 群組管理 API
 * - GET: 獲取所有群組列表
 * - POST: 創建/更新群組配置
 * - PUT: 更新群組信息
 * - DELETE: 刪除群組
 */

// 驗證管理員權限
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const user = await verifyAuth(token)

  if (!user || user.role !== 'admin') {
    return null
  }

  return user
}

// GET - 獲取所有群組
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groups = await db.lineGroup.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        groupId: true,
        groupName: true,
        groupType: true,
        permissions: true,
        isActive: true,
        memberCount: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: groups.map(g => ({
        ...g,
        messageCount: g._count.messages,
      })),
    })
  } catch (error: any) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch groups', details: error.message },
      { status: 500 }
    )
  }
}

// POST - 創建新群組配置
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
    }
    const { groupId, groupName, groupType, permissions, description } = body

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
    }

    // 檢查群組是否已存在
    const existing = await db.lineGroup.findUnique({
      where: { groupId },
    })

    if (existing) {
      return NextResponse.json({ error: 'Group already exists' }, { status: 409 })
    }

    const group = await db.lineGroup.create({
      data: {
        groupId,
        groupName: groupName || `群組-${groupId.slice(-6)}`,
        groupType: groupType || 'general',
        permissions: permissions || ['create_order', 'check_order'],
        isActive: true,
        description,
      },
    })

    return NextResponse.json({
      success: true,
      data: group,
    })
  } catch (error: any) {
    console.error('Error creating group:', error)
    return NextResponse.json(
      { error: 'Failed to create group', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - 更新群組信息
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
    }
    const { id, groupName, groupType, permissions, isActive, description } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const group = await db.lineGroup.update({
      where: { id },
      data: {
        ...(groupName !== undefined && { groupName }),
        ...(groupType !== undefined && { groupType }),
        ...(permissions !== undefined && { permissions }),
        ...(isActive !== undefined && { isActive }),
        ...(description !== undefined && { description }),
      },
    })

    return NextResponse.json({
      success: true,
      data: group,
    })
  } catch (error: any) {
    console.error('Error updating group:', error)
    return NextResponse.json(
      { error: 'Failed to update group', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - 刪除群組
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await db.lineGroup.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Group deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting group:', error)
    return NextResponse.json(
      { error: 'Failed to delete group', details: error.message },
      { status: 500 }
    )
  }
}
