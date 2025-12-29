/**
 * LINE Bot Knowledge Base
 * Q&A database for general customer inquiries
 */

export interface QAPair {
  questions: string[]
  answer: string
  category: 'general' | 'pricing' | 'delivery' | 'payment' | 'hours' | 'safety' | 'promotions'
  keywords: string[]
}

// ========================================
// Knowledge Base Class
// ========================================

export class LineKnowledgeBase {
  private qaDatabase: QAPair[] = [
    // Business Hours
    {
      questions: ['營業時間', '幾點開門', '什麼時候開', '有營業嗎', '現在開嗎', '幾點關門'],
      answer: `🏠 九九瓦斯行營業時間

📅 平日：08:00 - 20:00
📅 週日：09:00 - 18:00

如有緊急需求請致電客服，我們會盡快為您服務！`,
      category: 'hours',
      keywords: ['時間', '開門', '營業', '關門', '開'],
    },

    // Pricing
    {
      questions: ['價格', '多少錢', '價錢', '瓦斯多少錢', '瓦斯價格', '費用'],
      answer: `💰 瓦斯價格（2025年參考）

🔵 4kg 瓦斯：NT$180
🔵 20kg 瓦斯：NT$720
🔵 50kg 瓦斯：NT$1,800

以上為參考價格，實際價格以配送時為準。
月結客戶享有專屬折扣優惠！`,
      category: 'pricing',
      keywords: ['價格', '錢', '費用', '多少'],
    },

    // Delivery Areas
    {
      questions: ['配送範圍', '送哪裡', '有送到嗎', '配送區域', '送什麼地方', '可以配送嗎'],
      answer: `🚚 配送服務區域

✅ 台北市全區
✅ 新北市全區
✅ 基隆市部分地區

其他地區請致電詢問是否可配送。

配送時間：平日 2-4 小時內送达！`,
      category: 'delivery',
      keywords: ['配送', '送', '範圍', '地區'],
    },

    // Payment Methods
    {
      questions: ['付款方式', '怎麼付款', '收信用卡', '可以Line Pay嗎', '支付方式', '如何付款'],
      answer: `💳 付款方式

💵 現金（配送時付款）
📝 月結（需申請，公司行號專屬）
📨 支票（月結客戶）
💳 轉帳（銀行匯款）

配送時付款即可，方便快捷！
月結客戶每月結算一次。`,
      category: 'payment',
      keywords: ['付款', '支付', '繳費', '信用卡', 'line pay'],
    },

    // Emergency Contact
    {
      questions: ['聯絡', '電話', '客服', '聯絡方式', '電話幾號', '如何聯絡'],
      answer: `📞 客服專線

📱 電話：02-xxxx-xxxx
📱 手機：09xx-xxx-xxx
💬 LINE：也可直接在此對話詢問

⏰ 服務時間：08:00-20:00

歡迎隨時聯繫我們！`,
      category: 'general',
      keywords: ['聯絡', '電話', '客服', '聯絡方式'],
    },

    // Safety Information
    {
      questions: ['瓦斯安全', '安全注意', '瓦斯外洩', '怎麼使用', '使用注意', '瓦斯漏氣'],
      answer: `⚠️ 瓦斯安全注意事項

✅ 定期檢查管線是否有老化
✅ 使用後確實關閉開關
✅ 保持通風良好
✅ 發現异味立即開窗通風並致電我們

🆘 緊急通報：如發現瓦斯外洩，請立即：
1. 開窗通風
2. 關閉瓦斯開關
3. 勿開關電器
4. 致電我們或消防單位

如有疑問請致電客服。`,
      category: 'safety',
      keywords: ['安全', '注意', '外洩', '漏氣', '使用'],
    },

    // Promotions
    {
      questions: ['優惠', '促銷', '折扣', '活動', '有什麼優惠', '有優惠嗎'],
      answer: `🎉 目前優惠活動

🎁 新客戶首單享 9 折優惠！
🏢 月結客戶享 95 折優惠！
📦 團體訂購（10桶以上）另有優惠！

歡迎新舊客戶訂購，我們會提供最優惠的價格！`,
      category: 'promotions',
      keywords: ['優惠', '促銷', '折扣', '活動'],
    },

    // How to Order
    {
      questions: ['怎麼訂購', '如何訂瓦斯', '要怎麼買', '訂購流程', '我想訂瓦斯'],
      answer: `🛒 如何訂購瓦斯

方法 1：直接在此對話說「我要訂瓦斯」
方法 2：致電客服訂購
方法 3：到我們店面訂購

📦 我們有 4kg、20kg、50kg 瓦斯桶可供選擇！

現在就說「我要訂 20kg 瓦斯」試試看吧！`,
      category: 'general',
      keywords: ['怎麼訂', '如何訂', '訂購', '買', '流程'],
    },

    // Product Info
    {
      questions: ['有什麼產品', '產品種類', '賣什麼', '有哪些瓦斯', '產品有哪些'],
      answer: `📦 我們的產品

瓦斯桶：
• 4kg 瓦斯桶（適合家庭使用）
• 20kg 瓦斯桶（最熱門選擇）
• 50kg 瓦斯桶（商業用）

其他產品：
• 瓦斯爐具
• 熱水器
• 相關配件

歡迎詢問詳細規格與價格！`,
      category: 'general',
      keywords: ['產品', '種類', '賣', '瓦斯', '規格'],
    },

    // Return/Refill
    {
      questions: ['瓦斯桶空了', '換瓦斯', '補瓦斯', '瓦斯空桶', '空桶換滿'],
      answer: `🔄 瓦斯桶更換服務

🚚 我們提供換桶服務！
只需將空瓦斯桶放在指定位置，我們會為您更換滿桶。

💰 換桶價格更優惠！

需要換瓦斯嗎？說「我要換 20kg 瓦斯」即可！`,
      category: 'general',
      keywords: ['換', '空桶', '補', '更換', '空了'],
    },

    // Emergency Delivery
    {
      questions: ['急件', '緊急配送', '立刻送', '馬上送', '急用', '緊急'],
      answer: `🚨 緊急配送服務

如遇緊急情況（瓦斯用完、餐廳營業需要等），請致電客服：

📱 緊急專線：09xx-xxx-xxx

我們會盡快為您安排配送！`,
      category: 'delivery',
      keywords: ['急', '緊急', '立刻', '馬上', '緊急配送'],
    },
  ]

  /**
   * Search for best answer
   */
  findAnswer(question: string): string | null {
    const normalizedQuestion = question.toLowerCase().trim()

    let bestMatch: QAPair | null = null
    let maxScore = 0

    for (const qa of this.qaDatabase) {
      let score = 0

      // Check exact questions match
      for (const q of qa.questions) {
        if (normalizedQuestion === q.toLowerCase()) {
          score += 10
        } else if (normalizedQuestion.includes(q.toLowerCase()) || q.toLowerCase().includes(normalizedQuestion)) {
          score += 5
        }
      }

      // Check keywords match
      for (const keyword of qa.keywords) {
        if (normalizedQuestion.includes(keyword.toLowerCase())) {
          score += 3
        }
      }

      if (score > maxScore) {
        maxScore = score
        bestMatch = qa
      }
    }

    // Minimum threshold
    if (maxScore >= 3) {
      return bestMatch!.answer
    }

    return null
  }

  /**
   * Add custom Q&A (admin only)
   */
  addQAPair(qa: QAPair): void {
    this.qaDatabase.push(qa)
  }

  /**
   * Get all Q&A by category
   */
  getByCategory(category: QAPair['category']): QAPair[] {
    return this.qaDatabase.filter(qa => qa.category === category)
  }

  /**
   * Get all categories
   */
  getCategories(): QAPair['category'][] {
    return ['general', 'pricing', 'delivery', 'payment', 'hours', 'safety', 'promotions']
  }
}

// ========================================
// Export singleton
// ========================================

let knowledgeBaseInstance: LineKnowledgeBase | null = null

export function getLineKnowledgeBase(): LineKnowledgeBase {
  if (!knowledgeBaseInstance) {
    knowledgeBaseInstance = new LineKnowledgeBase()
  }
  return knowledgeBaseInstance
}
