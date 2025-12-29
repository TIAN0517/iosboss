/**
 * iOS 原生風格下拉刷新組件
 * 採用 iOS 設計語言，流暢的刷新動畫
 */

'use client'

import * as React from "react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/ios-utils";
import { RefreshCw } from "lucide-react";

export interface IOSPullToRefreshProps {
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

export const IOSPullToRefresh: React.FC<IOSPullToRefreshProps> = ({
  onRefresh,
  isRefreshing: controlledIsRefreshing = false,
  children,
  threshold = 80,
  className,
}) => {
  const [localIsRefreshing, setLocalIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [touchStart, setTouchStart] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isRefreshing = controlledIsRefreshing || localIsRefreshing;
  const pullProgress = Math.min(pullDistance / threshold, 1);
  const rotation = pullProgress * 360;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setTouchStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStart;

    // 只在頂部且向下拉時響應
    if (containerRef.current?.scrollTop === 0 && diff > 0) {
      const newDistance = Math.min(diff * 0.5, threshold * 1.5);
      setPullDistance(newDistance);

      // 在達到臨界值時觸發震動
      if (newDistance >= threshold && pullDistance < threshold) {
        triggerHaptic('medium');
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      triggerHaptic('medium');
      setLocalIsRefreshing(true);

      try {
        await onRefresh();
      } finally {
        // 延遲重置，讓動畫完成
        setTimeout(() => {
          setLocalIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
    setTouchStart(0);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden ios-scroll-smooth",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 刷新指示器 */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none ios-transition-transform"
        style={{
          transform: `translateY(${Math.max(pullDistance - 40, -40)}px)`,
          height: '80px',
        }}
      >
        <div className="relative">
          {/* 背景圓圈 */}
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              "transition-colors duration-200",
              pullProgress >= 1
                ? "bg-blue-600"
                : "bg-gray-200"
            )}
          >
            {/* 刷新圖標 */}
            <RefreshCw
              className={cn(
                "w-6 h-6 transition-colors duration-200",
                pullProgress >= 1 ? "text-white" : "text-gray-500",
                isRefreshing && "ios-spin"
              )}
              style={{
                transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
              }}
            />
          </div>

          {/* 進度環 */}
          {pullProgress < 1 && pullDistance > 0 && (
            <svg
              className="absolute inset-0 w-12 h-12 -rotate-90"
              viewBox="0 0 48 48"
            >
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="rgba(59, 130, 246, 0.2)"
                strokeWidth="3"
              />
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="rgb(59, 130, 246)"
                strokeWidth="3"
                strokeDasharray={138.23}
                strokeDashoffset={138.23 * (1 - pullProgress)}
                strokeLinecap="round"
                className="transition-all duration-75"
              />
            </svg>
          )}
        </div>
      </div>

      {/* 內容區域 */}
      <div
        className="transition-transform duration-300"
        style={{
          transform: isRefreshing ? 'translateY(60px)' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * 下拉刷新 Hook
 */
export const usePullToRefresh = () => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const refresh = React.useCallback(async (
    refreshFn: () => Promise<void>
  ) => {
    setIsRefreshing(true);
    try {
      await refreshFn();
    } finally {
      // 延遲重置，讓動畫完成
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  }, []);

  return {
    isRefreshing,
    refresh,
  };
};

IOSPullToRefresh.displayName = "IOSPullToRefresh";

export default IOSPullToRefresh;
