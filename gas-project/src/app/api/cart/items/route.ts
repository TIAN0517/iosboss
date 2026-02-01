import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/cart/items - 添加商品到购物车
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity = 1, sessionId } = body;

    if (!productId || !sessionId) {
      return NextResponse.json(
        { error: 'productId and sessionId are required' },
        { status: 400 }
      );
    }

    // 检查商品是否存在
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // 检查购物车中是否已有该商品
    const existingItem = await db.cartItem.findFirst({
      where: {
        productId,
        sessionId,
      },
    });

    if (existingItem) {
      // 更新数量
      const updated = await db.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
        },
      });

      return NextResponse.json(updated);
    } else {
      // 创建新购物车项
      const created = await db.cartItem.create({
        data: {
          productId,
          quantity,
          sessionId,
        },
      });

      return NextResponse.json(created);
    }
  } catch (error) {
    console.error('Failed to add to cart:', error);
    return NextResponse.json(
      { error: 'Failed to add to cart' },
      { status: 500 }
    );
  }
}

// GET /api/cart/items - 获取购物车内容
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const cartItems = await db.cartItem.findMany({
      where: { sessionId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    // 计算总价
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    return NextResponse.json({
      items: cartItems,
      totalAmount,
      itemCount: cartItems.length,
      totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error) {
    console.error('Failed to fetch cart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

// PATCH /api/cart/items - 更新购物车商品数量
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { cartItemId, quantity, sessionId } = body;

    if (!cartItemId || !sessionId) {
      return NextResponse.json(
        { error: 'cartItemId and sessionId are required' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      // 删除购物车项
      await db.cartItem.deleteMany({
        where: {
          id: cartItemId,
          sessionId,
        },
      });

      return NextResponse.json({ success: true, deleted: true });
    }

    const updated = await db.cartItem.updateMany({
      where: {
        id: cartItemId,
        sessionId,
      },
      data: { quantity },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update cart:', error);
    return NextResponse.json(
      { error: 'Failed to update cart' },
      { status: 500 }
    );
  }
}

// DELETE /api/cart/items - 删除购物车商品
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cartItemId = searchParams.get('cartItemId');
    const sessionId = searchParams.get('sessionId');

    if (!cartItemId || !sessionId) {
      return NextResponse.json(
        { error: 'cartItemId and sessionId are required' },
        { status: 400 }
      );
    }

    await db.cartItem.deleteMany({
      where: {
        id: cartItemId,
        sessionId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete from cart:', error);
    return NextResponse.json(
      { error: 'Failed to delete from cart' },
      { status: 500 }
    );
  }
}
