import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const products = await db.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: true,
        inventory: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 轉換為 Shop 組件期望的格式
    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.capacity || p.description || null,
      price: p.price,
      imageUrl: null, // 目前沒有圖片字段
      stock: p.inventory?.quantity || 0,
      categoryId: p.categoryId,
      featured: false, // 目前沒有精選字段
      rating: 0, // 目前沒有評分字段
      sales: 0, // 目前沒有銷量字段
      category: p.category,
      inventory: p.inventory,
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
