import { NextRequest, NextResponse } from 'next/server'

// GET - List all stores (with search and filtering) - Updated
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const location = searchParams.get('location') || ''
    const lineActive = searchParams.get('lineActive')

    const { db } = await import('@/lib/db')

    // Build filter conditions
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { address: { contains: search } },
        { phoneNumber: { contains: search } },
      ]
    }

    if (location) {
      where.location = { contains: location }
    }

    if (lineActive !== null && lineActive !== undefined) {
      where.lineActive = lineActive === 'true'
    }

    const stores = await db.store.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      stores: stores.map((store) => ({
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
        createdAt: store.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching stores:', error)
    return NextResponse.json(
      {
        success: false,
        error: '獲取店家列表時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST - Create a new store
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, address, phoneNumber, website, signboard, location, lineActive, imageUrl, lineAccount } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: '店家名稱為必填項' },
        { status: 400 }
      )
    }

    const { db } = await import('@/lib/db')

    // Check if store with same phone number already exists
    if (phoneNumber) {
      const existingStore = await db.store.findFirst({
        where: { phoneNumber },
      })

      if (existingStore) {
        return NextResponse.json(
          { success: false, error: '此電話號碼已存在的店家' },
          { status: 400 }
        )
      }
    }

    const store = await db.store.create({
      data: {
        name,
        address,
        phoneNumber,
        website,
        signboard,
        location: location || '台灣花蓮縣',
        lineActive: lineActive || false,
        lineVerifiedAt: lineActive ? new Date() : null,
        imageUrl,
        lineAccount,
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
        imageUrl: store.imageUrl,
        lineAccount: store.lineAccount,
        createdAt: store.createdAt,
      },
    })
  } catch (error) {
    console.error('Error creating store:', error)
    return NextResponse.json(
      {
        success: false,
        error: '創建店家時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
