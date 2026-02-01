import { NextRequest, NextResponse } from 'next/server'
import { search } from '@/lib/ai-sdk'

interface SearchStoresRequest {
  query: string
  limit?: number
}

// 優化的搜尋查詢 - 專注於網路上有推廣的店家
function buildSearchQueries(query: string): string[] {
  const baseQuery = query.trim()

  return [
    // 尋找有完整資訊的店家（電話、地址、圖片）
    `${baseQuery} 花蓮 店 電話 地址 推薦 圖片`,
    `${baseQuery} 花蓮 美食 餐廳 電話 地址 外觀`,
    `${baseQuery} 花蓮 店家 聯絡方式 門市照片`,
    `${baseQuery} 花蓮 店 推薦 網評 電話`,
    
    // 尋找在各大平台推廣的店家
    `${baseQuery} 花蓮 Google 評分 地圖`,
    `${baseQuery} 花蓮 iPeen 愛評網`,
    `${baseQuery} 花蓮 網友推薦 店家`,
    `${baseQuery} 花蓮 食記 網誌 推薦`,
    
    // 尋找有LINE的店家
    `${baseQuery} 花蓮 LINE 官方帳號 電話`,
    `${baseQuery} 花蓮 店 加好友 聯絡`,
    
    // 尋找有完整資訊的店家頁面
    `${baseQuery} 花蓮 店 介紹 聯絡 地址 電話`,
    `${baseQuery} 花蓮 店 門市照片 營業資訊`,
  ]
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchStoresRequest = await request.json()
    const { query, limit = 50 } = body // 提高默認數量

    if (!query || !query.trim()) {
      return NextResponse.json(
        { success: false, error: '搜尋關鍵字為必填項' },
        { status: 400 }
      )
    }

    // 構建優化的搜尋查詢
    const searchQueries = buildSearchQueries(query)

    // 使用 web search 並發搜尋多個查詢
    const searchPromises = searchQueries.map(q => search.search(q))
    const searchResults = await Promise.all(searchPromises)

    // 收集所有結果
    const allResults = []
    for (const result of searchResults) {
      if (result && result.results) {
        allResults.push(...result.results)
      }
    }

    if (allResults.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        total: 0,
      })
    }
    
    // 去重 - 根據URL去重
    const urlMap = new Map<string, any>()
    for (const result of allResults) {
      const url = result.url || ''
      if (url && !urlMap.has(url)) {
        urlMap.set(url, result)
      }
    }
    
    const uniqueResults = Array.from(urlMap.values())
    
    // 過濾和排序結果 - 優先展示有完整資訊的店家
    const filteredResults = uniqueResults
      .filter((result: any) => {
        const title = (result.title || '').toLowerCase()
        const snippet = (result.snippet || '').toLowerCase()
        const url = (result.url || '').toLowerCase()
        const combined = `${title} ${snippet} ${url}`

        // 必須包含關鍵字
        if (!combined.includes(query.toLowerCase())) {
          return false
        }

        // 過濾掉新聞、論壇、部落格首頁等非店家頁面
        const excludedKeywords = [
          '新聞', 'news', 
          '討論', '論壇', 'forum',
          '日誌', 'blog', '部落格',
          '首頁', '首頁'
        ]
        
        for (const keyword of excludedKeywords) {
          if (combined.includes(keyword)) {
            // 除非同時包含店家相關關鍵字
            const storeKeywords = [
              '店', '餐廳', '美食', '小吃', '咖啡廳',
              '餐', '食', '廳', '館', '店',
              '電話', '地址', '聯絡', '營業'
            ]
            if (!storeKeywords.some(k => combined.includes(k))) {
              return false
            }
          }
        }

        // 優先保留有電話或地址的結果
        const hasPhone = /\d{2,3}[-]?\d{3,4}[-]?\d{4}/.test(combined) ||
                        /09\d{2}[-]?\d{3}[-]?\d{3}/.test(combined)
        const hasAddress = /地址|address|花蓮市|吉安鄉|壽豐鄉|新城鄉|秀林鄉|光復鄉|豐濱鄉|瑞穗鄉|玉里鎮|卓溪鄉|萬榮鄉|鳳林鎮|富里鄉|壽豐鄉/.test(combined)
        
        // 如果同時有電話和地址，優先保留
        if (hasPhone && hasAddress) {
          return true
        }

        // 如果有電話或地址其中之一，也保留
        if (hasPhone || hasAddress) {
          return true
        }

        // 其他情況，檢查是否是店家頁面
        const storePageIndicators = [
          '店', '餐廳', '美食', '小吃', '咖啡廳',
          '飲料店', '冰店', '麵線', '便當',
          '營業資訊', '聯絡方式', '門市介紹'
        ]
        return storePageIndicators.some(k => combined.includes(k))
      })
      // 根據相關性排序
      .map((result: any) => {
        const title = (result.title || '').toLowerCase()
        const snippet = (result.snippet || '').toLowerCase()
        const combined = `${title} ${snippet}`

        // 計算相關性分數
        let score = 0

        // 包含電話號碼
        if (/\d{2,3}[-]?\d{3,4}[-]?\d{4}/.test(combined) || 
            /09\d{2}[-]?\d{3}[-]?\d{3}/.test(combined)) {
          score += 5
        }

        // 包含地址
        if (/地址|address|花蓮市|吉安鄉|壽豐鄉/.test(combined)) {
          score += 3
        }

        // 包含店家相關詞
        const storeKeywords = ['店', '餐廳', '美食', '小吃', '咖啡廳']
        storeKeywords.forEach(k => {
          if (combined.includes(k)) score += 1
        })

        // 包含推薦評價詞
        if (combined.includes('推薦') || combined.includes('評分') || combined.includes('愛評')) {
          score += 2
        }

        // 包含LINE相關詞
        if (combined.includes('line') || combined.includes('LINE')) {
          score += 2
        }

        return { ...result, score }
      })
      // 按分數降序排序
      .sort((a: any, b: any) => b.score - a.score)
      // 移除分數字段
      .map((result: any) => {
        const { score, ...rest } = result
        return rest
      })
      .slice(0, limit)
      .map((result: any) => ({
        title: result.title || '',
        url: result.url || '',
        snippet: result.snippet || '',
        // 標記是否有完整資訊
        hasPhone: /\d{2,3}[-]?\d{3,4}[-]?\d{4}/.test(result.snippet || '') ||
                 /09\d{2}[-]?\d{3}[-]?\d{3}/.test(result.snippet || ''),
        hasAddress: /地址|address|花蓮市|吉安鄉/.test(result.snippet || ''),
      }))

    return NextResponse.json({
      success: true,
      results: filteredResults,
      total: filteredResults.length,
      searchQueries: searchQueries, // 返回使用的查詢
    })
  } catch (error) {
    console.error('Error searching stores:', error)
    return NextResponse.json(
      {
        success: false,
        error: '搜尋店家時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
