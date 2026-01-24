/**
 * iOS 優化徽章組件
 * 用於通知數量、狀態標示等
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface IOSBadgeProps {
  children?: React.ReactNode;
  count?: number;
  max?: number;
  color?: "primary" | "success" | "warning" | "destructive" | "gray";
  size?: "sm" | "md" | "lg";
  dot?: boolean; // 只顯示小圓點
  className?: string;
}

const colorStyles = {
  primary: "bg-blue-600 text-white",
  success: "bg-green-600 text-white",
  warning: "bg-orange-500 text-white",
  destructive: "bg-red-600 text-white",
  gray: "bg-gray-200 text-gray-700",
};

const sizeStyles = {
  sm: "px-1.5 py-0.5 text-[10px] min-w-[16px] h-4",
  md: "px-2 py-0.5 text-xs min-w-[20px] h-5",
  lg: "px-2.5 py-1 text-sm min-w-[24px] h-6",
};

export const IOSBadge: React.FC<IOSBadgeProps> = ({
  children,
  count,
  max = 99,
  color = "primary",
  size = "md",
  dot = false,
  className,
}) => {
  if (dot) {
    return (
      <span
        className={cn(
          "inline-flex rounded-full bg-red-500",
          "w-2.5 h-2.5",
          "animate-pulse",
          className
        )}
      />
    );
  }

  const displayCount = count !== undefined && count > max ? `${max}+` : count;
  const content = children !== undefined ? children : displayCount;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "rounded-full font-bold",
        "leading-none",
        colorStyles[color],
        sizeStyles[size],
        className
      )}
    >
      {content}
    </span>
  );
};

IOSBadge.displayName = "IOSBadge";

/* ========================================
   iOS 狀態徽章（帶圖標）
   ======================================== */

export interface IOSStatusBadgeProps {
  status: "online" | "offline" | "away" | "busy";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const statusConfig = {
  online: { color: "bg-green-500", label: "線上" },
  offline: { color: "bg-gray-400", label: "離線" },
  away: { color: "bg-yellow-500", label: "暫離" },
  busy: { color: "bg-red-500", label: "忙碌" },
};

const statusSizes = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
};

export const IOSStatusBadge: React.FC<IOSStatusBadgeProps> = ({
  status,
  showLabel = false,
  size = "md",
  className,
}) => {
  const config = statusConfig[status];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "rounded-full",
          statusSizes[size],
          config.color,
          "animate-pulse"
        )}
      />
      {showLabel && (
        <span className="text-sm font-medium text-gray-700">{config.label}</span>
      )}
    </div>
  );
};

IOSStatusBadge.displayName = "IOSStatusBadge";
