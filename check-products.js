const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  console.log('檢查數據庫中的商品數據...\n');

  // 檢查新 Product 表
  const newProducts = await prisma.product.count();
  console.log('新 Product 表數量:', newProducts);

  // 檢查舊 products 表（使用原始 SQL）
  try {
    const oldProducts = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "products"`;
    console.log('舊 products 表數量:', oldProducts[0].count);
  } catch (e) {
    console.log('舊 products 表不存在或無法訪問');
  }

  // 獲取新 Product 表的樣本數據
  const sampleProducts = await prisma.product.findMany({
    take: 2,
    include: { category: true, inventory: true }
  });

  console.log('\n新 Product 表樣本:');
  console.log(JSON.stringify(sampleProducts, null, 2));

  // 檢查 ProductCategory
  const categories = await prisma.productCategory.count();
  console.log('\nProductCategory 數量:', categories);

  const sampleCategories = await prisma.productCategory.findMany({ take: 2 });
  console.log('ProductCategory 樣本:', sampleCategories);
}

checkData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
