import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

/**
 * 數據庫連接診斷 API
 * 用於檢查 DATABASE_URL 配置和數據庫連接狀態
 */
export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
  }

  // 檢查 1: DATABASE_URL 環境變量
  diagnostics.checks.hasDatabaseUrl = !!process.env.DATABASE_URL
  diagnostics.checks.databaseUrlLength = process.env.DATABASE_URL?.length || 0
  diagnostics.checks.databaseUrlPreview = process.env.DATABASE_URL
    ? `${process.env.DATABASE_URL.substring(0, 30)}...${process.env.DATABASE_URL.substring(process.env.DATABASE_URL.length - 10)}`
    : null

  // 檢查 2: Prisma Client 初始化
  try {
    const prisma = new PrismaClient({
      log: ['error'],
    })

    // 檢查 3: 數據庫連接測試
    try {
      await prisma.$connect()
      diagnostics.checks.canConnect = true

      // 檢查 4: 查詢測試
      try {
        const userCount = await prisma.user.count()
        diagnostics.checks.canQuery = true
        diagnostics.checks.userCount = userCount

        // 檢查 5: 查詢用戶列表
        try {
          const users = await prisma.user.findMany({
            select: {
              id: true,
              username: true,
              name: true,
              role: true,
              isActive: true,
            },
            take: 5,
          })
          diagnostics.checks.canQueryUsers = true
          diagnostics.checks.sampleUsers = users
        } catch (error: any) {
          diagnostics.checks.canQueryUsers = false
          diagnostics.errors.push({
            check: 'canQueryUsers',
            error: error.message,
          })
        }
      } catch (error: any) {
        diagnostics.checks.canQuery = false
        diagnostics.errors.push({
          check: 'canQuery',
          error: error.message,
        })
      }

      await prisma.$disconnect()
    } catch (error: any) {
      diagnostics.checks.canConnect = false
      diagnostics.errors.push({
        check: 'canConnect',
        error: error.message,
        code: error.code,
      })
    }
  } catch (error: any) {
    diagnostics.checks.canInitializePrisma = false
    diagnostics.errors.push({
      check: 'canInitializePrisma',
      error: error.message,
    })
  }

  // 檢查 6: 環境變量列表（不顯示敏感信息）
  diagnostics.checks.envVars = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
  }

  const hasErrors = diagnostics.errors.length > 0
  const status = hasErrors ? 500 : 200

  return NextResponse.json(diagnostics, { status })
}
