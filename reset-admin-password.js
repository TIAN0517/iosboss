// 重置管理員密碼腳本
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function resetAdminPassword() {
  try {
    // 查找管理員用戶
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    })

    if (!admin) {
      console.log('❌ 找不到管理員帳號')
      return
    }

    // 新密碼
    const newPassword = 'Uu19700413'
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 更新密碼
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword }
    })

    console.log('✅ 管理員密碼已重置')
    console.log('用戶名:', admin.username)
    console.log('新密碼:', newPassword)
  } catch (error) {
    console.error('錯誤:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()
