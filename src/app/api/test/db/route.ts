import { NextResponse } from 'next/server'

/**
 * 超簡化的資料庫測試 API
 * 不依賴 logger 或其他複雜模組
 */
export async function GET() {
  const result = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 60) + '...',
      nodeEnv: process.env.NODE_ENV,
    },
    database: {
      tested: false,
      connected: false,
      error: null as string | null,
    },
    tables: {
      tested: false,
      userTable: false,
      error: null as string | null,
    },
  }

  // 測試資料庫連接
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // 測試基本連接
    await prisma.$connect()
    result.database.connected = true
    result.database.tested = true

    // 測試 User 表是否存在
    try {
      const count = await prisma.user.count()
      result.tables.userTable = true
      result.tables.tested = true
    } catch (tableError: any) {
      result.tables.error = tableError.message
    }

    await prisma.$disconnect()
  } catch (error: any) {
    result.database.error = error.message
    if (error.message?.includes('Tenant or user not found')) {
      result.database.error = '認證失敗：資料庫用戶名或密碼錯誤'
    }
  }

  return NextResponse.json(result)
}
