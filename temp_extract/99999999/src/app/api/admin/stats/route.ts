import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Get all products
    const products = await db.product.findMany({
      include: {
        category: true,
      },
    });

    const categories = await db.category.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    // Calculate statistics
    const stats = {
      // Product statistics
      products: {
        total: products.length,
        featured: products.filter(p => p.featured).length,
        inStock: products.filter(p => p.stock > 0).length,
        outOfStock: products.filter(p => p.stock === 0).length,
        lowStock: products.filter(p => p.stock > 0 && p.stock < 5).length,
        avgPrice: products.length > 0
          ? products.reduce((sum, p) => sum + p.price, 0) / products.length
          : 0,
        avgRating: products.length > 0
          ? products.reduce((sum, p) => sum + p.rating, 0) / products.length
          : 0,
        totalSales: products.reduce((sum, p) => sum + p.sales, 0),
      },

      // Category statistics
      categories: {
        total: categories.length,
        byCategory: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          productCount: cat._count?.products || 0,
          totalStock: products
            .filter(p => p.categoryId === cat.id)
            .reduce((sum, p) => sum + p.stock, 0),
          totalSales: products
            .filter(p => p.categoryId === cat.id)
            .reduce((sum, p) => sum + p.sales, 0),
        })),
      },

      // Sales statistics
      sales: {
        total: products.reduce((sum, p) => sum + p.sales, 0),
        topProducts: products
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 10)
          .map(p => ({
            id: p.id,
            name: p.name,
            sales: p.sales,
            price: p.price,
            categoryName: categories.find(c => c.id === p.categoryId)?.name || '-',
          })),
      },

      // Stock alerts
      alerts: {
        outOfStock: products
          .filter(p => p.stock === 0)
          .map(p => ({
            id: p.id,
            name: p.name,
            categoryName: categories.find(c => c.id === p.categoryId)?.name || '-',
          })),
        lowStock: products
          .filter(p => p.stock > 0 && p.stock < 5)
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 10)
          .map(p => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            categoryName: categories.find(c => c.id === p.categoryId)?.name || '-',
          })),
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to get admin stats' },
      { status: 500 }
    );
  }
}
