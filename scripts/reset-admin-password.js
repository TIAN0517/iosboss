#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 重置超級管理員密碼...')

  try {
    const admin = await prisma.user.findUnique({
      where: { username: 'bossjy' }
    })

    if (!admin) {
      console.error('❌ 找不到用戶 "bossjy"')
      return
    }

    const hashedPassword = await bcrypt.hash('bossjy123', 10)

    const updated = await prisma.user.update({
      where: { username: 'bossjy' },
      data: {
        password: hashedPassword
      }
    })

    console.log('✅ 密碼重置成功!')
    console.log('   用戶名:', updated.username)
    console.log('   姓名:', updated.name)
    console.log('   角色:', updated.role)
    console.log('   新密碼: bossjy123')
    console.log('')
    console.log('🔐 現在可以使用以下憑證登入:')
    console.log('   帳號: bossjy')
    console.log('   密碼: bossjy123')

  } catch (error) {
    console.error('❌ 重置密碼失敗:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('')
    console.log('🎉 操作完成！')
    process.exit(0)
  })
  .catch((error) => {
    console.error('')
    console.error('💥 操作失敗:')
    console.error(error)
    process.exit(1)
  })
