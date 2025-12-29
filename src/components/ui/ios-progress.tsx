/**
 * iOS 優化進度條組件
 * 專為老年用戶設計：清晰、易讀
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface IOSProgressBarProps {
  value: number; // 0-100
  max?: number;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "success" | "warning" | "destructive";
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const colorStyles = {
  primary: "bg-gradient-to-r from-blue-500 to-blue-600",
  success: "bg-gradient-to-r from-green-500 to-green-600",
  warning: "bg-gradient-to-r from-orange-500 to-orange-600",
  destructive: "bg-gradient-to-r from-red-500 to-red-600",
};

export const IOSProgressBar: React.FC<IOSProgressBarProps> = ({
  value,
  max = 100,
  size = "md",
  color = "primary",
  showLabel = false,
  animated = false,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "ios-progress-bar w-full rounded-full overflow-hidden",
          sizeStyles[size],
          animated && "ios-progress-bar-animated"
        )}
      >
        <div
          className={cn(
            "ios-progress-bar-fill rounded-full",
            colorStyles[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-sm font-semibold text-gray-900 mt-2 text-right">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
};

IOSProgressBar.displayName = "IOSProgressBar";

/* ========================================
   iOS 圓形進度指示器
   ======================================== */

export interface IOSCircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: "primary" | "success" | "warning" | "destructive";
  showLabel?: boolean;
  className?: string;
}

export const IOSCircularProgress: React.FC<IOSCircularProgressProps> = ({
  value,
  size = 48,
  strokeWidth = 4,
  color = "primary",
  showLabel = false,
  className,
}) => {
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedValue / 100) * circumference;

  const colors = {
    primary: "text-blue-600",
    success: "text-green-600",
    warning: "text-orange-500",
    destructive: "text-red-600",
  };

  return (
    <div
      className={cn("ios-circular-progress inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 背景圓 */}
        <circle
          className="ios-circular-progress-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        {/* 進度圓 */}
        <circle
          className={cn("ios-circular-progress-fill", colors[color])}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-bold text-gray-900">
          {Math.round(normalizedValue)}%
        </span>
      )}
    </div>
  );
};

IOSCircularProgress.displayName = "IOSCircularProgress";
