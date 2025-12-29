/**
 * iOS 原生風格開關 (Switch)
 * 採用 iOS 設計語言
 */

'use client'

import * as React from "react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/ios-utils";

export interface IOSSwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
}

const sizeClasses = {
  sm: 'w-11 h-6',
  md: 'w-14 h-8',
  lg: 'w-16 h-9',
};

const thumbSizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
};

const thumbTranslateClasses = {
  sm: 'translate-x-5',
  md: 'translate-x-6',
  lg: 'translate-x-7',
};

export const IOSSwitch = React.forwardRef<HTMLButtonElement, IOSSwitchProps>(
  (
    {
      checked = false,
      onCheckedChange,
      disabled = false,
      size = 'md',
      label,
      description,
      className,
      ...props
    },
    ref
  ) => {
    const [isChecked, setIsChecked] = React.useState(checked);

    React.useEffect(() => {
      setIsChecked(checked);
    }, [checked]);

    const handleToggle = () => {
      if (disabled) return;

      const newState = !isChecked;
      setIsChecked(newState);
      triggerHaptic('light');
      onCheckedChange?.(newState);
    };

    const switchComponent = (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "relative inline-flex flex-shrink-0",
          "cursor-pointer rounded-full",
          "border-2 border-transparent",
          "transition-colors duration-200 ease-in-out",
          "focus:outline-none focus:ring-3 focus:ring-orange-500/50",
          "ios-switch-active",
          sizeClasses[size],
          isChecked ? "bg-gradient-to-r from-orange-500 to-red-600" : "bg-gray-300",
          disabled && "opacity-50 cursor-not-allowed",
          !label && !description && className,
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none inline-block rounded-full bg-white shadow-lg",
            "transform transition-transform duration-200 ease-in-out",
            "ring-0",
            thumbSizeClasses[size],
            isChecked ? thumbTranslateClasses[size] : "translate-x-0"
          )}
        />
      </button>
    );

    // 如果有標籤或描述，包裝成容器
    if (label || description) {
      return (
        <div className={cn("flex items-center justify-between gap-4", className)}>
          <div className="flex-1">
            {label && (
              <label className={cn(
                "block font-medium",
                disabled ? "text-gray-400" : "text-gray-900",
                description ? "text-base" : "text-easy-body"
              )}>
                {label}
              </label>
            )}
            {description && (
              <p className={cn(
                "text-sm mt-0.5",
                disabled ? "text-gray-400" : "text-gray-500"
              )}>
                {description}
              </p>
            )}
          </div>
          {switchComponent}
        </div>
      );
    }

    return switchComponent;
  }
);

IOSSwitch.displayName = "IOSSwitch";

export default IOSSwitch;
