/**
 * iOS 優化頭像組件
 * 支援圖片、首字母、在線狀態
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

export interface IOSAvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  color?: "primary" | "success" | "warning" | "destructive" | "gray";
  rounded?: boolean; // 是否完全圓形（默認是方形圓角）
  status?: "online" | "offline" | "away" | "busy";
  className?: string;
}

const sizeStyles = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-xl",
  "2xl": "w-20 h-20 text-2xl",
};

const colorStyles = {
  primary: "bg-gradient-to-br from-blue-500 to-blue-600 text-white",
  success: "bg-gradient-to-br from-green-500 to-green-600 text-white",
  warning: "bg-gradient-to-br from-orange-500 to-orange-600 text-white",
  destructive: "bg-gradient-to-br from-red-500 to-red-600 text-white",
  gray: "bg-gradient-to-br from-gray-400 to-gray-500 text-white",
};

const statusColors = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  away: "bg-yellow-500",
  busy: "bg-red-500",
};

export const IOSAvatar: React.FC<IOSAvatarProps> = ({
  src,
  alt,
  initials,
  size = "md",
  color = "primary",
  rounded = true,
  status,
  className,
}) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div className={cn("relative inline-flex", className)}>
      {/* 頭像主體 */}
      <div
        className={cn(
          "flex items-center justify-center",
          "font-bold",
          "overflow-hidden",
          "shadow-md",
          "transition-transform duration-200",
          "active:scale-95",
          sizeStyles[size],
          rounded ? "rounded-full" : "rounded-2xl",
          !src || imageError ? colorStyles[color] : "bg-gray-200"
        )}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || "Avatar"}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <User className="w-1/2 h-1/2" />
        )}
      </div>

      {/* 在線狀態指示器 */}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0",
            "rounded-full border-2 border-white",
            "w-3 h-3",
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};

IOSAvatar.displayName = "IOSAvatar";

/* ========================================
   iOS 頭像群組（多個頭像疊加）
   ======================================== */

export interface IOSAvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  spacing?: "sm" | "md" | "lg";
  className?: string;
}

const spacingStyles = {
  sm: "-space-x-2",
  md: "-space-x-3",
  lg: "-space-x-4",
};

export const IOSAvatarGroup: React.FC<IOSAvatarGroupProps> = ({
  children,
  max = 5,
  size = "md",
  spacing = "md",
  className,
}) => {
  const avatars = React.Children.toArray(children);
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={cn("flex flex-row-reverse", spacingStyles[spacing], className)}>
      {/* 剩餘數量徽章 */}
      {remainingCount > 0 && (
        <div
          className={cn(
            "flex items-center justify-center",
            "rounded-full font-bold text-white",
            "bg-gray-500 shadow-md",
            sizeStyles[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
      {/* 可見頭像 */}
      {visibleAvatars.map((avatar, index) => (
        <div key={index} className="relative">
          {avatar}
        </div>
      ))}
    </div>
  );
};

IOSAvatarGroup.displayName = "IOSAvatarGroup";
