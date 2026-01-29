import { NextRequest, NextResponse } from 'next/server'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ''

// 九九瓦斯行 Rich Menu 選單配置
const RICH_MENU_CONFIG = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: "九九瓦斯行選單",
  chatBarText: "聯繫我們",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 1250, height: 843 },
      action: { type: "message", text: "預約瓦斯" }
    },
    {
      bounds: { x: 1250, y: 0, width: 1250, height: 843 },
      action: { type: "message", text: "客服諮詢" }
    },
    {
      bounds: { x: 0, y: 843, width: 833, height: 843 },
      action: { type: "message", text: "瓦斯價格" }
    },
    {
      bounds: { x: 833, y: 843, width: 833, height: 843 },
      action: { type: "message", text: "我叫瓦斯" }
    },
    {
      bounds: { x: 1666, y: 843, width: 834, height: 843 },
      action: { type: "uri", uri: "https://line.me/R/ti/p/@your-line-id" }
    }
  ]
}

// 創建 Rich Menu
async function createRichMenu(): Promise<string | null> {
  try {
    const response = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(RICH_MENU_CONFIG),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Rich Menu] Create error:', error)
      return null
    }

    const data = await response.json()
    return data.richMenuId
  } catch (error) {
    console.error('[Rich Menu] Create error:', error)
    return null
  }
}

// 上傳 Rich Menu 圖片
async function uploadRichMenuImage(richMenuId: string, imageUrl: string): Promise<boolean> {
  try {
    // 下載圖片
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) return false
    const imageBuffer = await imageResponse.arrayBuffer()

    const response = await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: Buffer.from(imageBuffer),
    })

    return response.ok
  } catch (error) {
    console.error('[Rich Menu] Upload image error:', error)
    return false
  }
}

// 設定預設 Rich Menu
async function setDefaultRichMenu(richMenuId: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.line.me/v2/bot/user/all/richmenu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ richMenuId }),
    })
    return response.ok
  } catch (error) {
    console.error('[Rich Menu] Set default error:', error)
    return false
  }
}

// 取得所有 Rich Menu
async function getRichMenus(): Promise<any[]> {
  try {
    const response = await fetch('https://api.line.me/v2/bot/richmenu/list', {
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    })

    if (!response.ok) return []
    const data = await response.json()
    return data.richmenus || []
  } catch (error) {
    console.error('[Rich Menu] List error:', error)
    return []
  }
}

// 刪除 Rich Menu
async function deleteRichMenu(richMenuId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    })
    return response.ok
  } catch (error) {
    console.error('[Rich Menu] Delete error:', error)
    return false
  }
}

// POST - 創建 Rich Menu
export async function POST(request: NextRequest) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { action, imageUrl } = body

    if (action === 'create') {
      const richMenuId = await createRichMenu()
      if (!richMenuId) {
        return NextResponse.json({ error: 'Failed to create rich menu' }, { status: 500 })
      }

      // 如果提供了圖片URL，上傳圖片
      if (imageUrl) {
        await uploadRichMenuImage(richMenuId, imageUrl)
      }

      return NextResponse.json({
        success: true,
        data: { richMenuId }
      })
    }

    if (action === 'setDefault') {
      const { richMenuId } = body
      if (!richMenuId) {
        return NextResponse.json({ error: 'richMenuId required' }, { status: 400 })
      }

      const success = await setDefaultRichMenu(richMenuId)
      return NextResponse.json({ success })
    }

    if (action === 'delete') {
      const { richMenuId } = body
      if (!richMenuId) {
        return NextResponse.json({ error: 'richMenuId required' }, { status: 400 })
      }

      const success = await deleteRichMenu(richMenuId)
      return NextResponse.json({ success })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Rich Menu] Error:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}

// GET - 取得 Rich Menu 列表
export async function GET(request: NextRequest) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' }, { status: 500 })
    }

    const menus = await getRichMenus()
    return NextResponse.json({
      success: true,
      data: menus,
      config: RICH_MENU_CONFIG
    })
  } catch (error) {
    console.error('[Rich Menu] Error:', error)
    return NextResponse.json({ error: 'Failed to get rich menus' }, { status: 500 })
  }
}
