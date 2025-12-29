'use client'

/**
 * 专业 AI 助手对话页面
 * 类似官方网站的对话界面
 * 接入 GLM API 实时对话
 */

import { ProfessionalChat } from '@/components/ProfessionalChat'
import { BrandIcon } from '@/components/BrandIcon'

export const dynamic = 'force-dynamic'

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <a
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-1.5 rounded-lg">
              <BrandIcon size={20} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900">九九瓦斯行</span>
          </a>
          <div className="flex-1" />
          <h1 className="text-lg font-bold text-gray-900">AI 助手</h1>
        </div>
      </header>

      {/* 对话界面 */}
      <ProfessionalChat
        title="九九瓦斯行 AI 助手"
        placeholder="輸入您的問題，例如：今天的订单、庫存查詢..."
        initialMessage="您好！👋 我是九九瓦斯行的專業 AI 助手。\n\n我可以幫您：\n\n🛵 **查詢訂單** - 今日訂單、配送狀態\n📦 **庫存管理** - 查詢瓦斯庫存\n👥 **客戶資訊** - 查詢客戶資料\n💰 **營收統計** - 今日營收、月度報表\n📅 **休假管理** - 今日休假人員\n\n請問今天有什麼可以幫您的呢？"
      />
    </div>
  )
}
