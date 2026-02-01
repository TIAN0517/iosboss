#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Read the file
with open('/root/媽媽ios/app/api/webhook/line/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add keyword triggers after the GROUP_PERMISSIONS definition
keyword_config = '''
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

# Find where to insert - after GROUP_PERMISSIONS closing brace
pattern = r"(GENERAL:.*?features.*?\[\]},)"
match = re.search(pattern, content, re.DOTALL)
if match:
    insert_pos = match.end()
    content = content[:insert_pos] + keyword_config + content[insert_pos:]
    print("Added keyword config after GROUP_PERMISSIONS")

# Now add the keyword check in the message handler
old_code = '''        const userMessage = event.message.text.trim()
        const userId = event.source?.userId || 'unknown'
        const groupId = event.source?.groupId || null
        const replyToken = event.replyToken

        console.log(`[LINE] 收到: "${userMessage}" from ${userId}`)'''

new_code = '''        const userMessage = event.message.text.trim()

        // 關鍵字過濾 - 只有包含觸發關鍵字的訊息才會回覆
        if (!containsTriggerKeyword(userMessage)) {
          console.log(`[LINE] 忽略訊息（無關鍵字）: "${userMessage.substring(0, 30)}..."`)
          continue
        }

        const userId = event.source?.userId || 'unknown'
        const groupId = event.source?.groupId || null
        const replyToken = event.replyToken

        console.log(`[LINE] 收到: "${userMessage}" from ${userId}`)'''

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Added keyword filter in message handler")
else:
    print("Warning: Could not find message handler pattern")

# Write back
with open('/root/媽媽ios/app/api/webhook/line/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
