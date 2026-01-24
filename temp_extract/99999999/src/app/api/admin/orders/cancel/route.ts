import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Only pending or confirmed orders can be cancelled' },
        { status: 400 }
      );
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        note: reason || order.note,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Failed to cancel order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
