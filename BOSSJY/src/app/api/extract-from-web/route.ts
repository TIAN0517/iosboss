import { NextRequest, NextResponse } from 'next/server'
import { webReader } from '@/lib/ai-sdk'
import { llm } from '@/lib/ai-sdk'

interface ExtractFromWebRequest {
  url: string
}

// AI提示詞 - 從網頁內容提取店家完整資訊
const EXTRACT_STORE_INFO_PROMPT = `
你是一位專業的店家資訊提取專家。你的任務是從網頁內容中精準地提取店家的完整資訊，特別關注網路上有推廣的店家。

請分析以下網頁內容，並提取以下資訊（非常重要，請確保提取到所有資訊）：

1. **店家名稱 (Name)**: 店家的正式名稱 ⭐ 必填
   - 通常是頁面的標題、H1標籤或主要的品牌名稱
   - 找出最明顯、最官方的店家名稱
   - 不要只取網頁標題，要找真正的店家名稱
   - 例如：「王記麵線」、「花蓮鵝肉先生」、「早安美芝城」

2. **電話號碼 (Phone Number)**: 店家的聯絡電話 ⭐ 必填
   - 這是最重要的資訊，必須精準
   - 台灣電話格式：
     * 手機：09xx-xxx-xxx 或 09xx xxx xxx 或 09xxxxxxxx
     * 市話：03-xxx-xxxx（花蓮）或其他區號
   - 搜索整個頁面，包括：
     * 聯絡我們頁面
     * 頁首或頁尾
     * Google Maps嵌入
     * 社群媒體連結
   - 如果有多個電話，提取主要的客戶服務電話
   - 如果找不到任何電話，返回 null

3. **地址 (Address)**: 店家的營業地址 ⭐ 必填
   - 完整的台灣地址，包含縣市、鄉鎮市、路名、號碼
   - 花蓮縣地址範例：
     * 花蓮市中山路一段123號
     * 花蓮縣吉安鄉建國路二段456號
     * 花蓮縣壽豐鄉中山路三段789號
   - 搜索位置：
     * Google Maps嵌入
     * 店家介紹區塊
     * 聯絡資訊區塊
   - 如果沒有地址，返回 null

4. **網站 (Website)**: 店家的官方網站或主要頁面 ⭐ 必填
   - 使用提供的URL或找到的官方網站
   - 通常是「關於我們」、「官方網站」等連結
   - 如果沒有，使用當前頁面URL

5. **門面圖片 (Storefront Image URL)**: 店家門面、招牌或店鋪照片 ⭐ 重要
   - 這是店家的形象代表，必須找到
   - 搜索範圍：
     * Google Maps街景照片
     * Google Maps店家照片
     * 頁面上的店家照片
     * Hero banner 或頭圖
     * 圖片庫中包含門面或招牌的照片
   - 如果有Google Maps嵌入，提取店家照片URL（通常是staticmap或photo來源）
   - 優先選擇：
     1. Google Maps店家照片
     2. Google Maps街景照片
     3. 頁面主圖
     4. 明顯的店家門面照片
   - 如果找不到門面照片，返回 null

6. **招牌描述 (Signboard Description)**: 店家招牌的詳細描述
   - 從圖片或內容中提取招牌資訊
   - 描述招牌的：
     * 顏色（紅色、黃色、藍色等）
     * 文字內容（招牌上的字）
     * 設計風格（現代、復古、簡約等）
     * 特色裝飾（燈光、動態效果等）
   - 如果照片中明顯有招牌，詳細描述
   - 如果沒有照片或沒有招牌，返回 null

7. **LINE帳號 (LINE Account)**: 店家的LINE相關資訊 ⭐ 重要
   - 搜索整個頁面尋找LINE相關資訊：
     * LINE ID（例如：@abc123）
     * LINE官方帳號名稱
     * 加好友連結（例如：line.me/R/ti/p/...）
     * LINE聯絡二維碼
   - 搜索位置：
     * 社群媒體區塊
     * 聯絡方式區塊
     * 頁首或頁尾
   - 如果找到LINE資訊，詳細說明
   - 如果沒有LINE資訊，返回 null

8. **地點 (Location)**: 店家所在的地點 ⭐ 必填
   - 台灣花蓮縣的鄉鎮市：
     * 花蓮市
     * 吉安鄉
     * 壽豐鄉
     * 新城鄉
     * 秀林鄉
     * 光復鄉
     * 豐濱鄉
     * 瑞穗鄉
     * 玉里鎮
     * 卓溪鄉
     * 萬榮鄉
     * 鳳林鎮
     * 富里鄉
   - 從地址或頁面內容判斷
   - 如果無法確定，返回「台灣花蓮縣」

重要規則和注意事項：
- ⭐ 只提取網頁中確實存在的資訊，不要推測或編造
- ⭐ 電話號碼必須精準，格式化為標準台灣格式（09xx-xxx-xxx）
- ⭐ 地址必須完整，包含縣市和鄉鎮市
- ⭐ 優先提取Google Maps中的店家照片（通常是最高質量的門面照）
- ⭐ 搜索所有可能的LINE相關資訊
- ⭐ 店家名稱要選擇最正式的那一個
- ⭐ 使用繁體中文
- ⭐ 如果找不到某項資訊，明確返回 null

網頁標題：{{page_title}}
網頁URL：{{page_url}}
網頁內容：
{{page_content}}

請以JSON格式返回結果，格式如下：
{
  "name": "店家名稱（必填）",
  "phoneNumber": "電話號碼 或 null（必填，格式化為 09xx-xxx-xxx）",
  "address": "完整地址 或 null（必填，包含縣市鄉鎮市）",
  "website": "網站URL（必填）",
  "imageUrl": "門面照片URL 或 null（重要，優先Google Maps店家照）",
  "signboard": "招牌詳細描述 或 null",
  "lineAccount": "LINE帳號資訊 或 null",
  "location": "地點（必填，例如：台灣花蓮縣花蓮市）"
}

⚠️ 只返回JSON，不要包含其他文字或說明。
⚠️ 確保所有必填項目都有值，如果找不到，返回 null。
⚠️ 電話號碼格式化為標準格式（加上分隔符）。
`

export async function POST(request: NextRequest) {
  try {
    const body: ExtractFromWebRequest = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL為必填項' },
        { status: 400 }
      )
    }

    // 驗證URL格式
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { success: false, error: '無效的URL格式' },
        { status: 400 }
      )
    }

    // 使用 web reader 讀取網頁內容
    let pageContent = ''
    let pageTitle = ''

    try {
      const readerResult = await webReader.extract(url)

      if (readerResult) {
        pageContent = readerResult.content || readerResult.html || ''
        pageTitle = readerResult.title || ''
      }
    } catch (readError) {
      console.error('Failed to read web page:', readError)
    }

    // 如果讀取失敗或內容太少，嘗試直接獲取
    if (!pageContent || pageContent.length < 500) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        })

        if (response.ok) {
          const html = await response.text()
          pageContent = html.substring(0, 80000) // 增加內容長度限制
          const titleMatch = html.match(/<title>([^<]+)<\/title>/)
          const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
          pageTitle = h1Match ? h1Match[1] : (titleMatch ? titleMatch[1] : '')
        }
      } catch (fetchError) {
        console.error('Failed to fetch page:', fetchError)
      }
    }

    if (!pageContent) {
      return NextResponse.json(
        {
          success: false,
          error: '無法讀取網頁內容',
          details: '網頁可能不存在或無法訪問',
        },
        { status: 400 }
      )
    }

    // 使用 AI 提取店家資訊
    let prompt = EXTRACT_STORE_INFO_PROMPT
      .replace('{{page_title}}', pageTitle)
      .replace('{{page_url}}', url)
      .replace('{{page_content}}', pageContent.substring(0, 15000)) // 增加提示詞長度

    try {
      const llmResult = await llm.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: '你是一位專業的店家資訊提取專家，擅長從網頁內容中精準提取店家的完整資訊（店名、地址、電話、門面照片、LINE等）。你特別擅長找到網路上有推廣的店家的完整資訊。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // 低溫度以獲得更精確的結果
      })

      const content = llmResult.choices[0]?.message?.content || ''

      // 解析 JSON 結果
      let storeInfo: any = {}

      try {
        // 嘗試從回應中提取 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          storeInfo = JSON.parse(jsonMatch[0])
        } else {
          storeInfo = JSON.parse(content)
        }

        // 格式化電話號碼
        if (storeInfo.phoneNumber && typeof storeInfo.phoneNumber === 'string') {
          const phone = storeInfo.phoneNumber.replace(/[^\d]/g, '')
          if (phone.length === 10) {
            storeInfo.phoneNumber = `${phone.substring(0, 4)}-${phone.substring(4, 7)}-${phone.substring(7, 10)}`
          } else if (phone.length === 9 && phone.startsWith('0')) {
            storeInfo.phoneNumber = `${phone.substring(0, 2)}-${phone.substring(2, 5)}-${phone.substring(5, 9)}`
          }
        }

        // 驗證必要欄位
        if (!storeInfo.name) {
          storeInfo.name = pageTitle || url
        }

        if (!storeInfo.website) {
          storeInfo.website = url
        }

        if (!storeInfo.location) {
          storeInfo.location = '台灣花蓮縣'
        }

        // 清理數據
        const cleanedStore = {
          name: storeInfo.name || '',
          phoneNumber: storeInfo.phoneNumber || null,
          address: storeInfo.address || null,
          website: storeInfo.website || url,
          imageUrl: storeInfo.imageUrl || null,
          signboard: storeInfo.signboard || null,
          lineAccount: storeInfo.lineAccount || null,
          location: storeInfo.location || '台灣花蓮縣',
        }

        return NextResponse.json({
          success: true,
          store: cleanedStore,
        })
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError)
        console.error('Content:', content.substring(0, 500))

        // 如果JSON解析失敗，使用正則表達式提取基本資訊
        const phoneRegex = /09\d{2}[-\s]?\d{3}[-\s]?\d{3}|0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g
        const phoneMatches = pageContent.match(phoneRegex) || []
        
        const addressRegex = /花蓮[縣市]?.*(市鄉鎮)?.*[路街]\d+[號樓層段]/g
        const addressMatches = pageContent.match(addressRegex) || []

        return NextResponse.json({
          success: true,
          store: {
            name: pageTitle || url,
            phoneNumber: phoneMatches[0] || null,
            address: addressMatches[0] || null,
            website: url,
            imageUrl: null,
            signboard: null,
            lineAccount: null,
            location: '台灣花蓮縣',
          },
        })
      }
    } catch (llmError) {
      console.error('LLM extraction error:', llmError)
      throw llmError
    }
  } catch (error) {
    console.error('Error extracting store info:', error)
    return NextResponse.json(
      {
        success: false,
        error: '提取店家資訊時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
