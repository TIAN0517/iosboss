import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('開始添加產品評分和銷售量數據...');

  const products = await prisma.product.findMany();

  for (const product of products) {
    // 隨機生成評分 (3.0 - 5.0)
    const rating = Math.round((Math.random() * 2 + 3) * 10) / 10;

    // 隨機生成銷售量 (0 - 100)
    const sales = Math.floor(Math.random() * 101);

    await prisma.product.update({
      where: { id: product.id },
      data: { rating, sales },
    });

    console.log(`更新產品: ${product.name} - 評分: ${rating}, 銷售量: ${sales}`);
  }

  console.log('所有產品評分和銷售量數據已添加完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
