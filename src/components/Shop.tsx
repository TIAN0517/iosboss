'use client';

import { useState, useEffect, useCallback } from 'react';
import { BrandIcon } from './BrandIcon';
import { IOSButton } from './ui/ios-button';
import { IOSCard } from './ui/ios-card';
import { Input } from './ui/ios-input';
import { triggerHaptic } from '@/lib/ios-utils';
import {
  useCart,
  useAddToCart,
  useUpdateCart,
  useRemoveFromCart,
  useCheckout,
} from '@/hooks/useShop';
import { useToast } from '@/hooks/useToast';

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

interface CheckoutFormData {
  contactName: string;
  contactPhone: string;
  deliveryAddress: string;
  deliveryTime: 'morning' | 'afternoon' | 'evening' | null;
  note: string;
  paymentMethod: 'cash' | 'transfer' | 'linepay';
  couponCode: string;
}

// 生成臨時 sessionId
function generateSessionId() {
  if (typeof window === 'undefined') return '';
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
}

export function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderComplete, setShowOrderComplete] = useState(false);
  const [newOrderNo, setNewOrderNo] = useState<string | null>(null);

  // 表單狀態
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormData>({
    contactName: '',
    contactPhone: '',
    deliveryAddress: '',
    deliveryTime: null,
    note: '',
    paymentMethod: 'cash',
    couponCode: '',
  });

  const sessionId = typeof window !== 'undefined' ? generateSessionId() : '';
  const { showSuccess, showError, showLoading, dismissToast } = useToast();

  // 使用 React Query hooks
  const { data: cartData, isLoading: cartLoading, refetch: refetchCart } = useCart({ sessionId });
  const addToCartMutation = useAddToCart();
  const updateCartMutation = useUpdateCart();
  const removeFromCartMutation = useRemoveFromCart();
  const checkoutMutation = useCheckout();

  // 獲取產品和分類資料
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/shop/products'),
        fetch('/api/shop/categories'),
      ]);

      if (productsRes.ok && categoriesRes.ok) {
        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();
        setProducts(productsData);
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('無法載入資料:', error);
      showError('無法載入資料');
    } finally {
      setLoading(false);
    }
  };

  // 加入購物車
  const handleAddToCart = useCallback(
    (product: Product) => {
      triggerHaptic('light');

      addToCartMutation.mutate(
        {
          productId: product.id,
          quantity: 1,
          sessionId,
        },
        {
          onSuccess: () => {
            showSuccess('已加入購物車');
            refetchCart();
            setShowCart(true);
          },
          onError: (error: Error) => {
            showError(error.message || '加入購物車失敗');
          },
        }
      );
    },
    [sessionId, addToCartMutation, showSuccess, showError, refetchCart]
  );

  // 更新數量
  const handleUpdateQuantity = useCallback(
    (cartItemId: string, delta: number) => {
      const item = cartData?.items.find((i) => i.id === cartItemId);
      if (!item) return;

      const newQuantity = Math.max(0, item.quantity + delta);

      if (newQuantity === 0) {
        removeFromCartMutation.mutate(cartItemId, {
          onSuccess: () => {
            showSuccess('已移除商品');
            refetchCart();
          },
        });
      } else {
        updateCartMutation.mutate(
          { cartItemId, quantity: newQuantity },
          {
            onSuccess: () => {
              refetchCart();
            },
          }
        );
      }
    },
    [cartData, updateCartMutation, removeFromCartMutation, showSuccess, refetchCart]
  );

  // 切換勾選狀態
  const handleToggleChecked = useCallback(
    (cartItemId: string, checked: boolean) => {
      updateCartMutation.mutate(
        { cartItemId, checked: !checked },
        {
          onSuccess: () => {
            refetchCart();
          },
        }
      );
    },
    [updateCartMutation, refetchCart]
  );

  // 計算總金額
  const cartTotal = cartData?.items
    .filter((item) => item.checked)
    .reduce((sum, item) => sum + item.product.price * item.quantity, 0) || 0;

  const cartCount = cartData?.items
    .filter((item) => item.checked)
    .reduce((sum, item) => sum + item.quantity, 0) || 0;

  // 結帳處理
  const handleCheckout = () => {
    if (cartData?.items.filter((i) => i.checked).length === 0) {
      showError('請先選擇要結帳的商品');
      return;
    }
    setShowCheckout(true);
    setShowCart(false);
  };

  const handleSubmitCheckout = () => {
    // 驗證表單
    if (!checkoutForm.contactName.trim()) {
      showError('請輸入聯絡人姓名');
      return;
    }
    if (!checkoutForm.contactPhone.trim()) {
      showError('請輸入聯絡電話');
      return;
    }
    if (!checkoutForm.deliveryAddress.trim()) {
      showError('請輸入配送地址');
      return;
    }

    const toastId = showLoading('處理訂單中...');

    checkoutMutation.mutate(
      {
        sessionId,
        ...checkoutForm,
      },
      {
        onSuccess: (data) => {
          dismissToast(toastId);
          showSuccess(`訂單建立成功！訂單編號：${data.orderNo}`);
          setNewOrderNo(data.orderNo);
          setShowCheckout(false);
          setShowOrderComplete(true);
          setCheckoutForm({
            contactName: '',
            contactPhone: '',
            deliveryAddress: '',
            deliveryTime: null,
            note: '',
            paymentMethod: 'cash',
            couponCode: '',
          });
          refetchCart();
        },
        onError: (error: Error) => {
          dismissToast(toastId);
          showError(error.message || '結帳失敗');
        },
      }
    );
  };

  // Filter products
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  const searchedProducts = searchQuery
    ? filteredProducts.filter((p) =>
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
                disabled={product.stock === 0 || addToCartMutation.isPending}
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
              {cartLoading ? (
                <p className="text-center text-gray-500 py-8">載入中...</p>
              ) : cartData?.items.length === 0 ? (
                <p className="text-center text-gray-500 py-8">購物車是空的</p>
              ) : (
                <div className="space-y-4">
                  {cartData?.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                        item.checked ? 'bg-gray-50' : 'bg-gray-100 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleChecked(item.id, item.checked)}
                        className="w-5 h-5 text-orange-500 rounded"
                      />
                      {item.product.imageUrl && (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-easy-body font-semibold">
                          {item.product.name}
                        </h3>
                        <p className="text-easy-caption text-gray-500">
                          NT${item.product.price}
                        </p>
                        <p className="text-xs text-gray-400">
                          庫存: {item.product.inventory?.quantity || 0}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center"
                          disabled={item.quantity >= (item.product.inventory?.quantity || 0)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartData && cartData.items.filter((i) => i.checked).length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between text-easy-body mb-4">
                  <span>總計:</span>
                  <span className="font-bold text-orange-500">NT${cartTotal}</span>
                </div>
                <IOSButton
                  onClick={handleCheckout}
                  className="w-full"
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? '處理中...' : '去結帳'}
                </IOSButton>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCheckout(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-easy-heading font-bold">結帳資訊</h2>
              <button onClick={() => setShowCheckout(false)} className="p-2">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 聯絡人資訊 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  聯絡人姓名 *
                </label>
                <Input
                  value={checkoutForm.contactName}
                  onChange={(e) =>
                    setCheckoutForm({ ...checkoutForm, contactName: e.target.value })
                  }
                  placeholder="請輸入姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  聯絡電話 *
                </label>
                <Input
                  value={checkoutForm.contactPhone}
                  onChange={(e) =>
                    setCheckoutForm({ ...checkoutForm, contactPhone: e.target.value })
                  }
                  placeholder="09xx-xxx-xxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配送地址 *
                </label>
                <Input
                  value={checkoutForm.deliveryAddress}
                  onChange={(e) =>
                    setCheckoutForm({ ...checkoutForm, deliveryAddress: e.target.value })
                  }
                  placeholder="請輸入完整配送地址"
                />
              </div>

              {/* 送貨時間 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  送貨時段
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'morning', label: '上午' },
                    { value: 'afternoon', label: '下午' },
                    { value: 'evening', label: '晚上' },
                  ].map((time) => (
                    <button
                      key={time.value}
                      onClick={() =>
                        setCheckoutForm({
                          ...checkoutForm,
                          deliveryTime: time.value as any,
                        })
                      }
                      className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                        checkoutForm.deliveryTime === time.value
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-700 border-gray-200'
                      }`}
                    >
                      {time.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 付款方式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  付款方式
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'cash', label: '貨到付款' },
                    { value: 'transfer', label: '銀行轉帳' },
                    { value: 'linepay', label: 'LINE Pay' },
                  ].map((method) => (
                    <button
                      key={method.value}
                      onClick={() =>
                        setCheckoutForm({
                          ...checkoutForm,
                          paymentMethod: method.value as any,
                        })
                      }
                      className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                        checkoutForm.paymentMethod === method.value
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-700 border-gray-200'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 優惠券 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  優惠券
                </label>
                <div className="flex gap-2">
                  <Input
                    value={checkoutForm.couponCode}
                    onChange={(e) =>
                      setCheckoutForm({ ...checkoutForm, couponCode: e.target.value.toUpperCase() })
                    }
                    placeholder="輸入優惠券代碼"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  輸入優惠碼可享折扣優惠
                </p>
              </div>

              {/* 備註 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  備註
                </label>
                <textarea
                  value={checkoutForm.note}
                  onChange={(e) =>
                    setCheckoutForm({ ...checkoutForm, note: e.target.value })
                  }
                  placeholder="有什麼想告訴我們的？"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white resize-none"
                  rows={3}
                />
              </div>

              {/* 訂單摘要 */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>商品金額</span>
                  <span>NT${cartTotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>運費</span>
                  <span>{cartTotal >= 1000 ? '免運' : 'NT$100'}</span>
                </div>
                {checkoutForm.couponCode && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>折扣</span>
                    <span>-NT$0</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>總計</span>
                  <span className="text-orange-500">
                    NT${cartTotal >= 1000 ? cartTotal : cartTotal + 100}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t">
              <IOSButton
                onClick={handleSubmitCheckout}
                className="w-full"
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? '處理中...' : '確認訂單'}
              </IOSButton>
            </div>
          </div>
        </div>
      )}

      {/* Order Complete Modal */}
      {showOrderComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-easy-heading font-bold mb-2">訂單建立成功！</h2>
            <p className="text-gray-600 mb-4">
              您的訂單編號為：
              <br />
              <span className="text-lg font-mono font-bold text-orange-500">
                {newOrderNo}
              </span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              我們會盡快為您處理，感謝您的訂購！
            </p>
            <IOSButton
              onClick={() => {
                setShowOrderComplete(false);
                setNewOrderNo(null);
              }}
              className="w-full"
            >
              繼續購物
            </IOSButton>
          </div>
        </div>
      )}
    </div>
  );
}
