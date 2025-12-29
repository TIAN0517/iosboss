/**
 * iOS 優化骨架屏組件
 * 用於加載狀態的占位符
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/* ========================================
   基礎骨架屏元素
   ======================================== */

export interface IOSSkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

const variantStyles = {
  text: "rounded-full",
  circular: "rounded-full",
  rectangular: "rounded-xl",
};

const animationStyles = {
  pulse: "animate-pulse",
  wave: "ios-skeleton",
  none: "",
};

export const IOSSkeleton: React.FC<IOSSkeletonProps> = ({
  className,
  variant = "rectangular",
  width,
  height,
  animation = "wave",
}) => {
  return (
    <div
      className={cn(
        "ios-skeleton",
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{ width, height }}
    />
  );
};

IOSSkeleton.displayName = "IOSSkeleton";

/* ========================================
   iOS 卡片骨架屏
   ======================================== */

export interface IOSCardSkeletonProps {
  showAvatar?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  lines?: number; // 附加文本行數
  className?: string;
}

export const IOSCardSkeleton: React.FC<IOSCardSkeletonProps> = ({
  showAvatar = true,
  showTitle = true,
  showSubtitle = true,
  lines = 2,
  className,
}) => {
  return (
    <div className={cn("p-5 bg-white rounded-2xl border-2 border-gray-100", className)}>
      <div className="flex items-start gap-4">
        {/* 頭像骨架 */}
        {showAvatar && (
          <IOSSkeleton variant="circular" width={48} height={48} />
        )}

        {/* 內容骨架 */}
        <div className="flex-1 space-y-3">
          {/* 標題骨架 */}
          {showTitle && <IOSSkeleton variant="text" height={24} width="60%" />}

          {/* 副標題骨架 */}
          {showSubtitle && <IOSSkeleton variant="text" height={16} width="40%" />}

          {/* 文本行骨架 */}
          {Array.from({ length: lines }).map((_, i) => (
            <IOSSkeleton
              key={i}
              variant="text"
              height={16}
              width={i === lines - 1 ? "80%" : "100%"}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

IOSCardSkeleton.displayName = "IOSCardSkeleton";

/* ========================================
   iOS 列表骨架屏
   ======================================== */

export interface IOSListSkeletonProps {
  count?: number;
  showAvatar?: boolean;
  className?: string;
}

export const IOSListSkeleton: React.FC<IOSListSkeletonProps> = ({
  count = 5,
  showAvatar = true,
  className,
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-gray-100"
        >
          {/* 頭像 */}
          {showAvatar && <IOSSkeleton variant="circular" width={48} height={48} />}

          {/* 內容 */}
          <div className="flex-1 space-y-2">
            <IOSSkeleton variant="text" height={20} width="40%" />
            <IOSSkeleton variant="text" height={16} width="70%" />
          </div>

          {/* 右側箭頭 */}
          <IOSSkeleton variant="rectangular" width={24} height={24} />
        </div>
      ))}
    </div>
  );
};

IOSListSkeleton.displayName = "IOSListSkeleton";

/* ========================================
   iOS 表格骨架屏
   ======================================== */

export interface IOSTableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export const IOSTableSkeleton: React.FC<IOSTableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {/* 表頭骨架 */}
      {showHeader && (
        <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
          {Array.from({ length: columns }).map((_, i) => (
            <IOSSkeleton key={i} variant="text" height={20} width="100%" />
          ))}
        </div>
      )}

      {/* 表格行骨架 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 bg-white rounded-xl border-2 border-gray-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <IOSSkeleton key={colIndex} variant="text" height={18} width="100%" />
          ))}
        </div>
      ))}
    </div>
  );
};

IOSTableSkeleton.displayName = "IOSTableSkeleton";

/* ========================================
   iOS Dashboard 骨架屏
   ======================================== */

export interface IOSDashboardSkeletonProps {
  className?: string;
}

export const IOSDashboardSkeleton: React.FC<IOSDashboardSkeletonProps> = ({
  className,
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* 歡迎區域骨架 */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl p-8 text-white">
        <div className="space-y-4">
          <IOSSkeleton variant="text" height={32} width="60%" className="!bg-white/30" />
          <IOSSkeleton variant="text" height={20} width="40%" className="!bg-white/20" />
          <div className="flex gap-4 mt-6">
            <IOSSkeleton variant="rectangular" width={120} height={48} className="!bg-white/20" />
            <IOSSkeleton variant="rectangular" width={120} height={48} className="!bg-white/20" />
          </div>
        </div>
      </div>

      {/* 統計卡片骨架 */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-5 bg-white rounded-2xl border-2 border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <IOSSkeleton variant="circular" width={48} height={48} />
              <IOSSkeleton variant="rectangular" width={60} height={24} />
            </div>
            <IOSSkeleton variant="text" height={16} width="40%" />
            <IOSSkeleton variant="text" height={28} width="60%" />
          </div>
        ))}
      </div>

      {/* 列表骨架 */}
      <IOSListSkeleton count={4} />
    </div>
  );
};

IOSDashboardSkeleton.displayName = "IOSDashboardSkeleton";
