import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, amount, reason } = body;

    if (!orderId || !amount || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        coupons: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Only paid orders can be refunded' },
        { status: 400 }
      );
    }

    if (amount > order.totalAmount) {
      return NextResponse.json(
        { error: 'Refund amount cannot exceed order total' },
        { status: 400 }
      );
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'refunded',
        note: `${order.note || ''}\n退款原因：${reason}`,
        updatedAt: new Date(),
      },
    });

    await db.shippingRecord.create({
      data: {
        orderId,
        note: reason,
        createdAt: new Date(),
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Failed to process refund:', error);
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}
