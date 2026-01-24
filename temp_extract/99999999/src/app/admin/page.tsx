'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  Tag,
  Layers,
  AlertTriangle,
  TrendingUp,
  ArrowUpDown
} from 'lucide-react';

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
  status: string;
  categoryName?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Product Management
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Product | null>(null);

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple admin check (in production, use proper authentication)
    if (username === 'admin' && password === 'admin123') {
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert('賬號或密碼錯誤');
    }
  };

  // Fetch data
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
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate stats
  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.stock < 5).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    featured: products.filter(p => p.featured).length,
    totalSales: products.reduce((sum, p) => sum + p.sales, 0),
    avgRating: products.length > 0
      ? (products.reduce((sum, p) => sum + p.rating, 0) / products.length).toFixed(1)
      : '0',
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-background">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">瓦斯商城後台管理</CardTitle>
            <CardDescription>請登錄以進入管理系統</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">管理員賬號</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="輸入賬號"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="輸入密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                登錄
              </Button>
              <div className="text-xs text-muted-foreground text-center">
                <p>測試賬號：admin / admin123</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold">瓦斯商城後台管理</h1>
                <p className="text-xs text-muted-foreground">Mall Admin System</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
              退出登錄
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">商品總數</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">所有商品</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">庫存警告</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{stats.lowStock}</div>
              <p className="text-xs text-muted-foreground mt-1">庫存少於5件</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">缺貨商品</CardTitle>
              <Layers className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{stats.outOfStock}</div>
              <p className="text-xs text-muted-foreground mt-1">需要補貨</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">總銷售量</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.totalSales}</div>
              <p className="text-xs text-muted-foreground mt-1">累計銷售</p>
            </CardContent>
          </Card>
        </div>

        {/* Product Management */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              商品管理
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              庫存管理
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              分類管理
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>商品列表</CardTitle>
                    <CardDescription>管理所有商品信息</CardDescription>
                  </div>
                  <Button onClick={() => setEditingProduct({
                    id: '',
                    name: '',
                    description: '',
                    price: 0,
                    imageUrl: '',
                    stock: 0,
                    categoryId: categories[0]?.id || '',
                    featured: false,
                    rating: 0,
                    sales: 0,
                    status: 'active',
                  } as any)}>
                    <Plus className="h-4 w-4 mr-2" />
                    新增商品
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="搜尋商品名稱或描述..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="選擇分類" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全部分類</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Products Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>商品信息</TableHead>
                        <TableHead>分類</TableHead>
                        <TableHead>價格</TableHead>
                        <TableHead>庫存</TableHead>
                        <TableHead>評分</TableHead>
                        <TableHead>銷售量</TableHead>
                        <TableHead>狀態</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.imageUrl && (
                                <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="space-y-1">
                                <div className="font-medium max-w-xs truncate">{product.name}</div>
                                {product.featured && (
                                  <Badge variant="secondary" className="text-xs">精選</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{categories.find(c => c.id === product.categoryId)?.name || '-'}</TableCell>
                          <TableCell>NT$ {product.price.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              product.stock === 0 ? 'text-red-500' :
                              product.stock < 5 ? 'text-orange-500' :
                              'text-green-500'
                            }`}>
                              {product.stock}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-yellow-500">
                              <div className="h-3 w-3 bg-yellow-500 rounded-full" />
                              <span className="font-medium">{product.rating.toFixed(1)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{product.sales}</TableCell>
                          <TableCell>
                            <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                              {product.stock > 0 ? '在售' : '缺貨'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingProduct(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteDialog(product)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="text-sm text-muted-foreground">
                  共 {filteredProducts.length} 個商品
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>庫存管理</CardTitle>
                  <CardDescription>查看和管理商品庫存</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products.filter(p => p.stock < 5).length > 0 && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-700 mb-3">
                        <AlertTriangle className="h-5 w-5" />
                        <h3 className="font-semibold">庫存警告</h3>
                      </div>
                      <div className="space-y-2">
                        {products
                          .filter(p => p.stock < 5)
                          .sort((a, b) => a.stock - b.stock)
                          .slice(0, 10)
                          .map(product => (
                            <div key={product.id} className="flex items-center justify-between p-2 bg-white rounded">
                              <div className="flex items-center gap-3">
                                {product.imageUrl && (
                                  <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-muted-foreground">{categories.find(c => c.id === product.categoryId)?.name}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={`text-lg font-bold ${product.stock === 0 ? 'text-red-500' : 'text-orange-500'}`}>
                                  {product.stock}
                                </div>
                                <Button size="sm" variant="outline">
                                  <ArrowUpDown className="h-4 w-4 mr-1" />
                                  調整
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {products.filter(p => p.stock === 0).length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700 mb-3">
                        <AlertTriangle className="h-5 w-5" />
                        <h3 className="font-semibold">缺貨商品</h3>
                      </div>
                      <div className="space-y-2">
                        {products.filter(p => p.stock === 0).map(product => (
                          <div key={product.id} className="flex items-center justify-between p-2 bg-white rounded">
                            <div className="flex items-center gap-3">
                              {product.imageUrl && (
                                <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">{categories.find(c => c.id === product.categoryId)?.name}</div>
                              </div>
                            </div>
                            <Button size="sm">
                              立即補貨
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {products.filter(p => p.stock >= 5).length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">庫存正常商品</h3>
                      <div className="text-sm text-muted-foreground">
                        {products.filter(p => p.stock >= 5).length} 個商品庫存充足
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>分類管理</CardTitle>
                  <CardDescription>管理商品分類和圖標</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <Card key={category.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {category.icon && <span className="text-2xl">{category.icon}</span>}
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">商品數量</span>
                            <span className="font-medium">{products.filter(p => p.categoryId === category.id).length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">代碼</span>
                            <span className="font-medium text-xs">{category.slug}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Product Dialog */}
      {editingProduct && (
        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct.id ? '編輯商品' : '新增商品'}</DialogTitle>
              <DialogDescription>
                {editingProduct.id ? '修改商品信息' : '創建新商品'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>商品名稱 *</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>價格 *</Label>
                  <Input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>庫存 *</Label>
                  <Input
                    type="number"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>分類 *</Label>
                  <Select
                    value={editingProduct.categoryId}
                    onValueChange={(val) => setEditingProduct({ ...editingProduct, categoryId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>商品描述</Label>
                <Textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>商品圖片 URL</Label>
                <Input
                  value={editingProduct.imageUrl || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                  placeholder="/products/xxx.png"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.featured}
                    onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                  />
                  <span>設為精選商品</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProduct(null)}>
                取消
              </Button>
              <Button onClick={() => {
                alert('保存功能開發中 - API 實現需要後端支持');
                setEditingProduct(null);
              }}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialog && (
        <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>確認刪除</DialogTitle>
              <DialogDescription>
                確定要刪除商品「{deleteDialog.name}」嗎？此操作無法恢復。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialog(null)}>
                取消
              </Button>
              <Button variant="destructive" onClick={() => {
                alert('刪除功能開發中 - API 實現需要後端支持');
                setDeleteDialog(null);
              }}>
                確認刪除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
