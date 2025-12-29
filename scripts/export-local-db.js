// 導出本地 PostgreSQL 數據到 SQL 文件
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

async function exportLocalDatabase() {
  try {
    console.log('\n📤 開始導出本地 PostgreSQL 數據...\n')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const backupDir = path.join(__dirname, '../backups')
    const backupFile = path.join(backupDir, `gas_management_export_${timestamp}.sql`)

    // 確保備份目錄存在
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    // 使用 pg_dump 導出數據
    const pgDumpCmd = `pg_dump -h localhost -U postgres -d gas_management --clean --if-exists --no-owner --no-acl -f "${backupFile}"`

    console.log('執行命令:', pgDumpCmd)
    console.log('可能需要輸入密碼: Ss520520\n')

    try {
      execSync(pgDumpCmd, { stdio: 'inherit' })
    } catch (error) {
      console.error('\n⚠️ pg_dump 命令失敗，嘗試使用 pgpass 方式...')

      // 創建臨時 .pgpass 文件
      const pgpassPath = path.join(__dirname, '../.pgpass')
      fs.writeFileSync(pgpassPath, 'localhost:5432:gas_management:postgres:Ss520520')

      // 設置 .pgpass 權限 (Windows 不需要 chmod，但 Unix 需要)
      try {
        execSync(`chmod 600 "${pgpassPath}"`)
      } catch (e) {
        // Windows 忽略 chmod 錯誤
      }

      // 設置環境變量
      const envCmd = `set PGPASSFILE="${pgpassPath}" && ${pgDumpCmd}`
      execSync(envCmd, { stdio: 'inherit', shell: true })

      // 刪除臨時 .pgpass 文件
      fs.unlinkSync(pgpassPath)
    }

    const fileSize = (fs.statSync(backupFile).size / 1024).toFixed(2)
    console.log(`\n✅ 數據導出成功！`)
    console.log(`   文件: ${backupFile}`)
    console.log(`   大小: ${fileSize} KB`)

    return backupFile

  } catch (error) {
    console.error('\n❌ 導出失敗:', error.message)

    // 如果 pg_dump 不可用，嘗試使用 Prisma 導出
    console.log('\n🔄 嘗試使用 Prisma 導出...')
    try {
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()

      const data = {
        users: await prisma.user.findMany(),
        customers: await prisma.customer.findMany(),
        products: await prisma.product.findMany(),
        productCategories: await prisma.productCategory.findMany(),
        inventories: await prisma.inventory.findMany(),
        inventoryTransactions: await prisma.inventoryTransaction.findMany(),
        customerGroups: await prisma.customerGroup.findMany(),
        orders: await prisma.gasOrder.findMany(),
        orderItems: await prisma.gasOrderItem.findMany(),
        checks: await prisma.check.findMany(),
        costRecords: await prisma.costRecord.findMany(),
        callRecords: await prisma.callRecord.findMany(),
        deliveryRecords: await prisma.deliveryRecord.findMany(),
        meterReadings: await prisma.meterReading.findMany(),
        monthlyStatements: await prisma.monthlyStatement.findMany(),
        lineGroups: await prisma.lineGroup.findMany(),
        lineMessages: await prisma.lineMessage.findMany(),
        accountingSyncs: await prisma.accountingSync.findMany(),
      }

      await prisma.$disconnect()

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const backupDir = path.join(__dirname, '../backups')
      const jsonFile = path.join(backupDir, `gas_management_json_${timestamp}.json`)

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf-8')

      console.log(`✅ JSON 數據導出成功: ${jsonFile}`)
      return jsonFile

    } catch (prismaError) {
      console.error('❌ Prisma 導出也失敗:', prismaError.message)
      throw prismaError
    }
  }
}

exportLocalDatabase()
  .then(() => {
    console.log('\n✅ 導出完成！')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ 導出失敗:', error)
    process.exit(1)
  })
