'use client';

import { useState, useEffect } from 'react';
import { BrandIcon } from './BrandIcon';
import { IOSButton } from './ui/ios-button';
import { IOSCard } from './ui/ios-card';
import { Input } from './ui/ios-input';
import { triggerHaptic } from '@/lib/ios-utils';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
  categoryId: string;
  featured: boolean;
  rating: number;
  sales: number;
}

interface Category {
  id: string;
  name: string;
  slug: string | null;
  icon: string | null;
  sortOrder: number;
}

interface CartItem {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  imageUrl?: string;
}

export function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/product-categories'),
      ]);

      if (productsRes.ok && categoriesRes.ok) {
        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();
        setProducts(productsData);
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('無法載入資料:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    triggerHaptic('light');
    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        quantity: 1,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || undefined,
      }]);
    }
    setShowCart(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    triggerHaptic('light');
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filter products
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  const searchedProducts = searchQuery
    ? filteredProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : filteredProducts;

  // Sort products
  const sortedProducts = [...searchedProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'sales':
        return b.sales - a.sales;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-easy-body text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-easy-title font-bold text-gray-900">
            <BrandIcon size={28} className="inline mr-2" />
            瓦斯行電商
          </h1>
          <p className="text-easy-caption text-gray-500 mt-1">
            線上訂購，快速配送
          </p>
        </div>
        <IOSButton
          onClick={() => setShowCart(!showCart)}
          className="relative"
        >
          <BrandIcon size={24} />
          購物車 ({cartCount})
        </IOSButton>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => {
            setSelectedCategory(null);
            triggerHaptic('light');
          }}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-easy-body font-medium transition-colors ${
            !selectedCategory
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          全部
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              setSelectedCategory(category.id);
              triggerHaptic('light');
            }}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-easy-body font-medium transition-colors ${
              selectedCategory === category.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {category.icon}{category.name}
          </button>
        ))}
      </div>

      {/* Search and Sort */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="搜尋商品..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            triggerHaptic('light');
          }}
          className="px-4 py-3 rounded-lg border border-gray-200 bg-white"
        >
          <option value="default">預設排序</option>
          <option value="price-asc">價格低到高</option>
          <option value="price-desc">價格高到低</option>
          <option value="rating">評分最高</option>
          <option value="sales">銷量最高</option>
        </select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedProducts.map((product) => (
          <IOSCard key={product.id} className="overflow-hidden">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-3">
              <h3 className="text-easy-body font-semibold text-gray-900 mb-1 line-clamp-2">
                {product.name}
              </h3>
              <p className="text-easy-caption text-gray-500 mb-2 line-clamp-2">
                {product.description}
              </p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-easy-heading font-bold text-orange-500">
                  NT${product.price}
                </span>
                {product.stock > 0 ? (
                  <span className="text-xs text-green-600">庫存: {product.stock}</span>
                ) : (
                  <span className="text-xs text-red-600">已售完</span>
                )}
              </div>
              {product.rating > 0 && (
                <div className="flex items-center text-xs text-gray-500 mb-2">
                  <span>★ {product.rating.toFixed(1)}</span>
                  <span className="mx-1">•</span>
                  <span>已售 {product.sales}</span>
                </div>
              )}
              <IOSButton
                onClick={() => handleAddToCart(product)}
                disabled={product.stock === 0}
                className="w-full"
              >
                {product.stock > 0 ? '加入購物車' : '已售完'}
              </IOSButton>
            </div>
          </IOSCard>
        ))}
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowCart(false);
              triggerHaptic('medium');
            }}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-xl flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-easy-heading font-bold">購物車</h2>
              <button
                onClick={() => {
                  setShowCart(false);
                  triggerHaptic('medium');
                }}
                className="p-2"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">購物車是空的</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <h3 className="text-easy-body font-semibold">{item.name}</h3>
                        <p className="text-easy-caption text-gray-500">NT${item.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between text-easy-body mb-4">
                  <span>總計:</span>
                  <span className="font-bold text-orange-500">NT${cartTotal}</span>
                </div>
                <IOSButton onClick={() => {
                  triggerHaptic('success');
                  alert('結帳功能開發中...');
                }} className="w-full">
                  去結帳
                </IOSButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
