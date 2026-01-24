import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let where: any = {};

    if (userId) where.userId = userId;
    if (date) where.date = date;
    if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate
      };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('获取打卡记录失败:', error);
    return NextResponse.json(
      { error: '获取打卡记录失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, userName, date, type, note } = body;

    if (!userId || !userName || !date || !type) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      );
    }

    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date
        }
      }
    });

    let record;

    if (existingRecord) {
      record = await prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: {
          [type === 'clockIn' ? 'clockIn' : 'clockOut']: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }),
          note: note || existingRecord.note
        }
      });
    } else {
      record = await prisma.attendanceRecord.create({
        data: {
          userId,
          userName,
          date,
          [type === 'clockIn' ? 'clockIn' : 'clockOut']: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }),
          note
        }
      });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('打卡失败:', error);
    return NextResponse.json(
      { error: '打卡失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少记录 ID' },
        { status: 400 }
      );
    }

    await prisma.attendanceRecord.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除打卡记录失败:', error);
    return NextResponse.json(
      { error: '删除打卡记录失败' },
      { status: 500 }
    );
  }
}
