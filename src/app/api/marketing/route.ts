'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/marketing - 獲取營銷活動
export async function GET(request: NextRequest) {
  try {
    const campaigns = await db.marketingCampaign.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(campaigns)
  } catch (error) {
    console.error('獲取營銷活動失敗:', error)
    return NextResponse.json(
      { error: '獲取營銷活動失敗' },
      { status: 500 }
    )
  }
}

// POST /api/marketing - 創建營銷活動
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, type, startDate, endDate, discount } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: '活動名稱和類型為必填項' },
        { status: 400 }
      )
    }

    const campaign = await db.marketingCampaign.create({
      data: {
        name,
        description: description || null,
        type,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        discount: discount ? parseFloat(discount) : null,
        status: 'active'
      }
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('創建營銷活動失敗:', error)
    return NextResponse.json(
      { error: '創建營銷活動失敗' },
      { status: 500 }
    )
  }
}
