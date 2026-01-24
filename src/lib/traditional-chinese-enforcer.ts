/**
 * 繁體中文強制執行器
 * 確保AI回復強制使用繁體中文
 */

export interface ValidationResult {
  is_traditional_chinese: boolean;
  issues: string[];
  suggestions: string[];
  confidence: number;
}

export interface ComplianceReport {
  compliant: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
  analysis: {
    total_length: number;
    chinese_ratio: number;
    has_emotion_markers: boolean;
    has_taiwan_expressions: boolean;
    has_machine_tone: boolean;
  };
}

export class TraditionalChineseEnforcer {
  private strictMode: boolean = true;
  private enforcementRules = {
    min_chinese_ratio: 0.95,
    max_response_length: 200,
    require_emotion: true,
    forbid_machine_tone: true,
    require_taiwan_expressions: true,
    strict_check: true
  };

  private forbiddenPatterns = [
    // 簡體中文常見字
    '用', '说', '会', '来', '开', '这', '那', '为', '什么', '怎么',
    // 英文常見詞
    /\b(OK|ok|OKAY|okay|YES|yes|NO|no|HELLO|hello|HI|hi|BYE|bye|WAIT|wait)\b/i,
    /\b(THE|the|A|a|AN|an|IS|is|ARE|are|WAS|was|WERE|were|BE|be|HAVE|have|HAS|has|DO|do|DOES|does|DID|did|WILL|will|SHOULD|should|COULD|could|WOULD|would|CAN|can|MAY|may|MIGHT|might)\b/i,
    // 機器化表達
    '很抱歉', '我理解您', '請您', '謝謝您的', '如果需要', '可以幫助您'
  ];

  private taiwanExpressions = ['喔', '啦', '耶', '啥', '真的嗎', '不會吧', '太讚了'];
  private emotionMarkers = ['！', '？', '😀', '😢', '😡', '😊', '😎', '💪', '🥺', '👏'];
  private machineTonePatterns = [
    '很抱歉', '我理解您', '請您', '謝謝您的', '如果需要', '可以幫助您',
    '請問', '感謝您', '幫助', '協助', '處理', '完成'
  ];

  private defaultResponses = [
    "嗨～我是BossJy-99助手！🤖 有什麼可以幫您的嗎？",
    "哈囉！今天想要做什麼呢？💪",
    "嗨～我在這裡喔！有什麼需要幫忙的嗎？😀",
    "哈～我是智能助手！需要什麼服務嗎？👏",
    "嗨～我在這裡啦！說說看需要什麼吧！😊"
  ];

  validateResponse(response: string): ValidationResult {
    const result: ValidationResult = {
      is_traditional_chinese: true,
      issues: [],
      suggestions: [],
      confidence: 1.0
    };

    if (!response || !response.trim()) {
      result.is_traditional_chinese = false;
      result.issues.push('回應為空');
      result.confidence = 0.0;
      return result;
    }

    // 檢查是否包含禁止的語言模式
    for (const pattern of this.forbiddenPatterns) {
      if (pattern instanceof RegExp) {
        if (pattern.test(response)) {
          result.is_traditional_chinese = false;
          result.issues.push(`發現禁止模式: ${pattern}`);
        }
      } else if (typeof pattern === 'string' && response.includes(pattern)) {
        result.is_traditional_chinese = false;
        result.issues.push(`發現禁止模式: ${pattern}`);
      }
    }

    // 檢查中文比例
    const chineseChars = (response.match(/[\u3400-\u4DBF\u4E00-\u9FFF]/g) || []).length;
    const totalChars = response.length;
    if (totalChars > 0) {
      const chineseRatio = chineseChars / totalChars;
      if (chineseRatio < this.enforcementRules.min_chinese_ratio) {
        result.is_traditional_chinese = false;
        result.issues.push(`中文比例過低: ${(chineseRatio * 100).toFixed(2)}%`);
        result.confidence = chineseRatio;
      }
    }

    // 檢查台灣表達
    const hasTaiwanExpr = this.taiwanExpressions.some(expr => response.includes(expr));
    
    if (this.enforcementRules.require_taiwan_expressions && !hasTaiwanExpr) {
      result.suggestions.push('建議加入台灣表達: 喔、啦、耶、啥');
    }

    // 檢查情感表達
    const hasEmotion = this.emotionMarkers.some(marker => response.includes(marker));
    
    if (this.enforcementRules.require_emotion && !hasEmotion) {
      result.suggestions.push('建議加入情感表達: emoji或感嘆號');
    }

    // 檢查機器語調
    if (this.enforcementRules.forbid_machine_tone) {
      for (const pattern of this.machineTonePatterns) {
        if (response.includes(pattern)) {
          result.is_traditional_chinese = false;
          result.issues.push(`發現機器語調: ${pattern}`);
        }
      }
    }

    // 計算最終信心度
    if (!result.is_traditional_chinese) {
      result.confidence = Math.max(0.1, result.confidence - 0.3);
    }

    return result;
  }

  forceTraditionalChinese(response: string): string {
    if (!response) {
      return this.getDefaultResponse();
    }

    const validation = this.validateResponse(response);

    if (validation.is_traditional_chinese) {
      return response;
    }

    // 根據問題類型進行修正
    let fixedResponse = response;

    // 移除英文和簡體中文
    for (const pattern of this.forbiddenPatterns) {
      if (pattern instanceof RegExp) {
        fixedResponse = fixedResponse.replace(pattern, '');
      } else if (typeof pattern === 'string') {
        fixedResponse = fixedResponse.replace(new RegExp(pattern, 'g'), '');
      }
    }

    // 確保有情感表達
    if (!fixedResponse.includes('！') && !fixedResponse.includes('？')) {
      fixedResponse += '！';
    }

    // 添加台灣表達
    for (const expr of this.taiwanExpressions) {
      if (!fixedResponse.includes(expr)) {
        fixedResponse = expr + ' ' + fixedResponse;
        break;
      }
    }

    // 如果修正後仍然不合格，返回預設回應
    const validationAfter = this.validateResponse(fixedResponse);
    if (!validationAfter.is_traditional_chinese) {
      return this.getDefaultResponse();
    }

    return fixedResponse;
  }

  getDefaultResponse(): string {
    return this.defaultResponses[Math.floor(Math.random() * this.defaultResponses.length)];
  }

  getEnforcementPrompt(): string {
    return `你是BossJy-99智能助手，九九瓦斯行的AI。

【嚴格要求】
你必須使用繁體中文回應，絕對不能使用任何簡體中文或英文。

繁體中文特徵：
- 用：不是"用"
- 說：不是"说" 
- 會：不是"会"
- 來：不是"来"
- 開：不是"开"
- 這：不是"这"
- 那：不是"那"
- 為：不是"为"
- 什麼：不是"什么"
- 怎麼：不是"怎么"

說話風格：
- 要像真人對話，不要像機器人
- 用口語化表達，隨意一點
- 可以用語氣詞（啊、吧、呢、喔、嘛、啦）
- 夾雜台灣用語（喔、啦、耶、啥）
- 不要太正式，像聊天室說話
- 簡短回應，不要長篇大論
- emoji隨意用，讓對話生動

絕對禁止：
- 任何簡體中文
- 任何英文
- 任何機器化的表達
- 正式嚴肅的語調

每句話都必須是繁體中文！`;
  }

  isResponseCompliant(response: string): boolean {
    const validation = this.validateResponse(response);
    return validation.is_traditional_chinese && validation.confidence > 0.7;
  }

  getComplianceReport(response: string): ComplianceReport {
    const validation = this.validateResponse(response);
    const chineseChars = (response.match(/[一-龯]/g) || []).length;
    const totalChars = response.length;

    return {
      compliant: this.isResponseCompliant(response),
      confidence: validation.confidence,
      issues: validation.issues,
      suggestions: validation.suggestions,
      analysis: {
        total_length: totalChars,
        chinese_ratio: totalChars > 0 ? chineseChars / totalChars : 0,
        has_emotion_markers: this.emotionMarkers.some(marker => response.includes(marker)),
        has_taiwan_expressions: this.taiwanExpressions.some(expr => response.includes(expr)),
        has_machine_tone: this.machineTonePatterns.some(pattern => response.includes(pattern))
      }
    };
  }
}