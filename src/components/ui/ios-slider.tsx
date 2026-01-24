/**
 * iOS 優化滑塊選擇器組件
 * 用於數值範圍選擇
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/ios-utils";

export interface IOSSliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  onChangeComplete?: (value: number) => void;
  disabled?: boolean;
  color?: "primary" | "success" | "warning" | "destructive";
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  label?: string;
  className?: string;
}

const colorStyles = {
  primary: "bg-blue-600",
  success: "bg-green-600",
  warning: "bg-orange-500",
  destructive: "bg-red-600",
};

const sizeStyles = {
  sm: { track: "h-1.5", thumb: "w-4 h-4" },
  md: { track: "h-2", thumb: "w-5 h-5" },
  lg: { track: "h-2.5", thumb: "w-6 h-6" },
};

export const IOSSlider: React.FC<IOSSliderProps> = ({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  onChangeComplete,
  disabled = false,
  color = "primary",
  size = "md",
  showValue = false,
  label,
  className,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleUpdate = (clientX: number) => {
    if (disabled || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const newPercentage = (clientX - rect.left) / rect.width;
    const newValue = min + newPercentage * (max - min);

    // 應步長取整
    const steppedValue =
      step === 0 ? newValue : Math.round(newValue / step) * step;
    const clampedValue = Math.min(max, Math.max(min, steppedValue));

    onChange(clampedValue);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    triggerHaptic("light");
    handleUpdate(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    triggerHaptic("light");
    handleUpdate(e.touches[0].clientX);
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleUpdate(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      handleUpdate(e.touches[0].clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      triggerHaptic("light");
      onChangeComplete?.(value);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, value, onChangeComplete]);

  return (
    <div className={cn("w-full", className)}>
      {/* 標籤和值 */}
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-3">
          {label && (
            <label className="text-base font-semibold text-gray-900">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-lg font-bold text-gray-900">
              {value}
            </span>
          )}
        </div>
      )}

      {/* 滑塊 */}
      <div
        ref={trackRef}
        className={cn(
          "relative w-full rounded-full",
          sizeStyles[size].track,
          disabled ? "bg-gray-200 cursor-not-allowed" : "bg-gray-200",
          !disabled && "cursor-pointer"
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* 進度條 */}
        <div
          className={cn(
            "absolute top-0 left-0 h-full rounded-full",
            colorStyles[color],
            disabled && "opacity-50"
          )}
          style={{ width: `${percentage}%` }}
        />

        {/* 滑塊按鈕 */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full shadow-lg",
            "bg-white border-2",
            sizeStyles[size].thumb,
            "transition-transform duration-150",
            isDragging ? "scale-110" : "hover:scale-105",
            disabled && "opacity-50 cursor-not-allowed",
            colorStyles[color].replace("bg-", "border-")
          )}
          style={{ left: `calc(${percentage}% - ${sizeStyles[size].thumb === "w-4 h-4" ? "8px" : sizeStyles[size].thumb === "w-6 h-6" ? "12px" : "10px"})` }}
        />
      </div>

      {/* 最小最大值 */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-gray-500">{min}</span>
        <span className="text-sm text-gray-500">{max}</span>
      </div>
    </div>
  );
};

IOSSlider.displayName = "IOSSlider";

/* ========================================
   iOS 範圍滑塊（雙滑塊）
   ======================================== */

export interface IOSRangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  onChangeComplete?: (value: [number, number]) => void;
  disabled?: boolean;
  color?: "primary" | "success" | "warning" | "destructive";
  showValues?: boolean;
  label?: string;
  className?: string;
}

export const IOSRangeSlider: React.FC<IOSRangeSliderProps> = ({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  onChangeComplete,
  disabled = false,
  color = "primary",
  showValues = false,
  label,
  className,
}) => {
  const [isDragging, setIsDragging] = React.useState<"min" | "max" | null>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const [minPercent, maxPercent] = [
    ((value[0] - min) / (max - min)) * 100,
    ((value[1] - min) / (max - min)) * 100,
  ];

  const handleUpdate = (clientX: number, which: "min" | "max") => {
    if (disabled || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const newPercentage = (clientX - rect.left) / rect.width;
    const newValue = min + newPercentage * (max - min);

    // 應步長取整
    const steppedValue =
      step === 0 ? newValue : Math.round(newValue / step) * step;
    const clampedValue = Math.min(max, Math.max(min, steppedValue));

    if (which === "min") {
      onChange([Math.min(clampedValue, value[1] - step), value[1]]);
    } else {
      onChange([value[0], Math.max(clampedValue, value[0] + step)]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, which: "min" | "max") => {
    if (disabled) return;
    setIsDragging(which);
    triggerHaptic("light");
    handleUpdate(e.clientX, which);
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleUpdate(e.clientX, isDragging);
    };

    const handleMouseUp = () => {
      setIsDragging(null);
      triggerHaptic("light");
      onChangeComplete?.(value);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, value, onChangeComplete]);

  return (
    <div className={cn("w-full", className)}>
      {/* 標籤和值 */}
      {(label || showValues) && (
        <div className="flex items-center justify-between mb-3">
          {label && (
            <label className="text-base font-semibold text-gray-900">
              {label}
            </label>
          )}
          {showValues && (
            <span className="text-lg font-bold text-gray-900">
              {value[0]} - {value[1]}
            </span>
          )}
        </div>
      )}

      {/* 範圍滑塊 */}
      <div
        ref={trackRef}
        className={cn(
          "relative w-full h-2 bg-gray-200 rounded-full",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* 選中範圍 */}
        <div
          className={cn(
            "absolute top-0 h-full rounded-full",
            colorStyles[color]
          )}
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />

        {/* 最小值滑塊 */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-lg",
            "bg-white border-2 border-blue-600",
            "cursor-pointer hover:scale-105 active:scale-110",
            "transition-transform duration-150",
            isDragging === "min" && "scale-110"
          )}
          style={{ left: `calc(${minPercent}% - 10px)` }}
          onMouseDown={(e) => handleMouseDown(e, "min")}
        />

        {/* 最大值滑塊 */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-lg",
            "bg-white border-2 border-blue-600",
            "cursor-pointer hover:scale-105 active:scale-110",
            "transition-transform duration-150",
            isDragging === "max" && "scale-110"
          )}
          style={{ left: `calc(${maxPercent}% - 10px)` }}
          onMouseDown={(e) => handleMouseDown(e, "max")}
        />
      </div>

      {/* 最小最大值 */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-gray-500">{min}</span>
        <span className="text-sm text-gray-500">{max}</span>
      </div>
    </div>
  );
};

IOSRangeSlider.displayName = "IOSRangeSlider";
