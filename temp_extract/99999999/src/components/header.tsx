'use client';

import { useCartStore } from '@/store/cart';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ShoppingBag, Phone } from 'lucide-react';

export function Header() {
  const { getTotalItems, setOpen } = useCartStore();
  const totalItems = getTotalItems();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>菜單</SheetTitle>
              </SheetHeader>
              <nav className="mt-8 space-y-4">
                <MobileNavLink href="#hero">首頁</MobileNavLink>
                <MobileNavLink href="#about">關於我們</MobileNavLink>
                <MobileNavLink href="#products">商品</MobileNavLink>
                <MobileNavLink href="#contact">聯絡我們</MobileNavLink>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <span className="font-bold text-xl hidden sm:block">瓦斯器具商城</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6">
            <a href="#hero" className="text-sm font-medium hover:text-primary transition-colors">
              首頁
            </a>
            <a href="#about" className="text-sm font-medium hover:text-primary transition-colors">
              關於我們
            </a>
            <a href="#products" className="text-sm font-medium hover:text-primary transition-colors">
              商品
            </a>
            <a href="#contact" className="text-sm font-medium hover:text-primary transition-colors">
              聯絡我們
            </a>
          </nav>

          <Button
            variant="outline"
            size="icon"
            className="relative"
            onClick={() => setOpen(true)}
          >
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="block text-sm font-medium hover:text-primary transition-colors"
    >
      {children}
    </a>
  );
}
