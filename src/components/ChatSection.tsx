'use client'

/**
 * 聊天助手页面组件
 * 集成到主应用的聊天功能
 */

import { useState } from 'react'
import { ProfessionalChat } from '@/components/ProfessionalChat'
import { IOSCard } from '@/components/ui/ios-card'
import { ImmersiveVoiceChat } from '@/components/ImmersiveVoiceChat'
import { Mic, Sparkles } from 'lucide-react'
import { IOSButton } from '@/components/ui/ios-button'
import { triggerHaptic } from '@/lib/ios-utils'

export function ChatSection() {
  const [showImmersiveChat, setShowImmersiveChat] = useState(false)

  if (showImmersiveChat) {
    return (
      <ImmersiveVoiceChat
        onClose={() => {
          triggerHaptic('light')
          setShowImmersiveChat(false)
        }}
        initialMessage="您好！👋 我是九九瓦斯行的智能語音助手。您可以隨時跟我說話，詢問訂單、庫存、客戶資料等問題。點擊下方麥克風開始對話吧！"
      />
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 沉浸式語音聊天入口按鈕 */}
      <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-bold">語音對話模式</h2>
              <p className="text-xs text-purple-100">全屏沉浸式，比豆包更順暢！</p>
            </div>
          </div>
          <IOSButton
            onClick={() => {
              triggerHaptic('medium')
              setShowImmersiveChat(true)
            }}
            className="bg-white text-purple-600 hover:bg-purple-50 gap-2"
          >
            <Mic className="h-5 w-5" />
            開始語音聊天
          </IOSButton>
        </div>
      </div>

      {/* 原有的文字聊天 */}
      <div className="flex-1">
        <ProfessionalChat
          title="九九瓦斯行 AI 助手"
          placeholder="輸入您的問題..."
          initialMessage="您好！我是九九瓦斯行助手，有什麼可以幫您？"
        />
      </div>
    </div>
  )
}
