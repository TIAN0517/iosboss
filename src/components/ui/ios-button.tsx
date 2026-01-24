/**
 * iOS 優化按鈕組件（升級版）
 * 專為中年婦女設計：大字體、大觸控區域、清晰的反饋
 * 採用 iOS 18 原生風格設計，新增更多動畫效果
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/ios-utils";

const iOSButtonVariants = cva(
  // 基礎樣式 - 大字體、大觸控區域，iOS 18 原生風格
  "inline-flex items-center justify-center gap-2 whitespace-nowrap ios-radius-lg text-base font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-600 to-blue-700 text-white ios-button-3d active:scale-95 active:opacity-90 shadow-lg shadow-blue-500/30",
        destructive:
          "bg-gradient-to-r from-red-600 to-red-700 text-white ios-button-3d active:scale-95 active:opacity-90 shadow-lg shadow-red-500/30",
        outline:
          "ios-border-medium bg-white text-gray-900 hover:bg-gray-50 active:scale-95 active:opacity-90 ios-radius-md shadow-sm",
        secondary:
          "bg-gray-100 text-gray-900 hover:bg-gray-200 active:scale-95 active:opacity-90 shadow-sm",
        ghost: "hover:bg-gray-100/80 active:bg-gray-200/80 active:scale-98",
        link: "text-blue-600 underline-offset-4 hover:underline",
        success:
          "bg-gradient-to-r from-green-600 to-green-700 text-white ios-button-3d active:scale-95 active:opacity-90 shadow-lg shadow-green-500/30",
        warning:
          "bg-gradient-to-r from-orange-500 to-orange-600 text-white ios-button-3d active:scale-95 active:opacity-90 shadow-lg shadow-orange-500/30",
      },
      size: {
        default: "h-14 min-h-[56px] px-6 text-lg", // 大按鈕，適合觸控
        sm: "h-11 min-h-[44px] px-4 text-base", // 標準 iOS 按鈕大小
        lg: "h-16 min-h-[64px] px-8 text-xl", // 超大按鈕，重要操作
        icon: "h-12 w-12 min-h-[48px] min-w-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface IOSButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iOSButtonVariants> {
  asChild?: boolean;
  haptic?: boolean; // 是否啟用震動反饋
  loading?: boolean; // 加載狀態
  bounce?: boolean; // 是否啟用彈簧動畫
  glow?: boolean; // 是否啟用光暈效果
}

const IOSButton = React.forwardRef<HTMLButtonElement, IOSButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      haptic = true,
      loading = false,
      bounce = true,
      glow = false,
      children,
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const [isPressed, setIsPressed] = React.useState(false);
    const [showRipple, setShowRipple] = React.useState(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic && !disabled && !loading) {
        triggerHaptic("light");
      }

      // 觸發漣漪效果
      if (!disabled && !loading) {
        setShowRipple(true);
        setTimeout(() => setShowRipple(false), 600);
      }

      onClick?.(e);
    };

    const handleMouseDown = () => {
      if (!disabled && !loading) {
        setIsPressed(true);
      }
    };

    const handleMouseUp = () => {
      setIsPressed(false);
    };

    const handleMouseLeave = () => {
      setIsPressed(false);
    };

    return (
      <Comp
        className={cn(
          iOSButtonVariants({ variant, size, className }),
          // 彈簧動畫類
          bounce && !loading && "ios-bounce-scale",
          // 光暈效果
          glow && !disabled && "ios-pulse-glow",
          // 按下狀態
          isPressed && "scale-95",
          // 禁用狀態
          disabled && "cursor-not-allowed"
        )}
        ref={ref}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={disabled || loading}
        {...props}
      >
        {/* 漣漪效果 */}
        {showRipple && (
          <span className="absolute inset-0 ios-ripple-expand bg-current opacity-30 pointer-events-none" />
        )}

        {loading ? (
          <>
            {/* iOS 18 風格的載入動畫 */}
            <svg
              className="ios-circular-progress h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <circle
                className="ios-circular-progress-bg"
                cx="12"
                cy="12"
                r="10"
                fill="none"
              />
              <circle
                className="ios-circular-progress-fill"
                cx="12"
                cy="12"
                r="10"
                fill="none"
                strokeDasharray={62.83}
                strokeDashoffset={20}
              />
            </svg>
            處理中...
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

IOSButton.displayName = "IOSButton";

export { IOSButton, iOSButtonVariants };
