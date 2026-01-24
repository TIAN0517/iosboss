import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const featured = searchParams.get('featured');

    const products = await db.product.findMany({
      where: {
        ...(categoryId && { categoryId }),
        ...(featured === 'true' && { featured: true }),
      },
      include: {
        category: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
