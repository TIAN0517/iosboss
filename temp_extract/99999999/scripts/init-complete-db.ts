import { db } from '../src/lib/db';
import { completeProducts } from './120-products-complete';

async function main() {
  console.log('========================================');
  console.log('開始初始化完整商城系統');
  console.log('========================================\n');

  // === 第一步：創建分類 ===
  console.log('Step 1: 創建商品分類...\n');

  const categories = {
    gasStoves: await db.category.upsert({
      where: { slug: 'gas-stoves' },
      update: {},
      create: {
        name: '瓦斯爐',
        slug: 'gas-stoves',
        icon: '🍳',
        sortOrder: 1,
      },
    }),
    waterHeaters: await db.category.upsert({
      where: { slug: 'water-heaters' },
      update: {},
      create: {
        name: '熱水器',
        slug: 'water-heaters',
        icon: '🚿',
        sortOrder: 2,
      },
    }),
    gasCylinders: await db.category.upsert({
      where: { slug: 'gas-cylinders' },
      update: {},
      create: {
        name: '瓦斯桶',
        slug: 'gas-cylinders',
        icon: '🔥',
        sortOrder: 3,
      },
    }),
    cooking: await db.category.upsert({
      where: { slug: 'cooking' },
      update: {},
      create: {
        name: '烹調用品',
        slug: 'cooking',
        icon: '🍲',
        sortOrder: 4,
      },
    }),
    outdoor: await db.category.upsert({
      where: { slug: 'outdoor' },
      update: {},
      create: {
        name: '戶外用品',
        slug: 'outdoor',
        icon: '🏕️',
        sortOrder: 5,
      },
    }),
    safety: await db.category.upsert({
      where: { slug: 'safety' },
      update: {},
      create: {
        name: '安全配件',
        slug: 'safety',
        icon: '🛡️',
        sortOrder: 6,
      },
    }),
    pipes: await db.category.upsert({
      where: { slug: 'pipes' },
      update: {},
      create: {
        name: '管路配件',
        slug: 'pipes',
        icon: '🔧',
        sortOrder: 7,
      },
    }),
    maintenance: await db.category.upsert({
      where: { slug: 'maintenance' },
      update: {},
      create: {
        name: '維護工具',
        slug: 'maintenance',
        icon: '🔩',
        sortOrder: 8,
      },
    }),
    other: await db.category.upsert({
      where: { slug: 'other' },
      update: {},
      create: {
        name: '其他配件',
        slug: 'other',
        icon: '📦',
        sortOrder: 9,
      },
    }),
  };

  console.log('✓ 分類創建完成\n');

  // Category ID 映射
  const categoryMap: any = {
    gasStoves: categories.gasStoves.id,
    waterHeaters: categories.waterHeaters.id,
    gasCylinders: categories.gasCylinders.id,
    cooking: categories.cooking.id,
    outdoor: categories.outdoor.id,
    safety: categories.safety.id,
    pipes: categories.pipes.id,
    maintenance: categories.maintenance.id,
    other: categories.other.id,
  };

  // === 第二步：清空並重新添加產品 ===
  console.log('Step 2: 清空現有產品...\n');

  await db.orderItem.deleteMany({});
  await db.order.deleteMany({});
  await db.cartItem.deleteMany({});
  await db.product.deleteMany({});

  console.log('✓ 現有數據已清空\n');

  // === 第三步：添加120個產品 ===
  console.log('Step 3: 添加120個產品...\n');

  let addedCount = 0;
  let featuredCount = 0;

  for (const product of completeProducts) {
    const categoryId = categoryMap[product.categoryId as keyof typeof categoryMap] || categoryMap.other;

    await db.product.create({
      data: {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        categoryId: categoryId,
        featured: product.featured,
        sortOrder: product.sortOrder,
        imageUrl: `/products/${product.filename}`,
        views: 0,
        sales: 0,
        rating: 0,
      },
    });

    console.log(`  ✓ ${product.name} - NT$${product.price.toLocaleString()}`);
    addedCount++;

    if (product.featured) {
      featuredCount++;
    }
  }

  console.log(`\n✓ 產品添加完成: ${addedCount} 個`);
  console.log(`✓ 特色產品: ${featuredCount} 個\n`);

  // === 第四步：創建示範優惠券 ===
  console.log('Step 4: 創建示範優惠券...\n');

  const coupons = [
    {
      code: 'WELCOME100',
      name: '新人首購優惠',
      description: '新會員首次購物滿$2000可享$100折扣',
      discountType: 'fixed',
      discountValue: 100,
      minAmount: 2000,
      maxAmount: 100,
      usageLimit: 1000,
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天後過期
    },
    {
      code: 'VIP10%',
      name: 'VIP會員折扣',
      description: 'VIP會員可享10%折扣',
      discountType: 'percentage',
      discountValue: 10,
      minAmount: 1000,
      maxAmount: 500,
      usageLimit: 500,
      validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90天後過期
    },
    {
      code: 'GAS50',
      name: '瓦斯器具優惠',
      description: '購買瓦斯器具滿$3000可享$50折扣',
      discountType: 'fixed',
      discountValue: 50,
      minAmount: 3000,
      maxAmount: 50,
      usageLimit: 200,
      validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60天後過期
    },
  ];

  for (const coupon of coupons) {
    await db.coupon.create({
      data: {
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minAmount: coupon.minAmount,
        maxAmount: coupon.maxAmount,
        usageLimit: coupon.usageLimit,
        validFrom: new Date(),
        validTo: coupon.validTo,
        isActive: true,
      },
    });

    console.log(`  ✓ ${coupon.code} - ${coupon.name}`);
  }

  console.log(`\n✓ 優惠券創建完成: ${coupons.length} 個\n`);

  // === 完成總結 ===
  console.log('========================================');
  console.log('✅ 數據庫初始化完成！');
  console.log('========================================');
  console.log(`📊 統計資料：`);
  console.log(`   - 分類數量: 9 個`);
  console.log(`   - 產品數量: ${addedCount} 個`);
  console.log(`   - 特色產品: ${featuredCount} 個`);
  console.log(`   - 優惠券數量: ${coupons.length} 個`);
  console.log(`   - 價格範圍: NT$120 - NT$30,000`);
  console.log('========================================\n');

  console.log('📝 下一步：');
  console.log('   1. 生成產品圖片：bun run scripts/generate-120-images.ts');
  console.log('   2. 查看網站：打開 Preview Panel');
  console.log('   3. API路徑：');
  console.log('      - GET  /api/categories');
  console.log('      - GET  /api/products');
  console.log('      - GET  /api/products/[id]');
  console.log('      - POST /api/orders');
  console.log('      - GET  /api/orders');
  console.log('      - POST /api/cart/items');
  console.log('      - GET  /api/cart');
  console.log('      - POST /api/cart/clear');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
