/**
 * SQL Server to PostgreSQL 轉換工具
 * 讀取 SQL Server 資料，轉成 PostgreSQL INSERT 語句
 */

const sql = require('mssql')
const fs = require('fs')
const path = require('path')
const iconv = require('iconv-lite')

// SQL Server 配置
// 修改這裡來匯出不同站點
const SQL_CONFIG = {
  server: 'BOSSJY\\BOSSJY',
  database: 'cpf47_meilun',          // 美崙站: cpf47_meilun, 吉安站: cpf47_ji_an
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'ji394su3'
    }
  }
}

// 手動指定站點（如果數據庫名稱無法判斷）
const MANUAL_STATION = {
  enabled: true,    // 設為 true 來手動指定
  suffix: '_meilun',   // '_ji_an' = 吉安, '_meilun' = 美崙
  stationId: 1,      // 1 = 美崙, 2 = 吉安
  stationName: '美崙'
}

// 輸出檔案名稱（自動根據資料庫名稱）
function getStationInfo() {
  // 如果手動指定站點，優先使用
  if (MANUAL_STATION && MANUAL_STATION.enabled) {
    return {
      suffix: MANUAL_STATION.suffix,
      stationId: MANUAL_STATION.stationId,
      stationName: MANUAL_STATION.stationName
    }
  }

  const dbName = SQL_CONFIG.database.toLowerCase()
  if (dbName.includes('ji-an') || dbName.includes('jian')) {
    return { suffix: '_ji_an', stationId: 2, stationName: '吉安' }
  } else if (dbName.includes('meilun') || dbName.includes('mei')) {
    return { suffix: '_meilun', stationId: 1, stationName: '美崙' }
  }
  return { suffix: '', stationId: 1, stationName: '預設' }
}

function getOutputFileName() {
  const info = getStationInfo()
  return `cpf47${info.suffix}_to_postgres.sql`
}

// 資料表對應（SQL Server → PostgreSQL）
const TABLE_MAP = {
  // 核心業務表
  'Cust': 'customers',
  'Cust2': 'customers_ext',
  'Goods': 'products',
  'GasPrice': 'gas_prices',
  'Inventory': 'inventory',
  'Invoice1': 'invoices',
  'Invoice2': 'invoice_items',
  'FillIn': 'fill_in',
  'FillOut': 'fill_out',
  'CheckIn': 'attendance',
  'Emp': 'employees',
  'Truck': 'trucks',
  'Truck2': 'trucks_ext',
  'Stock': 'stock',

  // 輔助表
  'AddArea': 'areas',
  'AddCity': 'cities',
  'AddRoad': 'roads',
  'AddZip5': 'zip_codes',
  'Corp': 'companies',
  'Supp': 'suppliers',
  'SysSet': 'system_settings',
  'PhoneNum': 'phone_numbers',
  'Report': 'reports',
  'Mend': 'repairs',
  'Revise': 'revisions',
  'Lock': 'locks',
  'Exp': 'expenses',

  // ID 表
  'CustDueID': 'customer_due_ids',
  'FillInID': 'fill_in_ids',
  'FillOutID': 'fill_out_ids',
  'GasPriceID': 'gas_price_ids',
  'DiscardID': 'discard_ids',
  'IOID': 'io_ids',
  'TruckIOID': 'truck_io_ids',

  // 歷史表
  'IO1Old': 'io1_history',
  'IO2Old': 'io2_history',

  // 其他
  'Discard': 'discards',
  'Inbound': 'inbound',
  'InvNo': 'invoice_numbers',
  'IO1': 'io1',
  'IO2': 'io2',
  'TruckIO1': 'truck_io1',
  'TruckIO2': 'truck_io2'
}

// 排除的系統表
const EXCLUDE_TABLES = [
  'dbo.sysdiagrams',
  'dbo.spt_fallback_db',
  'dbo.spt_fallback_dev',
  'dbo.spt_fallback_usg',
  'dbo.spt_monitor'
]

// 資料類型對應
const TYPE_MAP = {
  'int': 'INTEGER',
  'bigint': 'BIGINT',
  'smallint': 'SMALLINT',
  'tinyint': 'SMALLINT',
  'float': 'REAL',
  'real': 'REAL',
  'decimal': 'DECIMAL',
  'numeric': 'NUMERIC',
  'money': 'MONEY',
  'smallmoney': 'MONEY',
  'varchar': 'VARCHAR',
  'nvarchar': 'VARCHAR',
  'char': 'CHAR',
  'nchar': 'CHAR',
  'text': 'TEXT',
  'ntext': 'TEXT',
  'datetime': 'TIMESTAMP',
  'smalldatetime': 'TIMESTAMP',
  'date': 'DATE',
  'time': 'TIME',
  'bit': 'BOOLEAN',
  'binary': 'BYTEA',
  'varbinary': 'BYTEA',
  'image': 'BYTEA',
  'uniqueidentifier': 'UUID',
  'xml': 'XML'
}

/**
 * 判斷站點 (美崙=1, 吉安=2)
 */
function getStationId(address, tableName) {
  if (!address) return 1 // 預設美崙

  const addr = String(address).toLowerCase()

  // 吉安關鍵字
  const jiAnKeywords = ['吉安', '海岸', '秝歸', '北昌', '南昌', '太昌', '仁里', '仁和', '永興', '永安']
  const meiLunKeywords = ['美崙', '市區', '中華', '中正', '中山', '新生', '民權', '民族', '民生', '公園']

  // 檢查吉安
  for (const kw of jiAnKeywords) {
    if (addr.includes(kw.toLowerCase())) return 2
  }

  // 檢查美崙/市區
  for (const kw of meiLunKeywords) {
    if (addr.includes(kw.toLowerCase())) return 1
  }

  return 1 // 預設美崙
}

/**
 * 連接 SQL Server
 */
async function connectSQLServer() {
  try {
    await sql.connect(SQL_CONFIG)
    console.log('✅ 已連線到 SQL Server')
    return sql
  } catch (err) {
    console.error('❌ SQL Server 連線失敗:', err.message)
    throw err
  }
}

/**
 * 獲取所有資料表
 */
async function getTables() {
  const result = await sql.query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    AND TABLE_NAME NOT LIKE 'spt_%'
    ORDER BY TABLE_NAME
  `)
  return result.recordset
}

/**
 * 獲取資料表結構
 */
async function getTableSchema(tableName) {
  const result = await sql.query(`
    SELECT
      COLUMN_NAME,
      DATA_TYPE,
      CHARACTER_MAXIMUM_LENGTH,
      NUMERIC_PRECISION,
      NUMERIC_SCALE,
      IS_NULLABLE,
      COLUMN_DEFAULT,
      ORDINAL_POSITION
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${tableName}'
    ORDER BY ORDINAL_POSITION
  `)
  return result.recordset
}

/**
 * 獲取資料表所有資料
 */
async function getTableData(tableName) {
  const result = await sql.query(`SELECT * FROM ${tableName}`)
  return result.recordset
}

/**
 * 轉換值（處理特殊字元）
 */
function convertValue(value, dataType) {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  // 數字類型
  if (['int', 'bigint', 'smallint', 'tinyint', 'float', 'real', 'decimal', 'numeric', 'money', 'smallmoney'].includes(dataType)) {
    return value
  }

  // 布林值
  if (dataType === 'bit') {
    return value ? 'TRUE' : 'FALSE'
  }

  // 日期時間
  if (['datetime', 'smalldatetime'].includes(dataType)) {
    if (value instanceof Date) {
      return `'${value.toISOString()}'`
    }
    return `'${value}'`
  }

  // 字串（處理單引號和編碼轉換）
  let str = String(value)
    .replace(/'/g, "''")
    .replace(/\x00/g, '')
    .trim()

  // 嘗試將 BIG5 轉換為 UTF-8
  try {
    // 檢查是否包含需要轉換的中文字元
    if (/[\u4e00-\u9fff]/.test(str)) {
      // 已經是 Unicode，確保正確
      str = str.normalize('NFC')
    }
  } catch (e) {
    // 如果出錯，保持原樣
  }

  return `'${str}'`
}

/**
 * 生成 PostgreSQL INSERT 語句（自動添加站點標識）
 * @param {string} pgTableName - 已經轉換好的 PostgreSQL 表名（帶後綴）
 */
function generateInsertSQL(pgTableName, rows, schema) {
  if (rows.length === 0) {
    return ''
  }

  const columns = schema.map(col => {
    return col.COLUMN_NAME.toLowerCase().replace(/([A-Z])/g, '_$1')
  })

  // 添加 station_id 欄位（如果有資料）
  const hasData = rows.length > 0
  const insertColumns = hasData ? [...columns, 'station_id'] : columns

  const info = getStationInfo()

  const insertRows = rows.map(row => {
    const values = schema.map(col => {
      const colName = col.COLUMN_NAME
      const value = row[colName]
      return convertValue(value, col.DATA_TYPE.toLowerCase())
    })
    // 添加 station_id
    if (hasData) {
      values.push(info.stationId.toString())
    }
    return `(${values.join(', ')})`
  })

  return `INSERT INTO ${pgTableName} (${insertColumns.join(', ')}) VALUES\n${insertRows.join(',\n')};\n`
}

/**
 * 生成 CREATE TABLE 語句（添加 station_id 欄位）
 * @param {string} pgTableName - 已經轉換好的 PostgreSQL 表名（帶後綴）
 */
function generateCreateTableSQL(pgTableName, schema) {
  const columns = schema.map(col => {
    const pgColName = col.COLUMN_NAME.toLowerCase().replace(/([A-Z])/g, '_$1')
    let pgType = TYPE_MAP[col.DATA_TYPE.toLowerCase()] || 'TEXT'

    if (col.CHARACTER_MAXIMUM_LENGTH && ['VARCHAR', 'CHAR', 'NVARCHAR', 'NCHAR'].includes(col.DATA_TYPE.toUpperCase())) {
      if (col.CHARACTER_MAXIMUM_LENGTH === -1) {
        pgType = 'TEXT'
      } else {
        pgType = `${pgType}(${col.CHARACTER_MAXIMUM_LENGTH})`
      }
    }

    if (['DECIMAL', 'NUMERIC'].includes(col.DATA_TYPE.toUpperCase()) && col.NUMERIC_PRECISION) {
      pgType = `${col.DATA_TYPE.toUpperCase()}(${col.NUMERIC_PRECISION}, ${col.NUMERIC_SCALE || 0})`
    }

    const notNull = col.IS_NULLABLE === 'NO' ? ' NOT NULL' : ''
    const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : ''

    return `  ${pgColName} ${pgType}${notNull}${defaultVal}`
  })

  // 添加 station_id 欄位
  columns.push('  station_id INTEGER DEFAULT 1')

  return `CREATE TABLE ${pgTableName} (\n${columns.join(',\n')}\n);\n`
}

/**
 * 匯出單一資料表
 */
async function exportTable(tableName) {
  console.log(`📦 處理資料表: ${tableName}`)

  try {
    const schema = await getTableSchema(tableName)
    const rows = await getTableData(tableName)

    const info = getStationInfo()
    const pgTableName = TABLE_MAP[tableName]
      ? TABLE_MAP[tableName] + info.suffix
      : tableName.toLowerCase().replace(/([A-Z])/g, '_$1') + info.suffix

    // 生成 SQL（傳入已經轉換好的表名）
    const createSQL = generateCreateTableSQL(pgTableName, schema)
    const insertSQL = generateInsertSQL(pgTableName, rows, schema)

    return {
      tableName,
      pgTableName,
      rowCount: rows.length,
      createSQL,
      insertSQL
    }
  } catch (err) {
    console.error(`  ❌ 錯誤: ${err.message}`)
    return null
  }
}

/**
 * 匯出所有資料表
 */
async function exportAllTables(outputDir) {
  const tables = await getTables()
  console.log(`\n📊 找到 ${tables.length} 個資料表\n`)

  const results = []
  const errors = []

  for (const table of tables) {
    const tableName = table.TABLE_NAME

    // 跳過系統表
    if (EXCLUDE_TABLES.some(t => tableName.toLowerCase().includes(t.toLowerCase()))) {
      continue
    }

    const result = await exportTable(tableName)
    if (result) {
      results.push(result)
    } else {
      errors.push(tableName)
    }
  }

  // 寫入檔案
  const info = getStationInfo()
  const allSQL = [
    '-- ========================================',
    '-- SQL Server → PostgreSQL 轉換資料',
    `-- 來源資料庫: ${SQL_CONFIG.database}`,
    `-- 站點: ${info.stationName} (station_id: ${info.stationId})`,
    `-- 匯出時間: ${new Date().toISOString()}`,
    '-- ========================================',
    '',
    ...results.map(r => r.createSQL + '\n' + r.insertSQL)
  ].join('\n')

  const outputPath = path.join(outputDir, getOutputFileName())
  // 寫入 UTF-8 BOM + UTF-8 內容
  fs.writeFileSync(outputPath, '\uFEFF' + allSQL, 'utf-8')

  // 統計
  console.log('\n========================================')
  console.log('📈 匯出統計')
  console.log('========================================')
  console.log(`✅ 成功: ${results.length} 個資料表`)
  console.log(`❌ 失敗: ${errors.length} 個資料表`)
  console.log(`📁 輸出檔案: ${outputPath}`)
  console.log(`📊 總資料列數: ${results.reduce((sum, r) => sum + r.rowCount, 0)}`)

  // 清單
  console.log('\n📋 資料表清單:')
  results.forEach(r => {
    console.log(`   ${r.tableName.padEnd(20)} → ${r.pgTableName.padEnd(20)} (${r.rowCount} rows)`)
  })

  if (errors.length > 0) {
    console.log('\n❌ 失敗的資料表:')
    errors.forEach(t => console.log(`   - ${t}`))
  }

  return results
}

// 主程式
async function main() {
  const outputDir = process.argv[2] || './backups/migration'

  try {
    // 連線
    await connectSQLServer()

    // 匯出
    await exportAllTables(outputDir)

    // 結束
    console.log('\n✅ 匯出完成！')
    process.exit(0)
  } catch (err) {
    console.error('\n❌ 程式錯誤:', err.message)
    process.exit(1)
  }
}

main()
