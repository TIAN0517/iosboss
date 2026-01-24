/**
 * iOS 優化標籤組件
 * 用於分類、篩選、標籤等
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { triggerHaptic } from "@/lib/ios-utils";

export interface IOSChipProps {
  children: React.ReactNode;
  color?: "primary" | "success" | "warning" | "destructive" | "gray" | "outline";
  size?: "sm" | "md" | "lg";
  removable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  leftIcon?: React.ReactNode;
  className?: string;
}

const colorStyles = {
  primary: "bg-blue-100 text-blue-700 border-blue-200",
  success: "bg-green-100 text-green-700 border-green-200",
  warning: "bg-orange-100 text-orange-700 border-orange-200",
  destructive: "bg-red-100 text-red-700 border-red-200",
  gray: "bg-gray-100 text-gray-700 border-gray-200",
  outline: "bg-white text-gray-700 border-gray-300",
};

const selectedColorStyles = {
  primary: "bg-blue-600 text-white border-blue-700",
  success: "bg-green-600 text-white border-green-700",
  warning: "bg-orange-500 text-white border-orange-600",
  destructive: "bg-red-600 text-white border-red-700",
  gray: "bg-gray-700 text-white border-gray-800",
  outline: "bg-gray-100 text-gray-900 border-gray-300",
};

const sizeStyles = {
  sm: "h-7 px-2.5 text-xs gap-1",
  md: "h-9 px-3 text-sm gap-1.5",
  lg: "h-11 px-4 text-base gap-2",
};

export const IOSChip: React.FC<IOSChipProps> = ({
  children,
  color = "gray",
  size = "md",
  removable = false,
  selected = false,
  onClick,
  onRemove,
  leftIcon,
  className,
}) => {
  const baseStyles = cn(
    "inline-flex items-center",
    "border-2",
    "rounded-full",
    "font-semibold",
    "transition-all duration-200",
    "ios-no-select",
    sizeStyles[size],
    selected ? selectedColorStyles[color] : colorStyles[color],
    onClick && "cursor-pointer hover:shadow-md active:scale-95"
  );

  return (
    <div
      className={cn(baseStyles, className)}
      onClick={() => {
        if (onClick) {
          triggerHaptic("light");
          onClick();
        }
      }}
    >
      {/* 左側圖標 */}
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}

      {/* 內容 */}
      <span className="flex-shrink-0">{children}</span>

      {/* 移除按鈕 */}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic("light");
            onRemove?.();
          }}
          className="flex-shrink-0 hover:opacity-70 active:scale-90 transition-all"
        >
          <X className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5"} />
        </button>
      )}
    </div>
  );
};

IOSChip.displayName = "IOSChip";

/* ========================================
   iOS 標籤組（多選篩選器）
   ======================================== */

export interface IOSChipGroupProps {
  options: { label: string; value: string; icon?: React.ReactNode }[];
  value: string[];
  onChange: (value: string[]) => void;
  color?: "primary" | "success" | "warning" | "destructive" | "gray";
  size?: "sm" | "md" | "lg";
  multiple?: boolean;
  className?: string;
}

export const IOSChipGroup: React.FC<IOSChipGroupProps> = ({
  options,
  value,
  onChange,
  color = "primary",
  size = "md",
  multiple = true,
  className,
}) => {
  const handleToggle = (optionValue: string) => {
    triggerHaptic("light");

    if (multiple) {
      if (value.includes(optionValue)) {
        onChange(value.filter((v) => v !== optionValue));
      } else {
        onChange([...value, optionValue]);
      }
    } else {
      onChange([optionValue]);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const isSelected = value.includes(option.value);

        return (
          <IOSChip
            key={option.value}
            color={isSelected ? color : "outline"}
            size={size}
            selected={isSelected}
            onClick={() => handleToggle(option.value)}
            leftIcon={option.icon}
          >
            {option.label}
          </IOSChip>
        );
      })}
    </div>
  );
};

IOSChipGroup.displayName = "IOSChipGroup";
