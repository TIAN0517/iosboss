#!/usr/bin/env python3
"""
修復 SQL 檔案，添加 DROP TABLE IF EXISTS
"""

import re

# 讀取檔案
with open('backups/migration/cpf47_to_postgres.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到所有 CREATE TABLE 語句並添加 DROP TABLE
def add_drop_table(match):
    table_name = match.group(1)
    return f'-- 刪除舊表（如果存在）\nDROP TABLE IF EXISTS {table_name} CASCADE;\n\n{match.group(0)}'

# 替換 CREATE TABLE addrarea (...) 為 DROP TABLE + CREATE TABLE
# 匹配 CREATE TABLE 後跟表名
pattern = r'(CREATE TABLE (\w+)\s*\()'

new_content = re.sub(pattern, add_drop_table, content)

# 寫回檔案
with open('backups/migration/cpf47_to_postgres.sql', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('✅ 已修復 SQL 檔案，添加 DROP TABLE IF EXISTS')
print('前 50 行預覽：')
print('-' * 50)
print('\n'.join(new_content.split('\n')[:50]))
