import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'updatedAt';
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
    
    const skip = (page - 1) * limit;
    
    const where: any = {
      isActive: true
    };
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { keywords: { hasSome: [search] } }
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    const [knowledge, total] = await Promise.all([
      prisma.knowledgeBase.findMany({
        where,
        orderBy: { [sort]: order },
        skip,
        take: limit,
        include: {
          keywordsRelations: true,
          _count: {
            select: { usageLogs: true }
          }
        }
      }),
      prisma.knowledgeBase.count({ where })
    ]);
    
    const categories = await prisma.knowledgeBase.groupBy({
      by: ['category'],
      where: { isActive: true }
    });
    
    return NextResponse.json({
      success: true,
      data: knowledge,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      categories: categories.map(c => c.category)
    });
  } catch (error) {
    console.error('查詢知識庫時發生錯誤:', error);
    return NextResponse.json(
      { success: false, error: '查詢知識庫失敗' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, category, content, keywords, priority } = body;
    
    if (!title || !category || !content) {
      return NextResponse.json(
        { success: false, error: '缺少必要欄位：title, category, content' },
        { status: 400 }
      );
    }
    
    const knowledge = await prisma.knowledgeBase.create({
      data: {
        title,
        category,
        content,
        keywords: keywords || [],
        priority: priority || 0,
        isActive: true,
        viewCount: 0,
        usageCount: 0
      },
      include: {
        keywordsRelations: true
      }
    });
    
    if (keywords && keywords.length > 0) {
      await prisma.knowledgeKeyword.createMany({
        data: keywords.map((keyword: string) => ({
          knowledgeBaseId: knowledge.id,
          keyword
        }))
      });
    }
    
    return NextResponse.json({
      success: true,
      data: knowledge,
      message: '知識庫項目創建成功'
    });
  } catch (error) {
    console.error('創建知識庫時發生錯誤:', error);
    return NextResponse.json(
      { success: false, error: '創建知識庫失敗' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, category, content, keywords, priority, isActive } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少知識庫ID' },
        { status: 400 }
      );
    }
    
    const existing = await prisma.knowledgeBase.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '知識庫項目不存在' },
        { status: 404 }
      );
    }
    
    const knowledge = await prisma.knowledgeBase.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(content !== undefined && { content }),
        ...(keywords !== undefined && { keywords }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      },
      include: {
        keywordsRelations: true
      }
    });
    
    if (keywords !== undefined) {
      await prisma.knowledgeKeyword.deleteMany({
        where: { knowledgeBaseId: id }
      });
      
      if (keywords.length > 0) {
        await prisma.knowledgeKeyword.createMany({
          data: keywords.map((keyword: string) => ({
            knowledgeBaseId: id,
            keyword
          }))
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: knowledge,
      message: '知識庫項目更新成功'
    });
  } catch (error) {
    console.error('更新知識庫時發生錯誤:', error);
    return NextResponse.json(
      { success: false, error: '更新知識庫失敗' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少知識庫ID' },
        { status: 400 }
      );
    }
    
    const existing = await prisma.knowledgeBase.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '知識庫項目不存在' },
        { status: 404 }
      );
    }
    
    await prisma.knowledgeBase.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: '知識庫項目刪除成功'
    });
  } catch (error) {
    console.error('刪除知識庫時發生錯誤:', error);
    return NextResponse.json(
      { success: false, error: '刪除知識庫失敗' },
      { status: 500 }
    );
  }
}
