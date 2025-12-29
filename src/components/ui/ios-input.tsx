/**
 * iOS 優化輸入框組件
 * 專為中年婦女設計：大字體、清晰的焦點狀態、自動適配鍵盤類型
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/ios-utils";

export interface IOSInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; // 標籤文字
  error?: string; // 錯誤訊息
  helperText?: string; // 說明文字
  leftIcon?: React.ReactNode; // 左側圖標
  rightIcon?: React.ReactNode; // 右側圖標
  onRightIconClick?: () => void; // 右側圖標點擊事件
}

const IOSInput = React.forwardRef<HTMLInputElement, IOSInputProps>(
  (
    {
      className,
      type = "text",
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      onRightIconClick,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId}`;
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className="w-full">
        {/* 標籤 */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-base font-semibold text-gray-900 mb-2"
          >
            {label}
          </label>
        )}

        {/* 輸入框容器 */}
        <div className="relative">
          {/* 左側圖標 */}
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* 輸入框 */}
          <input
            id={inputId}
            type={type}
            className={cn(
              // 基礎樣式 - 大字體、大觸控區域
              "w-full min-h-[56px] px-5 py-4 text-lg font-medium rounded-xl border-2",
              "placeholder:text-gray-400 placeholder:font-normal",
              "transition-all duration-200",
              // 焦點狀態
              "focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600",
              // 禁用狀態
              "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
              // 錯誤狀態
              error
                ? "border-red-500 focus:border-red-600 focus:ring-red-500/20"
                : "border-gray-300",
              // 左側圖標時增加左內距
              leftIcon && "pl-12",
              // 右側圖標時增加右內距
              rightIcon && "pr-12",
              className
            )}
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              // 可選的聚焦觸覺反饋（用於增強體驗）
              triggerHaptic('selection')
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {/* 右側圖標 */}
          {rightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors p-2 -m-2"
              tabIndex={-1}
            >
              {rightIcon}
            </button>
          )}

          {/* 焦點指示器（視覺反饋） */}
          {isFocused && !error && (
            <div className="absolute inset-0 rounded-xl border-2 border-blue-600 pointer-events-none -z-10 scale-105 opacity-50" />
          )}
        </div>

        {/* 說明文字 */}
        {helperText && !error && (
          <p className="mt-2 text-sm text-gray-600">{helperText}</p>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <p className="mt-2 text-sm font-semibold text-red-600 flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

IOSInput.displayName = "IOSInput";

export { IOSInput };

/**
 * iOS 優化文字區域組件
 */
export interface IOSTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCount?: boolean;
}

const IOSTextarea = React.forwardRef<HTMLTextAreaElement, IOSTextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      maxLength,
      showCount = false,
      id,
      value,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || `textarea-${generatedId}`;
    const [isFocused, setIsFocused] = React.useState(false);
    const currentLength = String(value || "").length;

    return (
      <div className="w-full">
        {/* 標籤 */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-base font-semibold text-gray-900 mb-2"
          >
            {label}
          </label>
        )}

        {/* 文字區域容器 */}
        <div className="relative">
          {/* 文字區域 */}
          <textarea
            id={inputId}
            maxLength={maxLength}
            className={cn(
              // 基礎樣式
              "w-full min-h-[120px] px-5 py-4 text-lg font-medium rounded-xl border-2 resize-none",
              "placeholder:text-gray-400 placeholder:font-normal",
              "transition-all duration-200",
              // 焦點狀態
              "focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600",
              // 禁用狀態
              "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
              // 錯誤狀態
              error
                ? "border-red-500 focus:border-red-600 focus:ring-red-500/20"
                : "border-gray-300",
              className
            )}
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              // 可選的聚焦觸覺反饋（用於增強體驗）
              triggerHaptic('selection')
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            value={value}
            {...props}
          />

          {/* 字數計數 */}
          {showCount && maxLength && (
            <div className="absolute bottom-3 right-3 text-sm text-gray-500 bg-white/90 px-2 py-1 rounded-md">
              {currentLength} / {maxLength}
            </div>
          )}
        </div>

        {/* 說明文字 */}
        {helperText && !error && (
          <p className="mt-2 text-sm text-gray-600">{helperText}</p>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <p className="mt-2 text-sm font-semibold text-red-600 flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

IOSTextarea.displayName = "IOSTextarea";

export { IOSTextarea };
