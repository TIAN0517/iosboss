-- 九九瓦斯行管理系統 - PostgreSQL 初始化腳本
-- 此腳本在 PostgreSQL 容器首次啟動時自動執行

-- 設置客戶端編碼
ALTER DATABASE gas_management SET timezone TO 'Asia/Taipei';

-- 創建擴展功能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 輸出信息
DO $$
BEGIN
    RAISE NOTICE '九九瓦斯行資料庫初始化完成！';
    RAISE NOTICE '時區設定: Asia/Taipei';
    RAISE NOTICE '擴展功能: uuid-ossp, pg_stat_statements';
END $$;
