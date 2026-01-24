"""
繁體中文強制執行系統
確保AI回復強制使用繁體中文
"""

import json
import logging
import os
import re
from typing import Dict, List, Optional, Any
from datetime import datetime

# 設置繁體中文日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TraditionalChineseEnforcer:
    """繁體中文強制執行器"""
    
    def __init__(self):
        self.strict_mode = True
        self.language_prompt = self._get_language_prompt()
        self.forbidden_patterns = self._get_forbidden_patterns()
        self.enforcement_rules = self._get_enforcement_rules()
    
    def _get_language_prompt(self) -> str:
        """獲取繁體中文強制提示"""
        return """你是BossJy-99智能助手，九九瓦斯行的AI。

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
- 什麼：不是"什么"

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

每句話都必須是繁體中文！"""
    
    def _get_forbidden_patterns(self) -> List[str]:
        """獲取禁止的語言模式"""
        return [
            # 簡體中文常見字
            r'用', r'说', r'会', r'来', r'开', r'这', r'那', r'为', r'什么', r'怎么',
            r'说', r'说', r'说', r'说', r'说', r'说', r'说', r'说', r'说', r'说',
            # 英文常見詞
            r'\b(OK|ok|OKAY|okay|YES|yes|NO|no|HELLO|hello|HI|hi|BYE|bye|WAIT|wait)\b',
            r'\b(THE|the|A|a|AN|an|IS|is|ARE|are|WAS|was|WERE|were|BE|be|HAVE|have|HAS|has|DO|do|DOES|does|DID|did|WILL|will|SHOULD|should|COULD|could|WOULD|would|CAN|can|MAY|may|MIGHT|might)\b',
            # 機器化表達
            r'很抱歉', r'我理解您', r'請您', r'謝謝您的', r'如果需要', r'可以幫助您'
        ]
    
    def _get_enforcement_rules(self) -> Dict[str, Any]:
        """獲取強制執行規則"""
        return {
            'min_chinese_ratio': 0.95,  # 最小中文比例
            'max_response_length': 200,  # 最大回應長度
            'require_emotion': True,  # 需要情感表達
            'forbid_machine_tone': True,  # 禁止機器語調
            'require_taiwan_expressions': True,  # 需要台灣表達
            'strict_check': True  # 嚴格檢查
        }
    
    def validate_response(self, response: str) -> Dict[str, Any]:
        """驗證回應是否為繁體中文"""
        result = {
            'is_traditional_chinese': True,
            'issues': [],
            'suggestions': [],
            'confidence': 1.0
        }
        
        if not response or not response.strip():
            result['is_traditional_chinese'] = False
            result['issues'].append('回應為空')
            result['confidence'] = 0.0
            return result
        
        # 檢查是否包含禁止的語言模式
        for pattern in self.forbidden_patterns:
            if re.search(pattern, response):
                result['is_traditional_chinese'] = False
                result['issues'].append(f'發現禁止模式: {pattern}')
        
        # 檢查中文比例
        chinese_chars = len(re.findall(r'[一-龯]', response))
        total_chars = len(response)
        if total_chars > 0:
            chinese_ratio = chinese_chars / total_chars
            if chinese_ratio < self.enforcement_rules['min_chinese_ratio']:
                result['is_traditional_chinese'] = False
                result['issues'].append(f'中文比例過低: {chinese_ratio:.2%}')
                result['confidence'] = chinese_ratio
        
        # 檢查台灣表達
        taiwan_expressions = ['喔', '啦', '耶', '啥', '真的嗎', '不會吧', '太讚了']
        has_taiwan_expr = any(expr in response for expr in taiwan_expressions)
        
        if self.enforcement_rules['require_taiwan_expressions'] and not has_taiwan_expr:
            result['suggestions'].append('建議加入台灣表達: 喔、啦、耶、啥')
        
        # 檢查情感表達
        emotion_markers = ['！', '？', '😀', '😢', '😡', '😊', '😎', '💪', '🥺', '👏']
        has_emotion = any(marker in response for marker in emotion_markers)
        
        if self.enforcement_rules['require_emotion'] and not has_emotion:
            result['suggestions'].append('建議加入情感表達: emoji或感嘆號')
        
        # 檢查機器語調
        machine_tone_patterns = [
            r'很抱歉', r'我理解您', r'請您', r'謝謝您的', r'如果需要', r'可以幫助您',
            r'請問', r'感謝您', r'幫助', r'協助', r'處理', r'完成'
        ]
        
        if self.enforcement_rules['forbid_machine_tone']:
            for pattern in machine_tone_patterns:
                if re.search(pattern, response):
                    result['is_traditional_chinese'] = False
                    result['issues'].append(f'發現機器語調: {pattern}')
        
        # 計算最終信心度
        if not result['is_traditional_chinese']:
            result['confidence'] = max(0.1, result['confidence'] - 0.3)
        
        return result
    
    def force_traditional_chinese(self, response: str) -> str:
        """強制轉換為繁體中文"""
        if not response:
            return "嗨～我是BossJy-99助手！有什麼可以幫您的嗎？🤖"
        
        validation = self.validate_response(response)
        
        if validation['is_traditional_chinese']:
            return response
        
        # 根據問題類型進行修正
        fixed_response = response
        
        # 移除英文和簡體中文
        for pattern in self.forbidden_patterns:
            fixed_response = re.sub(pattern, '', fixed_response)
        
        # 確保有情感表達
        if '！' not in fixed_response and '？' not in fixed_response:
            fixed_response += '！'
        
        # 添加台灣表達
        taiwan_exprs = ['喔', '啦', '耶']
        for expr in taiwan_exprs:
            if expr not in fixed_response:
                fixed_response = expr + ' ' + fixed_response
                break
        
        # 如果修正後仍然不合格，返回預設回應
        validation_after = self.validate_response(fixed_response)
        if not validation_after['is_traditional_chinese']:
            return self._get_default_response()
        
        return fixed_response
    
    def _get_default_response(self) -> str:
        """獲取預設繁體中文回應"""
        responses = [
            "嗨～我是BossJy-99助手！🤖 有什麼可以幫您的嗎？",
            "哈囉！今天想要做什麼呢？💪",
            "嗨～我在這裡喔！有什麼需要幫忙的嗎？😀",
            "哈～我是智能助手！需要什麼服務嗎？👏",
            "嗨～我在這裡啦！說說看需要什麼吧！😊"
        ]
        
        import random
        return random.choice(responses)
    
    def get_enforcement_prompt(self) -> str:
        """獲取強制執行提示"""
        return self.language_prompt
    
    def is_response_compliant(self, response: str) -> bool:
        """檢查回應是否合規"""
        validation = self.validate_response(response)
        return validation['is_traditional_chinese'] and validation['confidence'] > 0.7
    
    def get_compliance_report(self, response: str) -> Dict[str, Any]:
        """獲取合規報告"""
        validation = self.validate_response(response)
        
        report = {
            'compliant': self.is_response_compliant(response),
            'confidence': validation['confidence'],
            'issues': validation['issues'],
            'suggestions': validation['suggestions'],
            'analysis': {
                'total_length': len(response),
                'chinese_ratio': len(re.findall(r'[一-龯]', response)) / max(len(response), 1),
                'has_emotion_markers': any(marker in response for marker in ['！', '？', '😀', '😊', '💪']),
                'has_taiwan_expressions': any(expr in response for expr in ['喔', '啦', '耶', '啥']),
                'has_machine_tone': any(pattern in response for pattern in ['很抱歉', '我理解您', '請您'])
            }
        }
        
        return report

def create_traditional_chinese_config():
    """創建繁體中文配置文件"""
    enforcer = TraditionalChineseEnforcer()
    
    config = {
        'enforcement': {
            'enabled': True,
            'strict_mode': True,
            'min_chinese_ratio': 0.95,
            'require_emotion': True,
            'forbid_machine_tone': True,
            'require_taiwan_expressions': True
        },
        'prompt': enforcer.get_enforcement_prompt(),
        'validation': {
            'auto_correct': True,
            'fallback_response': enforcer._get_default_response(),
            'confidence_threshold': 0.7
        },
        'monitoring': {
            'log_violations': True,
            'track_compliance_rate': True,
            'alert_threshold': 0.8
        }
    }
    
    # 保存配置
    with open('traditional_chinese_config.json', 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    
    logger.info("✅ 繁體中文配置文件已創建: traditional_chinese_config.json")
    
    return config

if __name__ == "__main__":
    # 創建配置
    config = create_traditional_chinese_config()
    
    # 測試強制執行
    enforcer = TraditionalChineseEnforcer()
    
    test_responses = [
        "你好，這是一個測試。",
        "Hi there! How can I help you?",
        "嗨～我是BossJy-99助手！有什麼可以幫您的嗎？🤖",
        "很抱歉，我理解您的需求。",
        "哈囉！今天想要做什麼呢？💪"
    ]
    
    print("=== 繁體中文強制執行測試 ===\n")
    
    for response in test_responses:
        print(f"原始回應: {response}")
        
        # 驗證
        validation = enforcer.validate_response(response)
        print(f"驗證結果: {'✅ 合規' if validation['is_traditional_chinese'] else '❌ 不合規'}")
        
        if validation['issues']:
            print(f"問題: {validation['issues']}")
        
        # 強制修正
        fixed = enforcer.force_traditional_chinese(response)
        print(f"修正後: {fixed}")
        
        # 合規報告
        report = enforcer.get_compliance_report(fixed)
        print(f"合規性: {report['compliant']} (信心度: {report['confidence']:.2f})")
        
        print("-" * 50)