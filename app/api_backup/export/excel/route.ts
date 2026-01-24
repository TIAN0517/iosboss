'use client'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Excel 導出 API
 * 支持多種報表類型的導出
 */

export const dynamic = 'force-dynamic'

interface ExportRequest {
  reportType: string
  startDate: string
  endDate: string
  format: 'xlsx' | 'csv'
}

// 動態導入 xlsx（僅在服務端使用）
async function getXLSX() {
  const xlsx = await import('xlsx')
  return xlsx
}

// 格式化日期
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-TW')
}

// 格式化貨幣
function formatCurrency(amount: number): string {
  return `NT$${amount.toLocaleString('zh-TW')}`
}

export async function POST(request: NextRequest) {
  try {
    const { reportType, startDate, endDate }: ExportRequest = await request.json()

    // 動態導入 xlsx
    const xlsx = await getXLSX()

    // 根據報表類型獲取數據
    const data = await getReportData(reportType, startDate, endDate)

    // 創建工作簿
    const workbook = xlsx.utils.book_new()

    // 根據報表類型生成工作表
    const worksheets = generateWorksheets(data, reportType, startDate, endDate)

    worksheets.forEach((ws) => {
      xlsx.utils.book_append_sheet(workbook, ws.sheet, ws.name)
    })

    // 生成 Excel buffer
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 返回文件
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${reportType}_${startDate}_${endDate}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Excel 導出錯誤:', error)
    return NextResponse.json(
      { error: '導出失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * 根據報表類型獲取數據
 */
async function getReportData(reportType: string, startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  switch (reportType) {
    case 'orders':
      return await db.gasOrder.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

    case 'inventory':
      return await db.inventory.findMany({
        orderBy: { product: { name: 'asc' } },
        include: {
          product: true,
        },
      })

    case 'costs':
      return await db.costRecord.findMany({
        where: {
          date: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { date: 'desc' },
      })

    case 'checks':
      return await db.check.findMany({
        where: {
          depositDate: {
            gte: start,
            lte: end,
          },
        },
        include: {
          customer: true,
        },
        orderBy: { depositDate: 'desc' },
      })

    case 'customers':
      return await db.customer.findMany({
        include: {
          group: true,
        },
        orderBy: { name: 'asc' },
      })

    case 'monthly':
      return await db.monthlyStatement.findMany({
        where: {
          month: {
            gte: start,
            lte: end,
          },
        },
        include: {
          customer: true,
        },
        orderBy: { month: 'desc' },
      })

    case 'profit-loss':
      // 獲取訂單和成本記錄
      const [orders, costs] = await Promise.all([
        db.gasOrder.findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        }),
        db.costRecord.findMany({
          where: {
            date: {
              gte: start,
              lte: end,
            },
          },
        }),
      ])
      return { orders, costs }

    case 'complete':
      // 獲取所有數據
      const [allOrders, allInventory, allCosts, allChecks, allCustomers, allMonthly] =
        await Promise.all([
          db.gasOrder.findMany({
            where: {
              createdAt: { gte: start, lte: end },
            },
            include: { customer: true, items: { include: { product: true } } },
          }),
          db.inventory.findMany({ include: { product: true } }),
          db.costRecord.findMany({
            where: { date: { gte: start, lte: end } },
          }),
          db.check.findMany({
            where: { depositDate: { gte: start, lte: end } },
            include: { customer: true },
          }),
          db.customer.findMany({ include: { group: true } }),
          db.monthlyStatement.findMany({
            where: { month: { gte: start, lte: end } },
            include: { customer: true },
          }),
        ])
      return {
        orders: allOrders,
        inventory: allInventory,
        costs: allCosts,
        checks: allChecks,
        customers: allCustomers,
        monthly: allMonthly,
      }

    default:
      throw new Error('不支持的報表類型')
  }
}

/**
 * 生成工作表
 */
function generateWorksheets(
  data: any,
  reportType: string,
  startDate: string,
  endDate: string
): Array<{ name: string; sheet: any }> {
  const xlsx = require('xlsx')

  switch (reportType) {
    case 'orders': {
      const rows = (data as any[]).map((order) => ({
        '訂單編號': order.id,
        '客戶名稱': order.customer?.name || '',
        '聯絡電話': order.customer?.phone || '',
        '地址': order.customer?.address || '',
        '配送日期': formatDate(order.deliveryDate),
        '總金額': order.totalAmount,
        '狀態': order.status,
        '備註': order.notes || '',
        '創建時間': formatDate(order.createdAt),
      }))

      const sheet = xlsx.utils.json_to_sheet(rows)
      return [{ name: '訂單報表', sheet }]
    }

    case 'inventory': {
      const rows = (data as any[]).map((item) => ({
        '產品名稱': item.product?.name || '',
        '規格': item.product?.specification || '',
        '類別': item.product?.category || '',
        '當前庫存': item.quantity,
        '最小庫存': item.minStock,
        '單位成本': item.product?.costPrice || 0,
        '售價': item.product?.sellingPrice || 0,
        '庫存價值': (item.quantity || 0) * (item.product?.costPrice || 0),
        '狀態': item.quantity <= item.minStock ? '庫存不足' : '正常',
      }))

      const sheet = xlsx.utils.json_to_sheet(rows)
      return [{ name: '庫存報表', sheet }]
    }

    case 'costs': {
      const rows = (data as any[]).map((cost) => ({
        '日期': formatDate(cost.date),
        '類別': cost.category,
        '金額': cost.amount,
        '說明': cost.description || '',
        '付款方式': cost.paymentMethod || '',
      }))

      const sheet = xlsx.utils.json_to_sheet(rows)

      // 總計行
      const totalAmount = (data as any[]).reduce((sum, cost) => sum + (cost.amount || 0), 0)
      xlsx.utils.sheet_add_aoa(sheet, [['', '', '總計:', totalAmount]], { origin: -1 })

      return [{ name: '成本報表', sheet }]
    }

    case 'checks': {
      const rows = (data as any[]).map((check) => ({
        '支票號碼': check.checkNumber,
        '客戶名稱': check.customer?.name || '',
        '金額': check.amount,
        '到期日': formatDate(check.dueDate),
        '存入日期': formatDate(check.depositDate),
        '狀態': check.status,
        '銀行': check.bank || '',
      }))

      const sheet = xlsx.utils.json_to_sheet(rows)
      return [{ name: '支票報表', sheet }]
    }

    case 'customers': {
      const rows = (data as any[]).map((customer) => ({
        '客戶名稱': customer.name,
        '聯絡電話': customer.phone,
        '地址': customer.address,
        '客戶群組': customer.group?.name || '',
        '付款方式': customer.paymentType,
        '欠款金額': customer.outstandingAmount || 0,
        '創建日期': formatDate(customer.createdAt),
      }))

      const sheet = xlsx.utils.json_to_sheet(rows)
      return [{ name: '客戶資料', sheet }]
    }

    case 'monthly': {
      const rows = (data as any[]).map((statement) => ({
        '客戶名稱': statement.customer?.name || '',
        '月份': formatDate(statement.month).substring(0, 7),
        '期初餘額': statement.openingBalance || 0,
        '本期金額': statement.currentAmount || 0,
        '期末餘額': statement.closingBalance || 0,
        '付款狀態': statement.paymentStatus,
        '付款日期': statement.paymentDate ? formatDate(statement.paymentDate) : '',
      }))

      const sheet = xlsx.utils.json_to_sheet(rows)
      return [{ name: '月結報表', sheet }]
    }

    case 'profit-loss': {
      const { orders, costs } = data as { orders: any[]; costs: any[] }

      // 計算營收
      const revenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
      const totalCost = costs.reduce((sum, cost) => sum + (cost.amount || 0), 0)
      const profit = revenue - totalCost
      const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) + '%' : '0%'

      // 損益表
      const plRows = [
        { '項目': '營業收入', '金額': revenue },
        { '項目': '營業成本', '金額': totalCost },
        { '項目': '營業利潤', '金額': profit },
        { '項目': '利潤率', '金額': profitMargin },
      ]

      const plSheet = xlsx.utils.json_to_sheet(plRows)

      // 訂單明細
      const orderRows = orders.map((order) => ({
        '訂單編號': order.id,
        '客戶': order.customer?.name || '',
        '金額': order.totalAmount,
        '日期': formatDate(order.createdAt),
      }))
      const ordersSheet = xlsx.utils.json_to_sheet(orderRows)

      // 成本明細
      const costRows = costs.map((cost) => ({
        '日期': formatDate(cost.date),
        '類別': cost.category,
        '金額': cost.amount,
        '說明': cost.description || '',
      }))
      const costsSheet = xlsx.utils.json_to_sheet(costRows)

      return [
        { name: '損益表', sheet: plSheet },
        { name: '訂單明細', sheet: ordersSheet },
        { name: '成本明細', sheet: costsSheet },
      ]
    }

    case 'complete': {
      const sheets: Array<{ name: string; sheet: any }> = []

      // 添加各個工作表
      const orderSheets = generateWorksheets(data.orders, 'orders', startDate, endDate)
      const inventorySheets = generateWorksheets(data.inventory, 'inventory', startDate, endDate)
      const costSheets = generateWorksheets(data.costs, 'costs', startDate, endDate)
      const checkSheets = generateWorksheets(data.checks, 'checks', startDate, endDate)
      const customerSheets = generateWorksheets(data.customers, 'customers', startDate, endDate)
      const monthlySheets = generateWorksheets(data.monthly, 'monthly', startDate, endDate)

      sheets.push(...orderSheets, ...inventorySheets, ...costSheets, ...checkSheets, ...customerSheets, ...monthlySheets)

      // 添加摘要工作表
      const summaryRows = [
        { '報表期間': `${startDate} 至 ${endDate}` },
        { '總訂單數': data.orders?.length || 0 },
        { '總庫存項目': data.inventory?.length || 0 },
        { '總成本記錄': data.costs?.length || 0 },
        { '總支票數': data.checks?.length || 0 },
        { '總客戶數': data.customers?.length || 0 },
        { '月結記錄': data.monthly?.length || 0 },
      ]
      const summarySheet = xlsx.utils.json_to_sheet(summaryRows)
      sheets.unshift({ name: '摘要', sheet: summarySheet })

      return sheets
    }

    default:
      return [{ name: '報表', sheet: xlsx.utils.json_to_sheet([]) }]
  }
}
