import requests
import json

def test_search():
    url = "http://localhost:5002/api/knowledge/search"
    
    test_queries = ["安全", "瓦斯漏氣", "收費標準", "瓦斯爐"]
    
    for query in test_queries:
        print(f"\n測試搜索: {query}")
        print("=" * 50)
        
        params = {"q": query}
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            result = response.json()
            print(f"狀態: {result.get('success')}")
            print(f"來源: {result.get('source')}")
            
            if result.get('success'):
                data = result.get('data')
                if isinstance(data, list):
                    print(f"找到 {len(data)} 筆結果")
                    for i, item in enumerate(data[:3], 1):
                        print(f"\n{i}. {item.get('title')} ({item.get('category')})")
                        print(f"   {item.get('content', '')[:100]}...")
                else:
                    print(f"結果: {data[:200]}...")
            else:
                print(f"錯誤: {result.get('error')}")
        else:
            print(f"HTTP錯誤: {response.status_code}")
            print(response.text)

if __name__ == "__main__":
    test_search()
