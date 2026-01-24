import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, quantity, operation } = body;

    // Get current product
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Calculate new stock
    let newStock = product.stock;
    if (operation === 'add') {
      newStock += quantity;
    } else if (operation === 'subtract') {
      newStock = Math.max(0, newStock - quantity);
    } else if (operation === 'set') {
      newStock = quantity;
    }

    // Update product stock
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: {
        stock: newStock,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Failed to update inventory:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lowStockThreshold = parseInt(searchParams.get('lowStockThreshold') || '5');

    // Get all products
    const products = await db.product.findMany({
      include: {
        category: true,
      },
      orderBy: {
        stock: 'asc',
      },
    });

    // Calculate inventory statistics
    const stats = {
      total: products.length,
      inStock: products.filter(p => p.stock > 0).length,
      outOfStock: products.filter(p => p.stock === 0).length,
      lowStock: products.filter(p => p.stock > 0 && p.stock < lowStockThreshold).length,
      totalStock: products.reduce((sum, p) => sum + p.stock, 0),
      lowStockProducts: products.filter(p => p.stock > 0 && p.stock < lowStockThreshold),
      outOfStockProducts: products.filter(p => p.stock === 0),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get inventory stats:', error);
    return NextResponse.json(
      { error: 'Failed to get inventory stats' },
      { status: 500 }
    );
  }
}
