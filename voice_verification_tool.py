#!/usr/bin/env python3
"""
语音功能完整验证脚本
验证AI语音对话vs朗读模式的区别
"""

import requests
import json
import time

def test_voice_functionality():
    """测试语音功能的完整验证"""
    
    print("🎤 语音功能完整验证指南")
    print("="*60)
    print()
    
    # 1. 基础连接测试
    print("🔍 [1/5] 基础连接测试")
    try:
        response = requests.get("http://localhost:8889/health", timeout=5)
        if response.status_code == 200:
            print("✅ 语音服务正常连接")
            print(f"   响应: {response.json()}")
        else:
            print(f"❌ 连接失败: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 连接错误: {e}")
        return False
    print()
    
    # 2. 智能对话测试
    print("🧠 [2/5] AI智能对话测试")
    print("   测试不同的对话场景...")
    
    test_cases = [
        {
            "message": "你好",
            "expected_behavior": "AI助理问候",
            "key_indicator": "ai_mode: true"
        },
        {
            "message": "我想了解瓦斯配送服务",
            "expected_behavior": "专业服务介绍",
            "key_indicator": "专业知识库响应"
        },
        {
            "message": "我闻到什么味道",
            "expected_behavior": "安全警告",
            "key_indicator": "安全建议"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"   测试 {i}: {test_case['expected_behavior']}")
        try:
            response = requests.post(
                "http://localhost:8889/api/voice/ai",
                json={"message": test_case["message"]},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ 响应正常")
                print(f"   📝 AI回复: {result.get('text', '')[:50]}...")
                print(f"   🔧 模式: {result.get('ai_mode', 'unknown')}")
                
                # 验证AI模式
                if result.get('ai_mode') == 'true':
                    print(f"   ✅ 确认: 真正的AI对话模式")
                else:
                    print(f"   ⚠️  警告: 可能不是AI模式")
                
                # 验证智能响应
                text = result.get('text', '')
                if any(keyword in text for keyword in ['您好', '欢迎', '服务', '安全']):
                    print(f"   ✅ 智能响应: 检测到AI理解")
                else:
                    print(f"   ⚠️  响应质量: 需要检查")
                    
            else:
                print(f"   ❌ 请求失败: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ 测试错误: {e}")
        print()
    
    # 3. 朗读模式检测
    print("🔍 [3/5] 朗读模式检测")
    print("   检测是否只是朗读而非AI对话...")
    
   朗读_检测_cases = [
        "什么是瓦斯",
        "你的电话号码是多少",
        "你现在在做什么",
        "你好我是新客户"
    ]
    
    朗读_count = 0
    智能_count = 0
    
    for test_message in 朗读_检测_cases:
        try:
            response = requests.post(
                "http://localhost:8889/api/voice/ai",
                json={"message": test_message},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                text = result.get('text', '')
                ai_mode = result.get('ai_mode', 'false')
                
                # 朗读模式特征
                if any(pattern in text.lower() for pattern in [
                    "您输入的是",
                    "正在朗读",
                    "text:",
                    "voice_url:"
                ]):
                    朗读_count += 1
                    print(f"   🚨 检测到朗读模式: {test_message}")
                
                # AI对话特征
                elif ai_mode == 'true' and len(text) > 20:
                    智能_count += 1
                    print(f"   ✅ 检测到AI对话: {test_message}")
                
        except Exception as e:
            print(f"   ❌ 检测错误: {e}")
    
    print(f"   📊 检测结果:")
    print(f"      朗读模式: {朗读_count} 次")
    print(f"      AI对话模式: {智能_count} 次")
    print()
    
    # 4. 上下文理解测试
    print("🧠 [4/5] 上下文理解测试")
    print("   测试AI是否能理解对话上下文...")
    
    上下文_tests = [
        ("我想订瓦斯", "你应该提供配送服务信息"),
        ("我家里有味道", "你应该提供安全警告"),
        ("我想投诉", "你应该提供客服联系信息")
    ]
    
    for user_input, expected_context in 上下文_tests:
        try:
            response = requests.post(
                "http://localhost:8889/api/voice/ai",
                json={"message": user_input},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_reply = result.get('text', '')
                
                # 检查是否理解上下文
                if any(keyword in ai_reply for keyword in expected_context.split()):
                    print(f"   ✅ 上下文理解: '{user_input}' -> 正确响应")
                else:
                    print(f"   ⚠️  上下文理解: '{user_input}' -> 可能需要改进")
                    
        except Exception as e:
            print(f"   ❌ 上下文测试错误: {e}")
    
    print()
    
    # 5. 综合评估
    print("📊 [5/5] 综合评估")
    
    if 朗读_count > 智能_count:
        print("🚨 警告: 检测到大量朗读模式行为")
        print("   建议检查API端点配置")
        print("   确保使用 /api/voice/ai 而非 /api/voice/simple")
        return False
    elif 智能_count > 朗读_count:
        print("✅ 确认: 语音功能正常为AI对话模式")
        print("   AI能够理解用户意图并给出专业回复")
        return True
    else:
        print("⚠️  中性: 需要进一步调试")
        return False

def manual_verification_guide():
    """手动验证指南"""
    
    print("\n" + "="*60)
    print("🧪 手动验证指南")
    print("="*60)
    
    print("\n📱 浏览器测试:")
    print("1. 打开: http://localhost:8889/voice")
    print("2. 点击麦克风按钮")
    print("3. 说: '我想了解瓦斯价格'")
    print("4. 听回复内容")
    
    print("\n🔍 AI对话 vs 朗读识别:")
    print("\n✅ AI对话特征:")
    print("   - 回复内容专业且相关")
    print("   - 包含具体服务信息")
    print("   - 响应时间约0.8秒")
    print("   - 有'AI分析中'字样")
    
    print("\n🚨 朗读模式特征:")
    print("   - 回复内容通用")
    print("   - 像是预先录制的")
    print("   - 响应时间很快")
    print("   - 没有智能理解")
    
    print("\n🧪 测试场景:")
    print("1. '我想订瓦斯' -> 应该询问具体需求")
    print("2. '家里有异味' -> 应该警告安全问题")
    print("3. '客服电话' -> 应该提供具体号码")
    print("4. '我是新客户' -> 应该欢迎并介绍服务")
    
    print("\n🔧 如果仍然是朗读模式:")
    print("1. 检查API端点: 应该是 /api/voice/ai")
    print("2. 确认AI模式: 响应中应该有 'ai_mode: true'")
    print("3. 重新启动语音服务")

def test_api_endpoints():
    """测试不同API端点"""
    
    print("\n🔍 API端点对比测试")
    print("="*40)
    
    endpoints = [
        ("/api/voice/simple", "朗读模式"),
        ("/api/voice/ai", "AI对话模式")
    ]
    
    for endpoint, description in endpoints:
        print(f"\n测试 {description}: {endpoint}")
        try:
            response = requests.post(
                f"http://localhost:8889{endpoint}",
                json={"message": "你好"},
                timeout=5
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ 响应正常")
                print(f"   📝 回复: {result.get('text', '')[:30]}...")
                print(f"   🔧 模式标识: {result.get('ai_mode', 'none')}")
            else:
                print(f"   ❌ 端点无响应: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ 连接错误: {e}")

if __name__ == "__main__":
    print("🎤 语音功能验证工具")
    print("验证AI语音对话 vs 朗读模式")
    print()
    
    # 运行自动验证
    success = test_voice_functionality()
    
    # 提供手动验证指南
    manual_verification_guide()
    
    # 测试API端点
    test_api_endpoints()
    
    print("\n" + "="*60)
    if success:
        print("🎉 验证结果: 语音功能正常工作")
    else:
        print("⚠️  验证结果: 需要检查语音配置")
    print("="*60)
    
    input("\n按任意键退出...")
