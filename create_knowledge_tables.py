import psycopg2
import uuid

def get_database_connection():
    return psycopg2.connect(
        host="localhost",
        port="5432",
        database="postgres",
        user="postgres",
        password="Ss520520"
    )

def create_knowledge_tables():
    conn = get_database_connection()
    cursor = conn.cursor()
    
    try:
        print("=" * 60)
        print("創建知識庫資料表")
        print("=" * 60)
        
        # 知識庫主表
        print("\n[1/4] 創建 knowledge_base 表...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS "knowledge_base" (
                "id" TEXT PRIMARY KEY,
                "title" TEXT NOT NULL,
                "category" TEXT NOT NULL,
                "content" TEXT NOT NULL,
                "keywords" TEXT[],
                "priority" INTEGER DEFAULT 0,
                "isActive" BOOLEAN DEFAULT true,
                "viewCount" INTEGER DEFAULT 0,
                "usageCount" INTEGER DEFAULT 0,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS "idx_knowledge_base_category" 
            ON "knowledge_base"("category");
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS "idx_knowledge_base_isActive" 
            ON "knowledge_base"("isActive");
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS "idx_knowledge_base_priority" 
            ON "knowledge_base"("priority");
        ''')
        print("✓ knowledge_base 表創建成功")
        
        # 關鍵字表
        print("\n[2/4] 創建 knowledge_keywords 表...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS "knowledge_keywords" (
                "id" TEXT PRIMARY KEY,
                "knowledgeBaseId" TEXT NOT NULL,
                "keyword" TEXT NOT NULL,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "fk_knowledge_keywords_base" 
                    FOREIGN KEY ("knowledgeBaseId") 
                    REFERENCES "knowledge_base"("id") 
                    ON DELETE CASCADE
            );
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS "idx_knowledge_keywords_keyword" 
            ON "knowledge_keywords"("keyword");
        ''')
        print("✓ knowledge_keywords 表創建成功")
        
        # 使用記錄表
        print("\n[3/4] 創建 knowledge_usage_logs 表...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS "knowledge_usage_logs" (
                "id" TEXT PRIMARY KEY,
                "knowledgeBaseId" TEXT NOT NULL,
                "userId" TEXT,
                "query" TEXT,
                "matchScore" FLOAT,
                "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "fk_knowledge_usage_logs_base" 
                    FOREIGN KEY ("knowledgeBaseId") 
                    REFERENCES "knowledge_base"("id") 
                    ON DELETE CASCADE
            );
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS "idx_knowledge_usage_logs_base" 
            ON "knowledge_usage_logs"("knowledgeBaseId");
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS "idx_knowledge_usage_logs_timestamp" 
            ON "knowledge_usage_logs"("timestamp");
        ''')
        print("✓ knowledge_usage_logs 表創建成功")
        
        # 向量嵌入表（先不包含vector類型，之後安裝pgvector再升級）
        print("\n[4/4] 創建 knowledge_embeddings 表...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS "knowledge_embeddings" (
                "id" TEXT PRIMARY KEY,
                "knowledgeBaseId" TEXT NOT NULL,
                "chunkIndex" INTEGER NOT NULL,
                "chunkContent" TEXT NOT NULL,
                "embedding" TEXT,
                "metadata" JSONB,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "fk_knowledge_embeddings_base" 
                    FOREIGN KEY ("knowledgeBaseId") 
                    REFERENCES "knowledge_base"("id") 
                    ON DELETE CASCADE
            );
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS "idx_knowledge_embeddings_base" 
            ON "knowledge_embeddings"("knowledgeBaseId");
        ''')
        print("✓ knowledge_embeddings 表創建成功（暫時使用TEXT存儲embedding，安裝pgvector後升級）")
        
        conn.commit()
        
        print("\n" + "=" * 60)
        print("✓ 所有知識庫表創建完成！")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ 創建表時發生錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_knowledge_tables()
