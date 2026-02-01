import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, trackingNo, carrier } = body;

    if (!orderId || !trackingNo || !carrier) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    if (order.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Order must be confirmed before shipping' },
        { status: 400 }
      );
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        status: 'shipped',
        updatedAt: new Date(),
      },
      include: {
        items: true,
        coupons: true,
      },
    });

    await db.shippingRecord.create({
      data: {
        orderId,
        trackingNo,
        carrier,
        shippedAt: new Date(),
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Failed to ship order:', error);
    return NextResponse.json(
      { error: 'Failed to ship order' },
      { status: 500 }
    );
  }
}
