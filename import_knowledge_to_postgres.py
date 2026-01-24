import psycopg2
import uuid
from datetime import datetime
import sys
sys.path.append('line_bot_ai/app')

from knowledge import KNOWLEDGE_BASE

def get_database_connection():
    return psycopg2.connect(
        host="localhost",
        port="5432",
        database="postgres",
        user="postgres",
        password="Ss520520"
    )

def import_knowledge_to_postgres():
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        print("=" * 60)
        print("匯入知識庫資料到PostgreSQL")
        print("=" * 60)
        
        imported_count = 0
        skipped_count = 0
        
        for topic, data in KNOWLEDGE_BASE.items():
            try:
                knowledge_id = str(uuid.uuid4())
                
                title = topic
                content = data['content'].strip()
                keywords = data.get('keywords', [])
                priority = 0
                category = classify_category(topic)
                
                # 檢查是否已存在
                cursor.execute('''
                    SELECT id FROM "knowledge_base" 
                    WHERE title = %s;
                ''', (title,))
                existing = cursor.fetchone()
                
                if existing:
                    print(f"⏭ 跳過已存在: {title}")
                    skipped_count += 1
                    continue
                
                # 插入知識庫
                cursor.execute('''
                    INSERT INTO "knowledge_base" 
                    (id, title, category, content, keywords, priority, "isActive", "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                ''', (
                    knowledge_id,
                    title,
                    category,
                    content,
                    keywords,
                    priority,
                    True,
                    datetime.now(),
                    datetime.now()
                ))
                
                # 插入關鍵字
                for keyword in keywords:
                    keyword_id = str(uuid.uuid4())
                    cursor.execute('''
                        INSERT INTO "knowledge_keywords" 
                        (id, "knowledgeBaseId", keyword, "createdAt")
                        VALUES (%s, %s, %s, %s);
                    ''', (
                        keyword_id,
                        knowledge_id,
                        keyword,
                        datetime.now()
                    ))
                
                imported_count += 1
                print(f"✓ 匯入 [{imported_count}] {title} ({category})")
                
            except Exception as e:
                print(f"❌ 匯入 {topic} 時發生錯誤: {e}")
                conn.rollback()
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print(f"✓ 知識庫匯入完成！")
        print(f"  新增: {imported_count} 筆")
        print(f"  跳過: {skipped_count} 筆")
        print(f"  總計: {imported_count + skipped_count} 筆")
        print("=" * 60)
        
        return imported_count
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ 匯入過程中發生錯誤: {e}")
        import traceback
        traceback.print_exc()
        return 0
    finally:
        cursor.close()
        conn.close()

def classify_category(topic):
    """根據主題分類"""
    topic_lower = topic.lower()
    
    if any(kw in topic_lower for kw in ['安全', '緊急', '意外', '漏氣']):
        return '安全'
    elif any(kw in topic_lower for kw in ['瓦斯爐', '爐具', '點火']):
        return '瓦斯爐'
    elif any(kw in topic_lower for kw in ['熱水器']):
        return '熱水器'
    elif any(kw in topic_lower for kw in ['排油煙機', '油煙機']):
        return '排油煙機'
    elif any(kw in topic_lower for kw in ['瓦斯桶', '瓦斯罐', 'LPG']):
        return '瓦斯桶'
    elif any(kw in topic_lower for kw in ['調整器', '減壓器']):
        return '調整器'
    elif any(kw in topic_lower for kw in ['收費', '價格', '費用']):
        return '收費標準'
    elif any(kw in topic_lower for kw in ['客戶服務', '服務', '客服']):
        return '客戶服務'
    elif any(kw in topic_lower for kw in ['保養', '維護', '檢修']):
        return '定期保養'
    elif any(kw in topic_lower for kw in ['法規', '規定', '標準']):
        return '法規'
    elif any(kw in topic_lower for kw in ['品牌', '型號', '廠牌']):
        return '產品資訊'
    elif any(kw in topic_lower for kw in ['工具', '設備', '儀器']):
        return '專業工具'
    elif any(kw in topic_lower for kw in ['故障', '診斷', '排除']):
        return '故障排除'
    elif any(kw in topic_lower for kw in ['零件', '更換', '維修']):
        return '零件更換'
    else:
        return '其他'

if __name__ == "__main__":
    count = import_knowledge_to_postgres()
    if count > 0:
        print(f"\n✓ 成功匯入 {count} 筆知識庫資料到PostgreSQL")
