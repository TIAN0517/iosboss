"""
修復知識庫搜索功能
"""

import requests
import json

def enhanced_search_knowledge(query):
    """
    增強的知識庫搜索函數
    """
    try:
        # 1. 嘗試從 API 搜索
        print(f"🔍 搜索知識庫: {query}")
        
        # 使用編碼確保中文正確傳遞
        import urllib.parse
        encoded_query = urllib.parse.quote(query)
        
        api_url = f"http://127.0.0.1:5002/api/knowledge/search?q={encoded_query}"
        print(f"📡 API URL: {api_url}")
        
        response = requests.get(api_url, timeout=5)
        print(f"📊 API 響應狀態: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📋 API 返回數據: {result}")
            
            if result.get('success') and result.get('data'):
                data = result['data']
                
                # 如果是列表格式
                if isinstance(data, list) and len(data) > 0:
                    top_result = data[0]
                    title = top_result.get('title', '')
                    content = top_result.get('content', '')
                    category = top_result.get('category', '')
                    
                    formatted_response = f"【{title}】\n\n{content}\n\n分類：{category}\n\n如需更多資訊，請聯繫客服。"
                    print(f"✅ 格式化回應: {formatted_response}")
                    return formatted_response
                
                # 如果是字符串格式
                elif isinstance(data, str):
                    print(f"✅ 直接字符串回應: {data}")
                    return data
        
        # 2. 如果 API 搜索失敗，嘗試直接搜索知識庫
        print("🔄 API 搜索失敗，嘗試本地知識庫...")
        
        # 導入本地知識庫
        import sys
        sys.path.append('./app')
        try:
            from knowledge import search_knowledge
            
            local_result = search_knowledge(query)
            if local_result:
                print(f"✅ 本地知識庫找到: {local_result[:100]}...")
                return local_result
            else:
                print("❌ 本地知識庫也沒找到")
        except Exception as e:
            print(f"❌ 導入本地知識庫失敗: {e}")
        
        # 3. 如果都沒找到，返回可用指令
        print("❌ 所有搜索都失敗，返回可用指令")
        return None
        
    except Exception as e:
        print(f"❌ 知識庫搜索錯誤: {e}")
        return None

def get_fallback_response(query):
    """
    備用回應
    """
    fallback_responses = {
        "安全": "【瓦斯安全檢查】\n\n1. 外觀檢查\n   ✓ 檢查瓦斯管線是否有裂痕、老化\n   ✓ 檢查接頭是否鬆動\n\n2. 漏氣測試\n   ✓ 使用肥皂水塗抹接頭\n   ✓ 觀察是否有氣泡產生\n\n3. 通風檢查\n   ✓ 確認安裝環境通風良好\n   ✓ 瓦斯熱水器需裝在室外\n\n如需專業服務，請聯繫九九瓦斯行！",
        
        "瓦斯爐": "【瓦斯爐故障排除】\n\n1. 點火問題\n   ✓ 檢查瓦斯總開關是否開啟\n   ✓ 清理點火器周圍雜物\n   ✓ 更換點火器電池\n\n2. 火候問題\n   ✓ 調整風門\n   ✓ 清理火孔\n   ✓ 檢查瓦斯壓力\n\n如需專業維修，請聯繫九九瓦斯行！",
        
        "熱水器": "【熱水器故障排除】\n\n1. 點火問題\n   ✓ 檢查瓦斯開關\n   ✓ 清理點火針\n   ✓ 檢查水源壓力\n\n2. 水溫問題\n   ✓ 調整水溫設定\n   ✓ 清理水箱\n   ✓ 檢查安全閥\n\n如需專業服務，請聯繫九九瓦斯行！"
    }
    
    for key, response in fallback_responses.items():
        if key in query:
            return response
    
    return None

# 測試函數
if __name__ == "__main__":
    test_queries = ["安全", "瓦斯爐", "熱水器", "你好"]
    
    for query in test_queries:
        print(f"\n{'='*50}")
        print(f"測試查詢: {query}")
        result = enhanced_search_knowledge(query)
        print(f"結果: {result}")
