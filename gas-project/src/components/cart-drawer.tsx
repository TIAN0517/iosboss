'use client';

import { useCartStore, CartItem } from '@/store/cart';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { CheckoutDialog } from '@/components/checkout-dialog';

export function CartDrawer() {
  const { items, isOpen, setOpen, updateQuantity, removeItem, clearCart, getTotalPrice } = useCartStore();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleCheckout = () => {
    if (items.length === 0) {
      return;
    }
    setOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              購物車
            </SheetTitle>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <ShoppingBag className="h-16 w-16 opacity-20" />
              <p>購物車是空的</p>
              <Button variant="outline" onClick={() => setOpen(false)}>
                繼續購物
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="py-4 space-y-4">
                  {items.map((item) => (
                    <CartItemCard key={item.id} item={item} />
                  ))}
                </div>
              </ScrollArea>

              <Separator />

              <div className="space-y-4 pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>總計</span>
                  <span>NT$ {getTotalPrice().toLocaleString()}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (confirm('確定要清空購物車嗎？')) {
                        clearCart();
                      }
                    }}
                  >
                    清空
                  </Button>
                  <Button className="flex-1" onClick={handleCheckout}>
                    結帳
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  );
}

function CartItemCard({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
      {item.imageUrl && (
        <div className="relative h-20 w-20 overflow-hidden rounded-md bg-background">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="object-cover w-full h-full"
          />
        </div>
      )}

      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-start">
          <h4 className="font-medium line-clamp-2">{item.name}</h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => removeItem(item.productId)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          NT$ {item.price.toLocaleString()}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-12 text-center font-medium">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
