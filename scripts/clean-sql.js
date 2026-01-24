#!/usr/bin/env node

/**
 * 清理 pg_dump 导出的 SQL 文件
 * 移除所有调试信息，保留实际 SQL 语句
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../backups/migration/gas-management-fixed.sql');
const outputFile = path.join(__dirname, '../backups/migration/gas-management-clean.sql');

console.log('📖 读取 SQL 文件...');
const content = fs.readFileSync(inputFile, 'utf8');

console.log('🧹 清理 pg_dump 调试信息...');
const lines = content.split('\n');
const cleanLines = [];
let skipMode = false;

for (const line of lines) {
    const trimmed = line.trim();

    // 跳过所有 pg_dump 开头的行
    if (line.match(/^pg_dump:/)) continue;
    if (line.match(/^﻿pg_dump:/)) continue; // BOM variant

    // 跳过 \restrict 命令
    if (trimmed.startsWith('\\restrict')) continue;

    // 保留注释和 SQL 语句
    cleanLines.push(line);
}

const cleanContent = cleanLines.join('\n');

console.log('💾 保存清理后的文件...');
fs.writeFileSync(outputFile, cleanContent, 'utf8');

const originalSize = (content.length / 1024).toFixed(2);
const cleanSize = (cleanContent.length / 1024).toFixed(2);
const linesRemoved = lines.length - cleanLines.length;

console.log('');
console.log('✅ 清理完成！');
console.log(`📊 原始大小: ${originalSize} KB`);
console.log(`📊 清理后: ${cleanSize} KB`);
console.log(`🗑️  移除行数: ${linesRemoved}`);
console.log(`📄 输出文件: ${outputFile}`);
