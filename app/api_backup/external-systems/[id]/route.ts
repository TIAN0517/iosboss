import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getExternalSystemSyncService } from '@/lib/external-system-sync'

/**
 * 單一外部系統管理 API
 */

// PUT - 更新外部系統配置
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }

    const system = await db.externalSystem.findUnique({
      where: { id },
    })

    if (!system) {
      return NextResponse.json(
        { error: 'System not found' },
        { status: 404 }
      )
    }

    // 如果要更新 webhookUrl，驗證格式
    if (body.webhookUrl) {
      try {
        new URL(body.webhookUrl)
      } catch {
        return NextResponse.json(
          { error: 'Invalid webhookUrl format' },
          { status: 400 }
        )
      }
    }

    // 更新系統配置
    const updated = await db.externalSystem.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.webhookUrl !== undefined && { webhookUrl: body.webhookUrl }),
        ...(body.apiKey !== undefined && { apiKey: body.apiKey || null }),
        ...(body.apiSecret !== undefined && { apiSecret: body.apiSecret || null }),
        ...(body.events !== undefined && { events: body.events }),
        ...(body.headers !== undefined && { headers: body.headers }),
        ...(body.retryCount !== undefined && { retryCount: body.retryCount }),
        ...(body.timeout !== undefined && { timeout: body.timeout }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    })

    // 隱藏敏感資訊
    const sanitized = {
      ...updated,
      apiKey: updated.apiKey ? `${updated.apiKey.substring(0, 8)}...` : null,
      apiSecret: '******',
    }

    return NextResponse.json({ system: sanitized })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update system', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - 刪除外部系統配置
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    await db.externalSystem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete system', details: error.message },
      { status: 500 }
    )
  }
}
