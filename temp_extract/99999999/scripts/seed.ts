import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'gas-stoves' },
      update: {},
      create: {
        name: '瓦斯爐',
        slug: 'gas-stoves',
        icon: '🍳',
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'water-heaters' },
      update: {},
      create: {
        name: '熱水器',
        slug: 'water-heaters',
        icon: '🚿',
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'gas-cylinders' },
      update: {},
      create: {
        name: '瓦斯桶',
        slug: 'gas-cylinders',
        icon: '🔥',
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'accessories' },
      update: {},
      create: {
        name: '配件',
        slug: 'accessories',
        icon: '🔧',
        sortOrder: 4,
      },
    }),
  ]);

  console.log('Categories created:', categories.length);

  // Create products
  const products = [
    // Gas Stoves
    {
      name: '雙口瓦斯爐 玻璃面板',
      description: '黑色玻璃面板，安全熄火裝置，火力調節精準',
      price: 2800,
      stock: 15,
      categoryId: categories[0].id,
      featured: true,
      sortOrder: 1,
    },
    {
      name: '三口瓦斯爐 不鏽鋼',
      description: '304不鏽鋼面板，耐用易清潔，火力強勁',
      price: 3500,
      stock: 10,
      categoryId: categories[0].id,
      featured: true,
      sortOrder: 2,
    },
    {
      name: '四口瓦斯爐 專業款',
      description: '適合家庭聚餐，大火力設計，安全可靠',
      price: 4200,
      stock: 8,
      categoryId: categories[0].id,
      featured: false,
      sortOrder: 3,
    },
    {
      name: '單口瓦斯爐 小型',
      description: '適合小家庭使用，節省空間',
      price: 1800,
      stock: 20,
      categoryId: categories[0].id,
      featured: false,
      sortOrder: 4,
    },
    // Water Heaters
    {
      name: '即熱式電熱水器',
      description: '即開即熱，省電環保，安全過熱保護',
      price: 3500,
      stock: 12,
      categoryId: categories[1].id,
      featured: true,
      sortOrder: 1,
    },
    {
      name: '儲水式電熱水器 40L',
      description: '40公升容量，適合2-3人使用',
      price: 4500,
      stock: 10,
      categoryId: categories[1].id,
      featured: true,
      sortOrder: 2,
    },
    {
      name: '瓦斯熱水器 8L',
      description: '8公升大水量，全家共用無壓力',
      price: 5200,
      stock: 8,
      categoryId: categories[1].id,
      featured: false,
      sortOrder: 3,
    },
    {
      name: '瓦斯熱水器 10L',
      description: '10公升超大水量，適合大家庭',
      price: 6500,
      stock: 6,
      categoryId: categories[1].id,
      featured: false,
      sortOrder: 4,
    },
    // Gas Cylinders
    {
      name: '瓦斯桶 20KG',
      description: '標準20公斤瓦斯桶，容量充足',
      price: 950,
      stock: 50,
      categoryId: categories[2].id,
      featured: true,
      sortOrder: 1,
    },
    {
      name: '瓦斯桶 16KG',
      description: '16公斤瓦斯桶，小家庭首選',
      price: 750,
      stock: 40,
      categoryId: categories[2].id,
      featured: false,
      sortOrder: 2,
    },
    {
      name: '瓦斯桶 12KG',
      description: '12公斤瓦斯桶，適合公寓',
      price: 600,
      stock: 30,
      categoryId: categories[2].id,
      featured: false,
      sortOrder: 3,
    },
    {
      name: '瓦斯桶 8KG',
      description: '8公斤瓦斯桶，輕巧方便',
      price: 450,
      stock: 25,
      categoryId: categories[2].id,
      featured: false,
      sortOrder: 4,
    },
    // Accessories
    {
      name: '瓦斯管 1公尺',
      description: '高品質瓦斯管，安全耐用',
      price: 180,
      stock: 100,
      categoryId: categories[3].id,
      featured: true,
      sortOrder: 1,
    },
    {
      name: '瓦斯調壓器',
      description: '精密調壓，火力穡定',
      price: 250,
      stock: 80,
      categoryId: categories[3].id,
      featured: false,
      sortOrder: 2,
    },
    {
      name: '瓦斯開關',
      description: '安全開關，操作簡單',
      price: 120,
      stock: 120,
      categoryId: categories[3].id,
      featured: false,
      sortOrder: 3,
    },
    {
      name: '熱水器專用燃氣閥',
      description: '專用燃氣閥，安全可靠',
      price: 150,
      stock: 60,
      categoryId: categories[3].id,
      featured: false,
      sortOrder: 4,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: `prod-${Math.random().toString()}` },
      update: {},
      create: {
        ...product,
        id: `prod-${Math.random().toString(36).substring(7)}`,
      },
    });
  }

  console.log('Products created:', products.length);

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
