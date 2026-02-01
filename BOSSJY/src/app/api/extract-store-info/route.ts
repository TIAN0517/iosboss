import { NextRequest, NextResponse } from 'next/server'
import { vlm } from '@/lib/ai-sdk'

// AI Prompt for analyzing store photos - optimized for Taiwan Hualien area
const STORE_ANALYSIS_PROMPT = `
You are an expert at analyzing store photos from Taiwan, particularly in Hualien County. 
Your task is to extract detailed store information from the provided image.

Please analyze this store photo and extract the following information:

1. **Store Name (店家名稱)**: The official name of the store, usually displayed prominently on the signboard. 
   - Look for Chinese characters on the storefront or sign
   - Note: Taiwan store names are typically in Traditional Chinese
   - Example: "美珍香", "花蓮觀光夜市", "王記麵線"

2. **Phone Number (電話號碼)**: Any phone numbers visible in the photo. This is CRITICAL and must be accurate.
   - Look for phone numbers on signs, windows, posters, or storefront displays
   - Taiwan phone formats: 
     * Mobile: 09xx-xxx-xxx or 09xx xxx xxx
     * Landline: (0X) xxx-xxxx or 0X-xxx-xxxx (e.g., 03-833-xxxx for Hualien)
   - Extract ALL visible phone numbers if multiple are present
   - If no phone number is visible, return "未找到電話號碼"
   - THIS MUST BE EXACT - do not guess or make up numbers

3. **Address (地址)**: The store address if visible.
   - Look for address signs, door numbers, or location indicators
   - Taiwan addresses follow: [District/Town], [Street/Road], [Number/Section], [Floor]
   - Example: "花蓮市中山路一段123號", "吉安鄉建國路二段456號"
   - If address is not visible, try to infer from the street scene or return "未找到地址"

4. **Signboard Description (招牌描述)**: Detailed description of the store's signboard.
   - Describe the colors, design, layout, and key elements
   - Note any special features, logos, or decorations
   - Describe the overall style (modern, traditional, minimal, etc.)
   - Include any additional text or slogans visible

5. **Location (地點)**: Identify if this appears to be in Hualien County, Taiwan.
   - Look for clues like street names, landmarks, or local features
   - Consider the architectural style and neighborhood characteristics
   - If uncertain, mark as "台灣花蓮縣 (疑似)"

IMPORTANT GUIDELINES:
- Be as specific and accurate as possible
- If information is not visible in the image, clearly state "未找到[項目]"
- For phone numbers, accuracy is critical - if you're uncertain, say "未找到電話號碼"
- The phone number MUST be verifiable - only extract if clearly visible
- Use Traditional Chinese for all text output
- Format the response in a structured, easy-to-read manner

Response Format (JSON):
{
  "success": true,
  "data": {
    "name": "店家名稱",
    "phoneNumber": "0912-345-678",
    "address": "花蓮市中山路一段123號",
    "signboard": "紅色招牌，白字，現代設計風格...",
    "location": "台灣花蓮縣"
  }
}
`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: '沒有提供圖片文件' },
        { status: 400 }
      )
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Use VLM to analyze the image
    const result = await vlm.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: STORE_ANALYSIS_PROMPT,
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
    })

    // Parse the VLM response
    const content = result.choices[0]?.message?.content || ''

    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0])
        return NextResponse.json({
          success: true,
          data: {
            name: parsedData.data?.name || '',
            phoneNumber: parsedData.data?.phoneNumber || '',
            address: parsedData.data?.address || '',
            signboard: parsedData.data?.signboard || '',
            location: parsedData.data?.location || '台灣花蓮縣',
            imageUrl: '', // Could be stored if needed
          },
        })
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
    }

    // Fallback: try to extract information using regex patterns
    const phoneRegex = /09\d{2}[-\s]?\d{3}[-\s]?\d{3}|0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g
    const phoneMatches = content.match(phoneRegex) || []
    const phoneNumber = phoneMatches.length > 0 ? phoneMatches[0] : ''

    // Extract store name (look for Chinese text patterns)
    const nameMatch = content.match(/店家名稱[：:]\s*([^\n]+)/)
    const name = nameMatch ? nameMatch[1].trim() : '未識別店家名稱'

    // Extract address
    const addressMatch = content.match(/地址[：:]\s*([^\n]+)/)
    const address = addressMatch ? addressMatch[1].trim() : '未識別地址'

    // Extract signboard description
    const signboardMatch = content.match(/招牌描述[：:]\s*([\s\S]*?)(?=\n\n|\n[^\n]+[：:]|$)/)
    const signboard = signboardMatch ? signboardMatch[1].trim() : '未識別招牌'

    return NextResponse.json({
      success: true,
      data: {
        name,
        phoneNumber,
        address,
        signboard,
        location: '台灣花蓮縣',
      },
    })
  } catch (error) {
    console.error('Error analyzing store image:', error)
    return NextResponse.json(
      {
        success: false,
        error: '分析圖片時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
