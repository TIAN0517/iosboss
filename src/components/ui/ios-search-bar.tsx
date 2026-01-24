/**
 * iOS 優化搜索欄組件
 * 模仿 iOS 原生搜索欄樣式和行為
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, X, Mic } from "lucide-react";
import { triggerHaptic } from "@/lib/ios-utils";

export interface IOSSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  showVoiceButton?: boolean;
  onVoiceClick?: () => void;
  autoFocus?: boolean;
  className?: string;
}

export const IOSSearchBar: React.FC<IOSSearchBarProps> = ({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = "搜尋...",
  disabled = false,
  showVoiceButton = false,
  onVoiceClick,
  autoFocus = false,
  className,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const handleClear = () => {
    triggerHaptic("light");
    onChange("");
    onClear?.();
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    triggerHaptic("medium");
    onSearch?.(value);
  };

  return (
    <div
      className={cn(
        "relative",
        "transition-all duration-300",
        isFocused && "scale-[1.02]"
      )}
    >
      {/* iOS 搜索欄容器 */}
      <div
        className={cn(
          "flex items-center gap-3",
          "min-h-[52px] px-4",
          "bg-gray-100",
          "rounded-xl",
          "border-2",
          "transition-all duration-200",
          isFocused ? "border-blue-500 bg-white" : "border-transparent",
          disabled && "opacity-50 cursor-not-allowed bg-gray-50"
        )}
      >
        {/* 搜索圖標 */}
        <Search
          className={cn(
            "w-5 h-5 flex-shrink-0",
            isFocused ? "text-blue-600" : "text-gray-400",
            disabled && "text-gray-300"
          )}
        />

        {/* 輸入框 */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            "flex-1 bg-transparent border-none outline-none",
            "text-lg font-medium",
            "placeholder:text-gray-400",
            "disabled:cursor-not-allowed"
          )}
        />

        {/* 清除按鈕 */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              "flex-shrink-0 p-1",
              "rounded-full",
              "text-gray-400 hover:text-gray-600",
              "hover:bg-gray-200",
              "transition-colors",
              "ios-no-select"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* 語音按鈕 */}
        {showVoiceButton && !disabled && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onVoiceClick?.();
            }}
            className={cn(
              "flex-shrink-0 p-2",
              "rounded-full",
              "text-gray-400 hover:text-blue-600",
              "hover:bg-gray-200",
              "transition-colors",
              "ios-no-select"
            )}
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* iOS 鍵盤搜尋按鈕 */}
      {isFocused && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => {
              triggerHaptic("light");
              setIsFocused(false);
              inputRef.current?.blur();
            }}
            className="px-4 py-2 text-base font-semibold text-blue-600 ios-no-select"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold ios-no-select active:scale-95 transition-transform"
          >
            搜尋
          </button>
        </div>
      )}

      {/* 焦點時的外部光暈 */}
      {isFocused && (
        <div className="absolute -inset-0.5 bg-blue-500/20 rounded-xl -z-10 blur-sm transition-opacity" />
      )}
    </div>
  );
};

IOSSearchBar.displayName = "IOSSearchBar";

/* ========================================
   iOS 搜索結果列表
   ======================================== */

export interface IOSSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: () => void;
}

export interface IOSSearchResultsProps {
  results: IOSSearchResult[];
  query: string;
  onSelect?: (result: IOSSearchResult) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

export const IOSSearchResults: React.FC<IOSSearchResultsProps> = ({
  results,
  query,
  onSelect,
  emptyMessage = "找不到符合的結果",
  loading = false,
  className,
}) => {
  if (loading) {
    return (
      <div className={cn("py-4", className)}>
        <IOSSkeleton variant="text" height={60} />
        <IOSSkeleton variant="text" height={60} />
        <IOSSkeleton variant="text" height={60} />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div
        className={cn(
          "py-12 text-center",
          "bg-white rounded-2xl border-2 border-gray-100",
          className
        )}
      >
        <p className="text-lg text-gray-500">{emptyMessage}</p>
        <p className="text-sm text-gray-400 mt-2">試試其他關鍵字</p>
      </div>
    );
  }

  // 高亮搜尋關鍵字
  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-orange-200 text-orange-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className={cn("py-2", className)}>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {results.map((result, index) => (
          <button
            key={result.id}
            onClick={() => {
              triggerHaptic("light");
              onSelect?.(result);
              result.action?.();
            }}
            className={cn(
              "w-full flex items-center gap-4",
              "px-5 py-4",
              "border-b-2 border-gray-100 last:border-0",
              "hover:bg-gray-50 active:bg-gray-100",
              "transition-colors",
              "ios-no-select"
            )}
          >
            {/* 圖標 */}
            {result.icon && (
              <div className="flex-shrink-0 text-gray-400">
                {result.icon}
              </div>
            )}

            {/* 內容 */}
            <div className="flex-1 text-left">
              <p className="text-lg font-semibold text-gray-900">
                {highlightText(result.title, query)}
              </p>
              {result.subtitle && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {highlightText(result.subtitle, query)}
                </p>
              )}
            </div>

            {/* 箭頭 */}
            <svg
              className="w-5 h-5 text-gray-400 flex-shrink-0"
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
          </button>
        ))}
      </div>
    </div>
  );
};

IOSSearchResults.displayName = "IOSSearchResults";
