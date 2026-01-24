import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * 系統健康檢查 API
 * 用於診斷 Vercel 部署問題
 */
export async function GET() {
  const health = {
    timestamp: new Date().toISOString(),
    status: 'unknown',
    checks: {} as Record<string, any>,
  }

  // 1. 檢查環境變量
  health.checks.env = {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
    hasJwtSecret: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
  }

  // 2. 檢查資料庫連接
  try {
    const userCount = await db.user.count()
    health.checks.database = {
      status: 'ok',
      userCount,
      message: '資料庫連接正常',
    }
  } catch (error: any) {
    health.checks.database = {
      status: 'error',
      message: error.message,
      code: error.code,
    }
  }

  // 3. 檢查初始用戶
  try {
    const adminUser = await db.user.findFirst({
      where: { role: 'admin' },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    health.checks.adminUser = adminUser || {
      status: 'not_found',
      message: '沒有管理員帳號，請訪問 /api/init 初始化',
    }
  } catch (error: any) {
    health.checks.adminUser = {
      status: 'error',
      message: error.message,
    }
  }

  // 4. 檢查 bcrypt
  try {
    const bcrypt = await import('bcryptjs')
    const testHash = await bcrypt.hash('test', 10)
    const isValid = await bcrypt.compare('test', testHash)
    health.checks.bcrypt = {
      status: isValid ? 'ok' : 'error',
      message: isValid ? 'bcrypt 正常' : 'bcrypt 驗證失敗',
    }
  } catch (error: any) {
    health.checks.bcrypt = {
      status: 'error',
      message: error.message,
    }
  }

  // 5. 檢查 JWT
  try {
    const jwt = await import('jsonwebtoken')
    const testToken = jwt.sign({ test: true }, process.env.JWT_SECRET || 'test', { expiresIn: '1h' })
    const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'test')
    health.checks.jwt = {
      status: 'ok',
      message: 'JWT 正常',
    }
  } catch (error: any) {
    health.checks.jwt = {
      status: 'error',
      message: error.message,
    }
  }

  // 總體狀態
  const allOk = Object.values(health.checks).every(
    (check: any) => check.status === 'ok' || check.username // adminUser 有 username 表示正常
  )
  health.status = allOk ? 'healthy' : 'unhealthy'

  return NextResponse.json(health, {
    status: allOk ? 200 : 500,
  })
}
