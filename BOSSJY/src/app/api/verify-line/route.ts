import { NextRequest, NextResponse } from 'next/server'
import { search } from '@/lib/ai-sdk'

interface VerifyLineRequest {
  phoneNumber: string
  storeName?: string
  storeData?: any
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyLineRequest = await request.json()
    const { phoneNumber, storeName } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: '沒有提供電話號碼' },
        { status: 400 }
      )
    }

    // Normalize phone number (remove dashes and spaces)
    const normalizedPhone = phoneNumber.replace(/[-\s]/g, '')

    // Search for phone number and LINE association
    const searchQueries = [
      `電話 ${phoneNumber} LINE ${storeName || ''} 台灣 花蓮`,
      `電話 ${phoneNumber} LINE`,
      `${storeName || ''} LINE 聯絡`
    ]
    
    let searchResults: any[] = []
    let foundLineActivity = false
    let evidence = ''
    let confidence = 'low'

    try {
      // Perform multiple searches concurrently
      const searchPromises = searchQueries.map(q => search.search(q))
      const results = await Promise.all(searchPromises)

      // Combine all results
      for (const result of results) {
        if (result && result.results) {
          searchResults.push(...result.results)
        }
      }

      if (searchResults.length > 0) {
        // Analyze search results for LINE activity evidence
        for (const result of searchResults) {
          const title = (result.title || '').toLowerCase()
          const snippet = (result.snippet || '').toLowerCase()
          const content = `${title} ${snippet}`

          // Check for LINE-related keywords
          if (
            content.includes('line') &&
            (content.includes('好友') ||
              content.includes('加') ||
              content.includes('id') ||
              content.includes('official') ||
              content.includes('official account') ||
              content.includes('官方'))
          ) {
            foundLineActivity = true
            confidence = 'medium'
            evidence = `在搜尋結果中發現與LINE相關的資訊: ${result.title}`
            break
          }

          // Check for phone number in search results
          if (content.includes(normalizedPhone) || content.includes(phoneNumber)) {
            if (content.includes('line')) {
              foundLineActivity = true
              confidence = 'high'
              evidence = `直接在搜尋結果中找到電話號碼與LINE的關聯: ${result.title}`
              break
            }
          }
        }
      }
    } catch (searchError) {
      console.error('Search error:', searchError)
      evidence = '無法進行網路搜尋驗證'
    }

    // If no clear evidence found, use LLM for reasoning
    if (!foundLineActivity || confidence === 'low') {
      try {
        // Additional heuristic: Taiwan mobile numbers starting with 09 are more likely to have LINE
        if (normalizedPhone.startsWith('09') && normalizedPhone.length === 10) {
          // Mobile numbers in Taiwan have high LINE penetration
          evidence += ' 台灣手機號碼通常有較高的LINE使用率'
          confidence = confidence === 'low' ? 'medium' : confidence
        }
      } catch (error) {
        console.error('LLM analysis error:', error)
      }
    }

    // Store verification record in database
    try {
      const { db } = await import('@/lib/db')
      await db.phoneNumberVerification.create({
        data: {
          phoneNumber: normalizedPhone,
          lineActive: foundLineActivity,
          notes: evidence,
        },
      })
    } catch (dbError) {
      console.error('Failed to store verification record:', dbError)
      // Continue even if database storage fails
    }

    return NextResponse.json({
      success: true,
      lineActive: foundLineActivity,
      confidence,
      evidence,
      phoneNumber,
      recommendation: foundLineActivity
        ? '此電話號碼很可能有活躍的LINE帳號，可以嘗試透過LINE聯繫此店家'
        : '此電話號碼沒有明確的LINE活躍證據，建議直接撥打電話聯繫',
    })
  } catch (error) {
    console.error('Error verifying LINE activity:', error)
    return NextResponse.json(
      {
        success: false,
        error: '驗證LINE活躍度時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
