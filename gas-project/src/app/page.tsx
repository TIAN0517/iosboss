'use client';

import { Header } from '@/components/header';
import { CartDrawer } from '@/components/cart-drawer';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, Phone, MapPin, Clock, Flame, Shield, Truck, Sparkles, Search, Star, TrendingUp, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cart';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  slug: string;
  icon: string | null;
}

// 產品名稱到圖片檔案的映射
const IMAGE_MAP: Record<string, string> = {
  // 瓦斯桶
  '4kg': 'gas-cylinder-4kg.png',
  '5kg': 'gas-cylinder-5kg.png',
  '8kg': 'gas-cylinder-8kg.png',
  '10kg': 'gas-cylinder-10kg.png',
  '12kg': 'gas-cylinder-12kg.png',
  '15kg': 'gas-cylinder-16kg.png',
  '16kg': 'gas-cylinder-16kg.png',
  '20kg': 'gas-cylinder-20kg.png',
  '50kg': 'gas-cylinder-50kg.png',
  '公斤': 'gas-cylinder-20kg.png',
  '桶裝瓦斯': 'gas-cylinder-20kg.png',
  '瓦斯桶': 'gas-cylinder-20kg.png',

  // 瓦斯爐
  '瓦斯爐': 'gas-stove-2-burner.png',
  '三口': 'gas-stove-3-burner.png',
  '四口': 'gas-stove-4-burner.png',
  '雙口': 'gas-stove-2-burner.png',
  '單口': 'gas-stove-1-burner.png',
  'IH電磁爐': 'gas-stove-infrared.png',
  '內嵌式': 'gas-stove-built-in.png',
  '桌上型': 'gas-stove-desktop.png',
  '傳統瓦斯爐': 'gas-stove-2-burner.png',
  '不鏽鋼雙口爐': 'gas-stove-ss-2-burner.png',
  '商用瓦斯爐': 'gas-stove-commercial.png',

  // 熱水器
  '熱水器': 'instant-gas-water-heater.png',
  '瞬熱': 'instant-gas-water-heater.png',
  '儲熱': 'water-heater-storage.png',
  '恆溫': 'constant-temp-water-heater.png',
  '智能': 'smart-water-heater.png',
  '太陽能': 'solar-water-heater.png',
  '熱泵': 'heat-pump-water-heater.png',

  // 卡式爐/罐
  '卡式爐': 'cartridge-stove.png',
  '卡式瓦斯爐': 'cartridge-stove.png',
  '卡式瓦斯罐': 'mini-gas-canister.png',
  '小型罐': 'mini-gas-canister.png',

  // 烤肉
  '烤肉': 'gas-grill.png',
  'BBQ': 'gas-grill.png',
  '烤架': 'bbq-grill-rack.png',

  // 鍋具
  '炒鍋': 'chinese-wok.png',
  '中式炒鍋': 'chinese-wok.png',
  '不沾炒鍋': 'gas-frying-pan.png',
  '平底鍋': 'gas-frying-pan.png',
  '雙耳炒鍋': 'chinese-wok.png',
  '蒸鍋': 'gas-steamer.png',
  '壓力鍋': 'gas-pressure-cooker.png',
  '湯鍋': 'stainless-soup-pot.png',
  '高壓鍋': 'gas-pressure-cooker.png',

  // 安全設備
  '滅火器': 'small-fire-extinguisher.png',
  '滅火毯': 'fire-blanket.png',
  '偵測器': 'gas-detector.png',
  '一氧化碳': 'co-detector.png',
  '防護面具': 'emergency-mask.png',
  '警報器': 'gas-alarm.png',
  '遮陽棚': 'wind-shield.png',

  // 配件
  '軟管': 'gas-hose.png',
  '高壓管': 'high-pressure-pipe.png',
  '調整器': 'gas-regulator.png',
  '壓力表': 'gas-meter.png',
  '閥門': 'gas-valve.png',
  '接頭': 'gas-quick-connector.png',
  'L型彎頭': 'l-elbow-fitting.png',
  'T型接頭': 't-fitting.png',
  '四通接頭': '4-way-fitting.png',
  '水管接頭': 'hose-connector-set.png',

  // 戶外
  '戶外瓦斯燈': 'outdoor-gas-lamp.png',
  '戶外瓦斯爐': 'outdoor-gas-stove.png',
  '瓦斯串燈': 'gas-string-lights.png',
  '露營': 'camping-cookset.png',

  // 排油煙機
  '排油煙機': 'range-hood.png',
  '排油煙': 'range-hood.png',

  // 測量工具
  '電子秤': 'kitchen-scale.png',
  '計時器': 'kitchen-timer.png',
  '溫度計': 'food-thermometer.png',
  '量杯': 'measuring-cup-set.png',

  // 其他
  '瓦斯火鍋': 'gas-hotpot.png',
}

// 根據產品名稱獲取圖片 URL
function getProductImageUrl(productName: string, dbImageUrl: string | null): string | null {
  // 如果資料庫有圖片，直接使用
  if (dbImageUrl) return dbImageUrl

  // 嘗試根據名稱匹配
  const lowerName = productName.toLowerCase()

  for (const [keyword, filename] of Object.entries(IMAGE_MAP)) {
    if (lowerName.includes(keyword.toLowerCase())) {
      return `/products/${filename}`
    }
  }

  return null
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('default');
  const { addItem, setOpen } = useCartStore();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
      ]);

      if (productsRes.ok && categoriesRes.ok) {
        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();
        setProducts(productsData);
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    const imageUrl = getProductImageUrl(product.name, product.imageUrl)
    addItem({
      productId: product.id,
      quantity: 1,
      name: product.name,
      price: product.price,
      imageUrl: imageUrl || undefined,
    });
    setOpen(true);
  };

  // Get featured products
  const featuredProducts = products.filter(p => p.featured);

  // Filter products by category and search
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  // Apply search filter
  const searchedProducts = searchQuery
    ? filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : filteredProducts;

  // Apply sorting
  const sortedProducts = [...searchedProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'sales':
        return b.sales - a.sales;
      case 'rating':
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  const displayedProducts = sortedProducts.length;

  const stores = [
    {
      name: '花蓮九九瓦斯行',
      phone: '(03) 853-3999',
      address: '花蓮縣吉安鄉南昌路25號2F',
      hours: '週一至週日 08:00-20:00',
    },
    {
      name: '高銘瓦斯行',
      phone: '(03) 822-2106',
      address: '花蓮市中美路二街79號',
      hours: '週一至週日 08:00-21:00',
    },
    {
      name: '吉安站',
      phone: '(03) 853-3999',
      address: '花蓮縣吉安鄉南昌路25號',
      hours: '週一至週日 08:00-20:00',
    },
  ];

  const features = [
    {
      icon: <Flame className="h-6 w-6 text-orange-500" />,
      title: '安全可靠',
      description: '提供合格的瓦斯器具，通過嚴格安全檢測',
    },
    {
      icon: <Shield className="h-6 w-6 text-blue-500" />,
      title: '專業保固',
      description: '所有商品提供完善售後服務與保固',
    },
    {
      icon: <Truck className="h-6 w-6 text-green-500" />,
      title: '快速配送',
      description: '花蓮地區快速配送，專業安裝服務',
    },
    {
      icon: <Sparkles className="h-6 w-6 text-purple-500" />,
      title: '品牌保證',
      description: '提供知名品牌商品，品質有保障',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />

      <main className="flex-1">
        {/* Hero Section */}
        <section id="hero" className="py-20 px-4 bg-gradient-to-b from-orange-50/50 to-background">
          <div className="container mx-auto text-center space-y-8">
            <div className="inline-block">
              <Badge className="text-sm px-4 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200">
                🔥 花蓮地區瓦斯專家
              </Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              專業瓦斯器具
              <span className="block text-orange-600">安全第一 · 服務至上</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              提供花蓮地區最專業的瓦斯器具銷售與服務
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8" onClick={() => {
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                <ShoppingBag className="mr-2 h-5 w-5" />
                瀏覽商品
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => {
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                <Phone className="mr-2 h-5 w-5" />
                聯絡我們
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4 border-y">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-center mb-2">{feature.icon}</div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Gas Prices */}
        <section id="gas-prices" className="py-16 px-4 bg-gradient-to-b from-orange-50/50 to-background">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <Badge className="text-sm px-4 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 mb-4">
                💰 瓦斯價格
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">今日瓦斯價格</h2>
              <p className="text-muted-foreground text-lg">各站點瓦斯桶價格，提供您最優惠的選擇</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 美崙站 */}
              <Card className="hover:shadow-lg transition-shadow border-orange-200">
                <CardHeader className="bg-orange-50">
                  <CardTitle className="text-xl flex items-center justify-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-500" />
                    美崙站
                  </CardTitle>
                  <CardDescription className="text-center">花蓮市中美路二街79號</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {[
                      { size: '50公斤', price: 1850, unit: '桶' },
                      { size: '20公斤', price: 740, unit: '桶' },
                      { size: '16公斤', price: 630, unit: '桶' },
                      { size: '10公斤', price: 450, unit: '桶' },
                      { size: '4公斤', price: 250, unit: '桶' },
                    ].map((item) => (
                      <div key={item.size} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="font-medium">{item.size} {item.unit}</span>
                        <span className="text-xl font-bold text-orange-600">NT$ {item.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-6 bg-orange-500 hover:bg-orange-600">
                    <Phone className="mr-2 h-4 w-4" />
                    立即預訂 (03) 822-2106
                  </Button>
                </CardContent>
              </Card>

              {/* 吉安站 */}
              <Card className="hover:shadow-lg transition-shadow border-blue-200">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-xl flex items-center justify-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    吉安站
                  </CardTitle>
                  <CardDescription className="text-center">花蓮縣吉安鄉南昌路25號</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {[
                      { size: '20公斤', price: 720, unit: '桶' },
                      { size: '16公斤', price: 610, unit: '桶' },
                      { size: '10公斤', price: 430, unit: '桶' },
                      { size: '4公斤', price: 210, unit: '桶' },
                    ].map((item) => (
                      <div key={item.size} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="font-medium">{item.size} {item.unit}</span>
                        <span className="text-xl font-bold text-blue-600">NT$ {item.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-6 bg-blue-500 hover:bg-blue-600">
                    <Phone className="mr-2 h-4 w-4" />
                    立即預訂 (03) 853-3999
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                💡 價格僅供參考，實際價格以現場為準。歡迎來電諮詢最新優惠！
              </p>
            </div>
          </div>
        </section>

        {/* Stores */}
        <section id="about" className="py-20 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">關於我們</h2>
              <p className="text-muted-foreground text-lg">
                花蓮地區信賴的瓦斯器具專賣店
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
              {stores.map((store, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">{store.name}</CardTitle>
                    <CardDescription>專業瓦斯器具服務</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{store.phone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{store.address}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{store.hours}</span>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      <Phone className="mr-2 h-4 w-4" />
                      立即撥打
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="py-16 px-4 bg-gradient-to-b from-orange-50/50 to-background">
            <div className="container mx-auto">
              <div className="text-center mb-12">
                <Badge className="text-sm px-4 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 mb-4">
                  ⭐ 特色推薦
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">精選商品</h2>
                <p className="text-muted-foreground text-lg">熱銷商品，值得信賴</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {featuredProducts.slice(0, 6).map((product) => {
                  const imageUrl = getProductImageUrl(product.name, product.imageUrl)
                  return (
                  <Card key={product.id} className="flex flex-col hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="aspect-square bg-muted rounded-t-lg overflow-hidden relative">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ShoppingBag className="h-16 w-16 opacity-20" />
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2 bg-orange-500 text-white">
                        熱銷
                      </Badge>
                    </div>
                    <CardContent className="flex-1 flex flex-col pt-4 space-y-2">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h3 className="font-semibold text-lg line-clamp-2">{product.name}</h3>
                          {product.rating > 0 && (
                            <div className="flex items-center gap-1 text-yellow-500 text-xs flex-shrink-0">
                              <Star className="h-3 w-3 fill-current" />
                              <span className="font-medium">{product.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                        )}
                        {product.sales > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>已售 {product.sales}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="text-2xl font-bold text-orange-600">
                          NT$ {product.price.toLocaleString()}
                        </div>
                        <Button
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock === 0}
                          size="sm"
                        >
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          加入
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
                })}
              </div>
            </div>
          </section>
        )}

        {/* Products */}
        <section id="products" className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">商品展示</h2>
              <p className="text-muted-foreground text-lg">優質瓦斯器具，滿足您的需求</p>
            </div>

            {/* Search and Sort */}
            <div className="space-y-4 mb-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex-1 w-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="搜尋產品名稱..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="排序方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">預設排序</SelectItem>
                      <SelectItem value="price-asc">價格：低到高</SelectItem>
                      <SelectItem value="price-desc">價格：高到低</SelectItem>
                      <SelectItem value="sales">銷售量</SelectItem>
                      <SelectItem value="rating">評分</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {searchQuery && (
                <div className="text-sm text-muted-foreground text-center">
                  搜尋「{searchQuery}」找到 {displayedProducts} 個結果
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">商品分類</h3>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(null)}
                >
                  全部商品 ({products.length})
                </Button>
                {categories.map((category) => {
                  const count = products.filter(p => p.categoryId === category.id).length;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      {category.icon && <span className="mr-2">{category.icon}</span>}
                      {category.name}
                      <Badge variant="secondary" className="ml-2">
                        {count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground">載入中...</div>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">暫無商品</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedProducts.map((product) => {
                  const imageUrl = getProductImageUrl(product.name, product.imageUrl)
                  return (
                  <Card key={product.id} className="flex flex-col hover:shadow-lg transition-all">
                    <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ShoppingBag className="h-16 w-16 opacity-20" />
                        </div>
                      )}
                    </div>
                    <CardHeader className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="line-clamp-2 text-lg">{product.name}</CardTitle>
                        {product.rating > 0 && (
                          <div className="flex items-center gap-1 text-yellow-500 text-sm flex-shrink-0">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="font-medium">{product.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      {product.description && (
                        <CardDescription className="line-clamp-2">
                          {product.description}
                        </CardDescription>
                      )}
                      {product.sales > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                          <TrendingUp className="h-4 w-4" />
                          <span>已售 {product.sales} 件</span>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-orange-600">
                            NT$ {product.price.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            庫存: {product.stock}
                            {product.stock > 0 && product.stock < 5 && (
                              <Badge variant="destructive" className="text-xs px-1">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                庫存緊張
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock === 0}
                        >
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          加入購物車
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">聯絡我們</h2>
              <p className="text-muted-foreground text-lg">
                有任何問題嗎？歡迎隨時聯繫我們
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 rounded-lg bg-muted/50">
                    <Phone className="h-8 w-8 mx-auto mb-3 text-orange-500" />
                    <h3 className="font-semibold mb-2">電話諮詢</h3>
                    <p className="text-sm text-muted-foreground mb-2">歡迎撥打任一店鋪</p>
                    <Button variant="outline" size="sm" className="w-full">
                      立即撥打
                    </Button>
                  </div>

                  <div className="text-center p-6 rounded-lg bg-muted/50">
                    <MapPin className="h-8 w-8 mx-auto mb-3 text-blue-500" />
                    <h3 className="font-semibold mb-2">店鋪地址</h3>
                    <p className="text-sm text-muted-foreground mb-2">花蓮市多個服務點</p>
                    <Button variant="outline" size="sm" className="w-full">
                      查看地圖
                    </Button>
                  </div>

                  <div className="text-center p-6 rounded-lg bg-muted/50">
                    <Clock className="h-8 w-8 mx-auto mb-3 text-green-500" />
                    <h3 className="font-semibold mb-2">營業時間</h3>
                    <p className="text-sm text-muted-foreground mb-2">每日08:00-21:00</p>
                    <Button variant="outline" size="sm" className="w-full">
                      了解更多
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    三大瓦斯行聯合服務，為您提供最優質的瓦斯器具與服務
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Badge variant="secondary">花蓮九九瓦斯行</Badge>
                    <Badge variant="secondary">帝皇瓦斯行</Badge>
                    <Badge variant="secondary">高銘瓦斯行</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">瓦斯器具商城</h3>
              <p className="text-sm text-muted-foreground">
                花蓮地區專業瓦斯器具銷售與服務，提供安全可靠的產品與專業安裝服務。
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">合作店鋪</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>花蓮九九瓦斯行</li>
                <li>帝皇瓦斯行</li>
                <li>高銘瓦斯行</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">營業時間</h3>
              <p className="text-sm text-muted-foreground">
                週一至週日<br />
                08:00 - 21:00
              </p>
            </div>
          </div>
          <Separator className="mb-4" />
          <div className="text-center text-sm text-muted-foreground">
            © 2024 瓦斯器具商城. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating AI Assistant */}
      <FloatingAIAssistant />
    </div>
  );
}
