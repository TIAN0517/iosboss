import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { orderNo: { contains: search, mode: 'insensitive' } },
        { guestName: { contains: search, mode: 'insensitive' } },
        { guestPhone: { contains: search } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactPhone: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      db.shopOrder.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.shopOrder.count({ where }),
    ]);

    // 格式化訂單資料符合前端格式
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNo,
      customerName: order.guestName || order.contactName || '訪客',
      phone: order.guestPhone || order.contactPhone || '',
      address: order.deliveryAddress || order.guestAddress || '',
      totalAmount: order.total,
      status: order.status,
      paymentStatus: order.paymentAt ? 'paid' : 'unpaid',
      paymentMethod: order.paymentMethod,
      note: order.note,
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.productName,
        imageUrl: item.productImage,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
    }));

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch shop orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { orderNo, status } = body;

    if (!orderNo) {
      return NextResponse.json({ error: '訂單編號必填' }, { status: 400 });
    }

    const order = await db.shopOrder.update({
      where: { orderNo },
      data: {
        status,
        ...(status === 'shipped' ? { shippedAt: new Date() } : {}),
        ...(status === 'completed' ? { completedAt: new Date() } : {}),
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
