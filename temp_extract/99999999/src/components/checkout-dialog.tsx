'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cart';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ShoppingBag, Check, X, Percent } from 'lucide-react';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutDialog({ open, onOpenChange }: CheckoutDialogProps) {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    note: '',
  });

  const verifyCoupon = async () => {
    if (!couponCode.trim()) {
      return;
    }

    setVerifyingCoupon(true);
    try {
      const response = await fetch('/api/coupons/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode,
          amount: getTotalPrice(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.valid) {
        toast({
          title: '優惠券無效',
          description: result.message || '請檢查優惠券代碼是否正確',
          variant: 'destructive',
        });
        return;
      }

      setAppliedCoupon(result.coupon);
      setDiscountAmount(result.discount);
      toast({
        title: '優惠券已套用',
        description: `已優惠 NT$ ${result.discount.toLocaleString()}`,
      });
    } catch (error) {
      console.error('Coupon verification error:', error);
      toast({
        title: '優惠券驗證失敗',
        description: '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setVerifyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.customerName || !formData.phone || !formData.address) {
      toast({
        title: '請填寫完整資訊',
        description: '姓名、電話和地址為必填欄位',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items,
          couponCode: appliedCoupon?.code,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const order = await response.json();

      toast({
        title: '訂單建立成功！',
        description: `訂單編號：${order.orderNumber}${appliedCoupon ? '（已使用優惠券）' : ''}`,
      });

      clearCart();
      onOpenChange(false);
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: '訂單建立失敗',
        description: '請稍後再試或聯絡客服',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            結帳
          </DialogTitle>
          <DialogDescription>
            請填寫您的聯絡資訊以完成訂單
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold">訂單商品</h3>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name} x {item.quantity}</span>
                <span>NT$ {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>商品小計</span>
                <span>NT$ {getTotalPrice().toLocaleString()}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-sm text-green-600">
                  <div className="flex items-center gap-1">
                    <Percent className="h-4 w-4" />
                    <span>優惠券優惠 ({appliedCoupon.code})</span>
                  </div>
                  <span>-NT$ {discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg">
                <span>總計</span>
                <span className="text-orange-600">NT$ {(getTotalPrice() - discountAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Coupon Section */}
          <div className="space-y-2">
            <Label htmlFor="coupon">優惠券代碼（選填）</Label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-sm">{appliedCoupon.name}</div>
                    <div className="text-xs text-muted-foreground">已優惠 NT$ {discountAmount.toLocaleString()}</div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeCoupon}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="coupon"
                  placeholder="輸入優惠券代碼"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={verifyCoupon}
                  disabled={verifyingCoupon || !couponCode.trim()}
                >
                  {verifyingCoupon ? '驗證中...' : '套用'}
                </Button>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                placeholder="請輸入姓名"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">電話 *</Label>
              <Input
                id="phone"
                placeholder="請輸入電話號碼"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">配送地址 *</Label>
              <Input
                id="address"
                placeholder="請輸入配送地址"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">備註（選填）</Label>
              <Textarea
                id="note"
                placeholder="有任何特殊需求嗎？"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              取消
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? '處理中...' : '確認訂單'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
