import { NextRequest, NextResponse } from 'next/server'

// 導出店家資訊為 CSV
export async function GET(request: NextRequest) {
  try {
    const { db } = await import('@/lib/db')
    
    const stores = await db.store.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 生成 CSV 格式 - 使用英文表頭避免編碼問題
    const headers = ['Name', 'Phone', 'Address', 'Website', 'LINE Account', 'Location', 'LINE Active', 'Verified At', 'Created At']
    
    // 為每個店家生成一行CSV
    const csvRows = stores.map((store) => {
      const row = [
        `"${(store.name || '').replace(/"/g, '""')}"`,
        `"${(store.phoneNumber || '').replace(/"/g, '""')}"`,
        `"${(store.address || '').replace(/"/g, '""')}"`,
        `"${(store.website || '').replace(/"/g, '""')}"`,
        `"${(store.lineAccount || '').replace(/"/g, '""')}"`,
        `"${(store.location || '').replace(/"/g, '""')}"`,
        `"${store.lineActive ? 'Yes' : 'No'}"`,
        `"${store.lineVerifiedAt ? new Date(store.lineVerifiedAt).toISOString() : ''}"`,
        `"${store.createdAt ? new Date(store.createdAt).toISOString() : ''}"`,
      ]
      return row.join(',')
    })
    
    // 添加標題行並組合完整內容
    const headerRow = headers.join(',')
    const csvContent = `${headerRow}\n${csvRows.join('\n')}`
    
    // 轉換為 UTF-8 Buffer
    const csvBuffer = Buffer.from(csvContent, 'utf-8')
    
    // 設定檔案名（包含時間戳）- 使用英文
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `Hualien_Stores_${timestamp}.csv`

    // 使用 NextResponse 與 Buffer
    return new NextResponse(csvBuffer, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting stores:', error)
    return NextResponse.json(
      {
        success: false,
        error: '導出店家資訊時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
