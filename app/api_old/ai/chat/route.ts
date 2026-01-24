import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message } = body
    
    if (!message) {
      return NextResponse.json({
        success: false,
        error: '缺少訊息內容'
      }, { status: 400 })
    }
    
    // 帝皇瓦斯行 AI 助手回應
    const responses = {
      '你好': '您好！歡迎來到九九瓦斯行，有什麼可以為您服務的嗎？',
      '瓦斯': '我們提供安全可靠的瓦斯配送服務，24小時營業，有任何問題都可以聯繫我們。',
      '電話': '九九瓦斯行客服專線：02-XXXX-XXXX，24小時服務！',
      '地址': '九九瓦斯行地址：台灣新北市板橋區，歡迎光臨！',
      '配送': '瓦斯配送服務時間：週一至週日 08:00-22:00，緊急情況24小時服務。',
      '價格': '瓦斯價格請撥打客服專線詢問，或親臨門市了解最新優惠方案。',
      '安全': '使用瓦斯時請注意安全，定期檢查管線，有異味請立即聯繫我們處理。',
      '謝謝': '不客氣！很高興為您服務，如果有任何問題隨時聯繫我們！',
      '掰掰': '掰掰！祝您有美好的一天，九九瓦斯行為您服務！'
    }
    
    let response = '抱歉，我不太理解您的意思。可以告訴我關於瓦斯配送、客服電話、服務時間等相關問題嗎？'
    
    for (const [keyword, answer] of Object.entries(responses)) {
      if (message.includes(keyword)) {
        response = answer
        break
      }
    }
    
    return NextResponse.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '處理請求時發生錯誤'
    }, { status: 500 })
  }
}
