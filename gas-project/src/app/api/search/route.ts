import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const categoryId = searchParams.get('categoryId');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query.trim() && !categoryId) {
      return NextResponse.json({
        results: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
        suggestions: [],
      });
    }

    // Build where clause
    const where: any = {};

    // Search query (name, description)
    if (query.trim()) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) {
        where.price.gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        where.price.lte = parseFloat(maxPrice);
      }
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'price-asc':
        orderBy = { price: 'asc' };
        break;
      case 'price-desc':
        orderBy = { price: 'desc' };
        break;
      case 'sales':
        orderBy = { sales: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'relevance':
      default:
        // For relevance, prioritize featured and higher rating
        orderBy = [
          { featured: 'desc' },
          { sales: 'desc' },
          { rating: 'desc' },
        ];
        break;
    }

    // Fetch search results
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    // Generate suggestions based on search query
    let suggestions: any[] = [];
    if (query.trim()) {
      // Get all categories
      const categories = await db.category.findMany();

      // Suggest matching categories
      const categorySuggestions = categories
        .filter(cat => cat.name.toLowerCase().includes(query.toLowerCase()))
        .map(cat => ({
          type: 'category',
          id: cat.id,
          text: cat.name,
          icon: cat.icon,
        }));

      // Suggest matching products
      const productSuggestions = products
        .slice(0, 5)
        .map(p => ({
          type: 'product',
          id: p.id,
          text: p.name,
          price: p.price,
          imageUrl: p.imageUrl,
        }));

      suggestions = [...categorySuggestions, ...productSuggestions];
    }

    return NextResponse.json({
      results: products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
        stock: p.stock,
        categoryId: p.categoryId,
        categoryName: p.category?.name,
        categorySlug: p.category?.slug,
        categoryIcon: p.category?.icon,
        featured: p.featured,
        rating: p.rating,
        sales: p.sales,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      suggestions: suggestions.slice(0, 10),
      filters: {
        categories: await db.category.findMany(),
        priceRange: {
          min: products.length > 0 ? Math.min(...products.map(p => p.price)) : 0,
          max: products.length > 0 ? Math.max(...products.map(p => p.price)) : 0,
        },
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
