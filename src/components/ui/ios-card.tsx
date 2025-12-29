/**
 * iOS 優化卡片組件（升級版）
 * 專為中年婦女設計：清晰的陰影、易讀的間距、明確的觸控回饋
 * 採用 iOS 18 原生風格設計，新增更精緻的陰影和動畫
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useTouchFeedback, triggerHaptic } from "@/lib/ios-utils";

const IOSCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    pressable?: boolean; // 是否可點擊
    onPress?: () => void; // 點擊回調
    elevated?: boolean; // 是否使用更高的陰影
    glass?: boolean; // 是否使用毛玻璃效果
    animate?: boolean; // 是否啟用滑入動畫
  }
>(({ className, pressable = false, onPress, elevated = false, glass = false, animate = false, children, ...props }, ref) => {
  const { elementRef, touchFeedbackProps } = useTouchFeedback();
  const [isPressed, setIsPressed] = React.useState(false);

  return (
    <div
      ref={ref}
      className={cn(
        "ios-card-18 bg-white text-gray-950 border-2 border-gray-100 overflow-hidden transition-all duration-300",
        elevated && "ios-card-shadow-elevated",
        glass && "ios-glass-18",
        pressable && (isPressed ? "scale-[0.97]" : "cursor-pointer active:scale-[0.97]"),
        animate && "ios-slide-fade-up",
        className
      )}
      onClick={() => {
        if (pressable && onPress) {
          triggerHaptic("light");
          onPress();
        }
      }}
      onMouseDown={() => pressable && setIsPressed(true)}
      onMouseUp={() => pressable && setIsPressed(false)}
      onMouseLeave={() => pressable && setIsPressed(false)}
      onTouchStart={() => pressable && setIsPressed(true)}
      onTouchEnd={() => pressable && setIsPressed(false)}
      {...touchFeedbackProps}
      {...props}
    >
      {children}
    </div>
  );
});

IOSCard.displayName = "IOSCard";

const IOSCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
IOSCardHeader.displayName = "IOSCardHeader";

const IOSCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-bold leading-none tracking-tight text-gray-900",
      className
    )}
    {...props}
  />
));
IOSCardTitle.displayName = "IOSCardTitle";

const IOSCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-lg text-gray-600", className)}
    {...props}
  />
));
IOSCardDescription.displayName = "IOSCardDescription";

const IOSCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
IOSCardContent.displayName = "IOSCardContent";

const IOSCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
IOSCardFooter.displayName = "IOSCardFooter";

export { IOSCard, IOSCardHeader, IOSCardFooter, IOSCardTitle, IOSCardDescription, IOSCardContent };

/**
 * iOS 優化列表項目組件
 * 採用 iOS 原生列表樣式
 */
export interface IOSListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string | number;
  badgeColor?: "blue" | "green" | "red" | "orange" | "gray";
  withArrow?: boolean; // 顯示右側箭頭
  danger?: boolean; // 危險操作樣式（紅色）
}

const IOSListItem = React.forwardRef<HTMLDivElement, IOSListItemProps>(
  (
    {
      title,
      subtitle,
      leftIcon,
      rightIcon,
      onClick,
      disabled = false,
      badge,
      badgeColor = "blue",
      withArrow = true,
      danger = false,
    },
    ref
  ) => {
    const badgeColors = {
      blue: "bg-blue-600 text-white",
      green: "bg-green-600 text-white",
      red: "bg-red-600 text-white",
      orange: "bg-orange-500 text-white",
      gray: "bg-gray-200 text-gray-700",
    };
    const [isPressed, setIsPressed] = React.useState(false);

    return (
      <div
        ref={ref}
        onClick={() => {
          if (!disabled && onClick) {
            triggerHaptic("light");
            onClick();
          }
        }}
        className={cn(
          // 基礎樣式 - iOS 原生列表樣式
          "flex items-center gap-4 min-h-[72px] px-5 py-4",
          "ios-separator last:border-0",
          "bg-white transition-all duration-200",
          // 互動狀態
          !disabled && onClick && (isPressed ? "bg-gray-100" : "cursor-pointer active:bg-gray-100"),
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onMouseDown={() => !disabled && onClick && setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => !disabled && onClick && setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
      >
        {/* 左側圖標 */}
        {leftIcon && (
          <div className={cn("flex-shrink-0", danger ? "text-red-500" : "text-gray-600")}>
            {leftIcon}
          </div>
        )}

        {/* 主要內容 */}
        <div className="flex-1 min-w-0">
          {/* 標題 */}
          <p className={cn("text-lg font-semibold truncate", danger ? "text-red-600" : "text-gray-900")}>
            {title}
          </p>

          {/* 副標題 */}
          {subtitle && (
            <p className="text-base text-gray-600 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* 徽章 */}
        {badge && (
          <div
            className={cn(
              "flex-shrink-0 px-3 py-1 rounded-full text-sm font-bold",
              badgeColors[badgeColor]
            )}
          >
            {badge}
          </div>
        )}

        {/* 右側圖標或箭頭 */}
        {rightIcon ? (
          <div className="flex-shrink-0 text-gray-400">
            {rightIcon}
          </div>
        ) : withArrow && onClick ? (
          <svg
            className="w-6 h-6 text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        ) : null}
      </div>
    );
  }
);

IOSListItem.displayName = "IOSListItem";

export { IOSListItem };

/**
 * iOS 優化列表容器組件
 */
export interface IOSListProps {
  children: React.ReactNode;
  className?: string;
  divided?: boolean;
}

const IOSList = React.forwardRef<HTMLDivElement, IOSListProps>(
  ({ children, className, divided = true }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white rounded-2xl shadow-lg shadow-gray-200/50 overflow-hidden",
        divided && "divide-y divide-gray-200",
        className
      )}
    >
      {children}
    </div>
  )
);

IOSList.displayName = "IOSList";

export { IOSList };
