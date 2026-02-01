import { NextRequest, NextResponse } from 'next/server'

// GET - Get a single store by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await import('@/lib/db')

    const store = await db.store.findUnique({
      where: { id: params.id },
    })

    if (!store) {
      return NextResponse.json(
        { success: false, error: '找不到該店家' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        address: store.address,
        phoneNumber: store.phoneNumber,
        website: store.website,
        signboard: store.signboard,
        location: store.location,
        lineActive: store.lineActive,
        lineVerifiedAt: store.lineVerifiedAt,
        imageUrl: store.imageUrl,
        lineAccount: store.lineAccount,
        analysisResult: store.analysisResult,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error fetching store:', error)
    return NextResponse.json(
      {
        success: false,
        error: '獲取店家資訊時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// PUT - Update a store
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, address, phoneNumber, website, signboard, location, lineActive, imageUrl, lineAccount } = body

    const { db } = await import('@/lib/db')

    // Check if store exists
    const existingStore = await db.store.findUnique({
      where: { id: params.id },
    })

    if (!existingStore) {
      return NextResponse.json(
        { success: false, error: '找不到該店家' },
        { status: 404 }
      )
    }

    // Update store
    const store = await db.store.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(website !== undefined && { website }),
        ...(signboard !== undefined && { signboard }),
        ...(location !== undefined && { location }),
        ...(lineActive !== undefined && { lineActive }),
        ...(lineActive && { lineVerifiedAt: new Date() }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(lineAccount !== undefined && { lineAccount }),
      },
    })

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        address: store.address,
        phoneNumber: store.phoneNumber,
        website: store.website,
        signboard: store.signboard,
        location: store.location,
        lineActive: store.lineActive,
        lineVerifiedAt: store.lineVerifiedAt,
        imageUrl: store.imageUrl,
        lineAccount: store.lineAccount,
        updatedAt: store.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error updating store:', error)
    return NextResponse.json(
      {
        success: false,
        error: '更新店家資訊時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete a store
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await import('@/lib/db')

    // Check if store exists
    const existingStore = await db.store.findUnique({
      where: { id: params.id },
    })

    if (!existingStore) {
      return NextResponse.json(
        { success: false, error: '找不到該店家' },
        { status: 404 }
      )
    }

    // Delete store
    await db.store.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: '店家已刪除',
    })
  } catch (error) {
    console.error('Error deleting store:', error)
    return NextResponse.json(
      {
        success: false,
        error: '刪除店家時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
