import { NextResponse } from 'next/server'

/**
 * 簡化的登入診斷 API
 * 用於快速定位 Vercel 部署問題
 */
export async function POST(request: Request) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    steps: [] as any[],
    success: false,
  }

  try {
    // 步驟 1: 檢查環境變量
    diagnostics.steps.push({
      step: 1,
      name: '檢查環境變量',
      status: 'checking',
      data: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 50) + '...',
      },
    })

    // 步驟 2: 測試資料庫連接
    diagnostics.steps.push({
      step: 2,
      name: '測試資料庫連接',
      status: 'checking',
    })

    try {
      const { db } = await import('@/lib/db')
      const userCount = await db.user.count()

      diagnostics.steps[1].status = 'ok'
      diagnostics.steps[1].data = {
        userCount,
        message: '資料庫連接成功',
      }
    } catch (dbError: any) {
      diagnostics.steps[1].status = 'error'
      diagnostics.steps[1].data = {
        error: dbError.message,
        code: dbError.code,
        advice: '請檢查 DATABASE_URL 環境變量',
      }
      throw new Error(`資料庫連接失敗: ${dbError.message}`)
    }

    // 步驟 3: 測試 bcrypt
    diagnostics.steps.push({
      step: 3,
      name: '測試 bcrypt',
      status: 'checking',
    })

    try {
      const bcrypt = await import('bcryptjs')
      const testHash = await bcrypt.hash('test123', 10)
      const isValid = await bcrypt.compare('test123', testHash)

      diagnostics.steps[2].status = 'ok'
      diagnostics.steps[2].data = {
        message: 'bcrypt 正常',
        hashLength: testHash.length,
        isValid,
      }
    } catch (bcryptError: any) {
      diagnostics.steps[2].status = 'error'
      diagnostics.steps[2].data = {
        error: bcryptError.message,
      }
      throw new Error(`bcrypt 測試失敗: ${bcryptError.message}`)
    }

    // 步驟 4: 檢查是否有管理員用戶
    diagnostics.steps.push({
      step: 4,
      name: '檢查管理員用戶',
      status: 'checking',
    })

    try {
      const { db } = await import('@/lib/db')
      const adminUser = await db.user.findFirst({
        where: { role: 'admin' },
        select: {
          id: true,
          username: true,
          name: true,
        },
      })

      if (adminUser) {
        diagnostics.steps[3].status = 'ok'
        diagnostics.steps[3].data = {
          message: '找到管理員',
          username: adminUser.username,
          name: adminUser.name,
        }
      } else {
        diagnostics.steps[3].status = 'warning'
        diagnostics.steps[3].data = {
          message: '沒有管理員帳號',
          advice: '請訪問 /api/init 創建初始帳號',
        }
      }
    } catch (userError: any) {
      diagnostics.steps[3].status = 'error'
      diagnostics.steps[3].data = {
        error: userError.message,
      }
    }

    diagnostics.success = true

    return NextResponse.json({
      success: true,
      message: '診斷完成',
      diagnostics,
      recommendation: diagnostics.steps.some(s => s.status === 'error')
        ? '系統有錯誤，請查看下方診斷結果'
        : '系統正常，請嘗試登入',
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      diagnostics,
      recommendation: '請查看診斷步驟中的錯誤信息',
    }, { status: 500 })
  }
}

// GET 方法提供簡單的說明
export async function GET() {
  return NextResponse.json({
    message: '登入診斷 API',
    usage: 'POST /api/diag/login',
    description: '診斷登入系統的各個組件',
  })
}
