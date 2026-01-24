import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Get all products
    const products = await db.product.findMany({
      include: { category: true }
    });

    // Map image URLs based on product name
    const imageMap: Record<string, string> = {
      // Gas Stoves
      '雙口瓦斯爐 玻璃面板': '/products/gas-stove-2-burner.png',
      '三口瓦斯爐 不鏽鋼': '/products/gas-stove-3-burner.png',
      '四口瓦斯爐 專業款': '/products/gas-stove-4-burner.png',
      '單口瓦斯爐 小型': '/products/gas-stove-1-burner.png',
      // Water Heaters
      '即熱式電熱水器': '/products/water-heater-instant.png',
      '儲水式電熱水器 40L': '/products/water-heater-storage.png',
      '瓦斯熱水器 8L': '/products/water-heater-gas-8l.png',
      '瓦斯熱水器 10L': '/products/water-heater-gas-10l.png',
      // Gas Cylinders
      '瓦斯桶 20KG': '/products/gas-cylinder-20kg.png',
      '瓦斯桶 16KG': '/products/gas-cylinder-16kg.png',
      '瓦斯桶 12KG': '/products/gas-cylinder-12kg.png',
      '瓦斯桶 8KG': '/products/gas-cylinder-8kg.png',
      // Accessories
      '瓦斯管 1公尺': '/products/gas-hose.png',
      '瓦斯調壓器': '/products/gas-regulator.png',
      '瓦斯開關': '/products/gas-valve.png',
      '熱水器專用燃氣閥': '/products/water-heater-valve.png',
    };

    // Update products with image URLs
    for (const product of products) {
      const imageUrl = imageMap[product.name];

      if (imageUrl && product.imageUrl !== imageUrl) {
        await db.product.update({
          where: { id: product.id },
          data: { imageUrl }
        });
        console.log(`✓ Updated image for: ${product.name}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Product images updated successfully',
      count: products.length
    });
  } catch (error) {
    console.error('Failed to update product images:', error);
    return NextResponse.json(
      { error: 'Failed to update product images' },
      { status: 500 }
    );
  }
}
