import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/cart/clear - 清空购物车
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    await db.cartItem.deleteMany({
      where: { sessionId },
    });

    return NextResponse.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Failed to clear cart:', error);
    return NextResponse.json(
      { error: 'Failed to clear cart' },
      { status: 500 }
    );
  }
}
