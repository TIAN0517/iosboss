import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * 發送 LINE 通知
 * 支援多種通知類型
 */
export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
    }
    const { type, recipient, data } = body

    const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (!lineChannelAccessToken) {
      return NextResponse.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN 未設定' }, { status: 500 })
    }

    let message = ''
    let userId = recipient

    switch (type) {
      case 'order_created':
        // 訂單建立通知
        message = formatOrderCreatedMessage(data)
        break

      case 'order_status_update':
        // 訂單狀態更新通知
        message = formatOrderStatusMessage(data)
        break

      case 'inventory_low':
        // 庫存不足通知
        message = formatInventoryLowMessage(data)
        // 發送到管理員群組
        userId = process.env.LINE_ADMIN_GROUP_ID
        break

      case 'payment_reminder':
        // 付款提醒
        message = formatPaymentReminderMessage(data)
        break

      case 'daily_report':
        // 每日營收報告
        message = formatDailyReportMessage(data)
        // 發送到管理員群組
        userId = process.env.LINE_ADMIN_GROUP_ID
        break

      case 'check_due_reminder':
        // 支票到期提醒
        message = formatCheckDueReminderMessage(data)
        break

      default:
        return NextResponse.json({ error: '不支援的通知類型' }, { status: 400 })
    }

    // 發送 LINE 訊息
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineChannelAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: message,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LINE API Error: ${error}`)
    }

    // 記錄發送歷史
    await db.lineMessage.create({
      data: {
        messageType: 'text',
        userId: userId as string,
        message: message,
        intent: type,
        response: JSON.stringify({ success: true }),
      },
    })

    return NextResponse.json({ success: true, message: '通知已發送' })
  } catch (error) {
    console.error('LINE notification error:', error)
    return NextResponse.json({ error: '發送通知失敗' }, { status: 500 })
  }
}

/**
 * 格式化訂單建立通知
 */
function formatOrderCreatedMessage(order: any): string {
  const items = order.items?.map((i: any) => `${i.product?.name} x${i.quantity}`).join(', ') || '瓦斯'
  return `📦 【新訂單通知】

親愛的 ${order.customer?.name || '客戶'}，

您的訂單已建立！
📋 訂單編號：${order.orderNo}
🛒 商品：${items}
💰 金額：NT$${order.totalAmount?.toLocaleString()}
📍 配送地址：${order.deliveryAddress || '店內取貨'}

我們會盡快為您安排配送，感謝您的訂購！🙏

九九瓦斯行`
}

/**
 * 格式化訂單狀態更新通知
 */
function formatOrderStatusMessage(data: any): string {
  const statusMap: Record<string, string> = {
    processing: '處理中',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }

  const statusText = statusMap[data.status] || data.status

  return `📦 【訂單狀態更新】

親愛的 ${data.customerName || '客戶'}，

您的訂單狀態已更新：
📋 訂單編號：${data.orderNo}
✅ 狀態：${statusText}

${data.status === 'delivering' ? '🚕 司機正在前往配送中，請保持電話暢通！' : ''}
${data.status === 'completed' ? '✅ 訂單已完成，感謝您的訂購！' : ''}

如有疑問請致電：
📞 九九瓦斯行

感謝您的支持！🙏`
}

/**
 * 格式化庫存不足通知
 */
function formatInventoryLowMessage(data: any): string {
  return `⚠️ 【庫存不足警告】

店長請注意！

以下產品庫存不足：
${data.items?.map((item: any) => `• ${item.productName}：剩 ${item.quantity} ${item.unit}（最低庫存：${item.minStock} ${item.unit}）`).join('\n') || ''}

⏰ 時間：${new Date().toLocaleString('zh-TW')}

請盡快安排補貨，以免影響營運！

📱 系統通知`
}

/**
 * 格式化付款提醒
 */
function formatPaymentReminderMessage(data: any): string {
  return `💰 【付款提醒】

親愛的 ${data.customerName || '客戶'}，

温馨提醒您：
📋 月結帳單金額：NT$${data.amount?.toLocaleString()}
📅 帳單月份：${data.month}
📅 到期日：${new Date(data.dueDate).toLocaleDateString('zh-TW')}

請於到期日前完成結帳，感謝您的配合！

如有疑問請聯繫：
📞 九九瓦斯行

感謝您的支持！🙏`
}

/**
 * 格式化每日營收報告
 */
function formatDailyReportMessage(data: any): string {
  return `📊 【每日營收報告】

📅 日期：${new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}

💰 今日營收：NT$${data.revenue?.toLocaleString() || 0}
📦 訂單數量：${data.orderCount || 0} 筆
👥 客戶數：${data.customerCount || 0} 位
📈 利潤率：${data.profitMargin ? data.profitMargin.toFixed(1) : 0}%

${data.topProduct ? `🏆 熱銷商品：${data.topProduct}` : ''}

${data.revenue > 10000 ? '🎉 今日營收破萬，表現優異！' : ''}

📱 系統自動報告`
}

/**
 * 格式化支票到期提醒
 */
function formatCheckDueReminderMessage(data: any): string {
  const daysUntilDue = Math.ceil((new Date(data.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return `📅 【支票到期提醒】

店長請注意！

支票資訊：
🏢 銀行：${data.bankName}
📝 支票號碼：${data.checkNumber}
💰 金額：NT$${data.amount?.toLocaleString()}
📅 到期日：${new Date(data.dueDate).toLocaleDateString('zh-TW')}
👤 客戶：${data.customerName || '未知'}

${daysUntilDue <= 0 ? '⚠️ 支票已到期！請立即處理！' : daysUntilDue <= 3 ? '⚠️ 支票即將到期！' : ''}

⏰ 提醒時間：${new Date().toLocaleString('zh-TW')}

📱 系統通知`
}
