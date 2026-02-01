import { NextRequest, NextResponse } from 'next/server'

// 批量驗證 LINE
export async function POST(request: NextRequest) {
  try {
    const { db } = await import('@/lib/db')
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '請提供要驗證的店家 ID 列表' },
        { status: 400 }
      )
    }

    const { search } = await import('@/lib/ai-sdk')

    let successCount = 0
    const results = []

    for (const id of ids) {
      try {
        const store = await db.store.findUnique({
          where: { id },
        })

        if (!store || !store.phoneNumber) {
          results.push({ id, success: false, error: '找不到店家或沒有電話號碼' })
          continue
        }

        // 驗證 LINE
        const searchResult = await search.search({
          queries: [
            `${store.phoneNumber} LINE 官方帳號`,
            `電話 ${store.phoneNumber} LINE 加好友`,
            `${store.name} LINE`,
          ],
        })

        let lineActive = false
        if (searchResult && searchResult.results) {
          const allResults = searchResult.results.flat()
          const combined = allResults.map((r: any) => `${r.title} ${r.snippet}`).join(' ')
          
          // 檢查是否有 LINE 相關資訊
          if (combined.includes('LINE') || combined.includes('line')) {
            lineActive = true
          }
        }

        // 更新店家 LINE 狀態
        await db.store.update({
          where: { id },
          data: {
            lineActive,
            lineVerifiedAt: new Date(),
          },
        })

        successCount++
        results.push({ id, success: true, lineActive })
      } catch (error) {
        console.error(`Failed to verify store ${id}:`, error)
        results.push({ id, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功驗證 ${successCount} 個店家`,
      results,
    })
  } catch (error) {
    console.error('Error batch verifying LINE:', error)
    return NextResponse.json(
      {
        success: false,
        error: '批量驗證 LINE 時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 批量刪除店家
export async function DELETE(request: NextRequest) {
  try {
    const { db } = await import('@/lib/db')
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '請提供要刪除的店家 ID 列表' },
        { status: 400 }
      )
    }

    // 刪除店家
    const result = await db.store.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `成功刪除 ${result.count} 個店家`,
      count: result.count,
    })
  } catch (error) {
    console.error('Error batch deleting stores:', error)
    return NextResponse.json(
      {
        success: false,
        error: '批量刪除店家時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
