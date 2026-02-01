import { db } from '../src/lib/db';
import { extendedProducts } from './extended-products-data';

async function main() {
  console.log('Starting to add extended products...\n');

  // Get or create categories
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

  // Category mapping based on product type
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

  // Determine category for each product
  const productCategories = {
    // Gas stoves
    '不鏽鋼雙口瓦斯爐': 'gasStoves',
    '嵌入式三口瓦斯爐': 'gasStoves',
    '陶瓷面板雙口爐': 'gasStoves',
    '商用五口瓦斯爐': 'gasStoves',
    '桌面式單口瓦斯爐': 'gasStoves',
    // Water heaters
    '即熱式電熱水器 6L': 'waterHeaters',
    '儲水式電熱水器 20L': 'waterHeaters',
    '儲水式電熱水器 60L': 'waterHeaters',
    '太陽能熱水器系統': 'waterHeaters',
    // Gas cylinders
    '瓦斯桶 5KG': 'gasCylinders',
    '工業用瓦斯桶 50KG': 'gasCylinders',
    // Cooking
    '瓦斯壓力鍋': 'cooking',
    '瓦斯蒸鍋': 'cooking',
    '瓦斯煎鍋': 'cooking',
    '瓦斯烤爐': 'cooking',
    '瓦斯火鍋爐': 'cooking',
    // Outdoor
    '戶外瓦斯爐': 'outdoor',
    '戶外瓦斯燈': 'outdoor',
    '迷你便攜瓦斯爐': 'outdoor',
    '瓦斯暖爐': 'outdoor',
    // Safety
    '瓦斯偵測器': 'safety',
    '瓦斯警報器': 'safety',
    '緊急瓦斯切斷閥': 'safety',
    '瓦斯濾清器': 'safety',
    // Pipes
    '瓦斯三通接頭': 'pipes',
    '瓦斯快速接頭': 'pipes',
    '瓦斯管夾': 'pipes',
    '密封墊圈套裝': 'pipes',
    // Maintenance
    '爐具清潔劑': 'maintenance',
    '瓦斯管清潔工具': 'maintenance',
    '維修工具包': 'maintenance',
    // Other
    '爐具腳座': 'other',
    '風擋': 'other',
    '點火器': 'other',
    '計時器': 'other',
  };

  console.log('Adding products to database...\n');

  let addedCount = 0;
  let updatedCount = 0;

  for (const product of extendedProducts) {
    const categoryKey = productCategories[product.name as keyof typeof productCategories];
    const categoryId = categoryKey ? categoryMap[categoryKey] : categories.other.id;

    // Check if product already exists
    const existingProduct = await db.product.findFirst({
      where: { name: product.name }
    });

    const productData = {
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      categoryId: categoryId,
      featured: product.featured,
      sortOrder: product.sortOrder,
      imageUrl: `/products/${product.filename}`,
    };

    if (existingProduct) {
      // Update existing product
      await db.product.update({
        where: { id: existingProduct.id },
        data: productData,
      });
      console.log(`✓ Updated: ${product.name}`);
      updatedCount++;
    } else {
      // Create new product
      await db.product.create({
        data: {
          ...productData,
          id: `prod-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        },
      });
      console.log(`✓ Added: ${product.name}`);
      addedCount++;
    }
  }

  console.log('\n========================================');
  console.log(`✅ Product addition completed!`);
  console.log(`   Added: ${addedCount} new products`);
  console.log(`   Updated: ${updatedCount} existing products`);
  console.log(`   Total: ${extendedProducts.length} products`);
  console.log('========================================\n');

  console.log('Next step: Generate product images');
  console.log('Run: bun run scripts/generate-extended-images.ts');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
