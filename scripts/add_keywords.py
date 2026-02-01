# -*- coding: utf-8 -*-
with open('/root/媽媽ios/app/api/webhook/line/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

keyword_code = '''
// 關鍵字觸發配置 - 只有包含這些關鍵字的訊息才會回覆
const KEYWORD_TRIGGERS = [
  '瓦斯', '訂瓦斯', '買瓦斯', '要瓦斯', '瓦斯桶', '桶',
  '4kg', '10kg', '16kg', '20kg', '50kg', '公斤',
  '訂單', '查訂單', '我的訂單', '訂購', '下單',
  '價格', '多少錢', '價錢', '費用',
  '庫存', '還有多少', '有沒有貨',
  '聯絡', '聯繫', '電話', '地址', '營業',
  '你好', '您好', '嗨', 'hi', 'hello',
  '幫助', '說明', '怎麼用', '?',
  '任務', '報表', '營收', '業績',
  '綁定', '會員', '我是新',
]

function containsTriggerKeyword(message: string): boolean {
  const lower = message.toLowerCase().trim()
  for (const kw of KEYWORD_TRIGGERS) {
    if (lower.includes(kw.toLowerCase())) return true
  }
  if (message.startsWith('/') || message.startsWith('！')) return true
  return false
}

'''

# Insert before export async function POST
target = 'export async function POST(request: NextRequest) {'
if target in content:
    content = content.replace(target, keyword_code + target)
    print("Added keyword config")
else:
    print("Target not found: " + target)

with open('/root/媽媽ios/app/api/webhook/line/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
