/**
 * iOS 智能輸入框組件
 * 支持自動完成、智能驗證、輸入建議
 */

'use client'

import * as React from "react";
import { cn } from "@/lib/utils";
import { triggerHaptic, triggerFeedback } from "@/lib/ios-utils";
import { Check, AlertCircle, Eye, EyeOff, X, ChevronDown } from "lucide-react";

export type ValidationRule = {
  validate: (value: string) => boolean;
  message: string;
};

export type SuggestionItem = {
  value: string;
  label?: string;
  icon?: React.ReactNode;
};

export interface IOSSmartInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'autoComplete'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;

  // 驗證功能
  validationRules?: ValidationRule[];
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  validateOnBlur?: boolean;

  // 自動完成功能
  suggestions?: SuggestionItem[];
  onSuggestionSelect?: (value: string) => void;
  showSuggestionsOnFocus?: boolean;

  // 密碼顯示切換
  showPasswordToggle?: boolean;

  // 清除按鈕
  showClearButton?: boolean;
  onClear?: () => void;

  // 字數限制
  maxLength?: number;
  showCount?: boolean;
}

const IOSSmartInput = React.forwardRef<HTMLInputElement, IOSSmartInputProps>(
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
      validationRules = [],
      onValidationChange,
      validateOnBlur = true,
      suggestions = [],
      onSuggestionSelect,
      showSuggestionsOnFocus = false,
      showPasswordToggle = false,
      showClearButton = false,
      onClear,
      maxLength,
      showCount = false,
      id,
      value,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId}`;
    const [isFocused, setIsFocused] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = React.useState<SuggestionItem[]>([]);
    const [selectedIndex, setSelectedIndex] = React.useState(-1);
    const [validationErrors, setValidationErrors] = React.useState<string[]>([]);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const suggestionsRef = React.useRef<HTMLUListElement>(null);

    // 合併 refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    // 驗證邏輯
    const validate = React.useCallback((val: string): boolean => {
      const errors: string[] = [];

      for (const rule of validationRules) {
        if (!rule.validate(val)) {
          errors.push(rule.message);
        }
      }

      setValidationErrors(errors);
      onValidationChange?.(errors.length === 0, errors);

      return errors.length === 0;
    }, [validationRules, onValidationChange]);

    // 處理值變化
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      // 過濾建議
      if (newValue.length > 0) {
        const filtered = suggestions.filter((s) =>
          s.value.toLowerCase().includes(newValue.toLowerCase()) ||
          s.label?.toLowerCase().includes(newValue.toLowerCase())
        );
        setFilteredSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } else {
        setShowSuggestions(false);
      }

      setSelectedIndex(-1);
      onChange?.(e);

      // 即時驗證（如果不是 blur 驗證模式）
      if (!validateOnBlur && validationRules.length > 0) {
        validate(newValue);
      }
    };

    // 處理焦點
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);

      if (showSuggestionsOnFocus && suggestions.length > 0) {
        setFilteredSuggestions(suggestions);
        setShowSuggestions(true);
      }

      onFocus?.(e);
    };

    // 處理失焦
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);

      // 延遲關閉建議，允許點擊建議項
      setTimeout(() => {
        setShowSuggestions(false);
      }, 200);

      if (validateOnBlur && validationRules.length > 0) {
        validate(e.target.value);
      }

      onBlur?.(e);
    };

    // 處理鍵盤導航
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            selectSuggestion(filteredSuggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    };

    // 選擇建議
    const selectSuggestion = (suggestion: SuggestionItem) => {
      triggerFeedback('selection', 'click');
      const syntheticEvent = {
        target: { value: suggestion.value },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange?.(syntheticEvent);
      setShowSuggestions(false);
      onSuggestionSelect?.(suggestion.value);
      inputRef.current?.focus();
    };

    // 清除輸入
    const handleClear = () => {
      triggerHaptic('light');
      onClear?.();
      const syntheticEvent = {
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(syntheticEvent);
      inputRef.current?.focus();
    };

    // 顯示/隱藏密碼
    const togglePasswordVisibility = () => {
      triggerHaptic('light');
      setShowPassword((prev) => !prev);
    };

    // 計算輸入類型
    const inputType = type === 'password' && showPassword ? 'text' : type;
    const currentValue = String(value || '');
    const hasValue = currentValue.length > 0;
    const hasError = error || validationErrors.length > 0;
    const isValid = !hasError && hasValue && validationRules.length > 0;
    const showValidationIcon = validationRules.length > 0 && hasValue;

    // 滾動選中的建議到視圖
    React.useEffect(() => {
      if (selectedIndex >= 0 && suggestionsRef.current) {
        const selectedElement = suggestionsRef.current.children[
          selectedIndex
        ] as HTMLElement;
        if (selectedElement) {
          selectedElement.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [selectedIndex]);

    return (
      <div className="w-full relative">
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
            ref={inputRef}
            id={inputId}
            type={inputType}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            className={cn(
              // 基礎樣式
              "w-full min-h-[56px] px-5 py-4 text-lg font-medium rounded-xl border-2",
              "placeholder:text-gray-400 placeholder:font-normal",
              "transition-all duration-200",
              // 焦點狀態
              "focus:outline-none focus:ring-4 focus:ring-blue-500/20",
              // 禁用狀態
              "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
              // 狀態樣式
              hasError
                ? "border-red-500 focus:border-red-600 focus:ring-red-500/20"
                : isValid
                ? "border-green-500 focus:border-green-600 focus:ring-green-500/20"
                : "border-gray-300 focus:border-blue-600",
              // 左側圖標時增加左內距
              leftIcon && "pl-12",
              // 右側圖標區域預留空間
              (rightIcon || showPasswordToggle || showClearButton || showValidationIcon) &&
                "pr-24",
              className
            )}
            {...props}
          />

          {/* 右側圖標區域 */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* 驗證狀態圖標 */}
            {showValidationIcon && !isFocused && (
              <div className={cn(
                "p-1.5 rounded-lg",
                isValid ? "text-green-600" : "text-red-600"
              )}>
                {isValid ? (
                  <Check className="w-5 h-5" strokeWidth={2.5} />
                ) : (
                  <AlertCircle className="w-5 h-5" strokeWidth={2.5} />
                )}
              </div>
            )}

            {/* 清除按鈕 */}
            {showClearButton && hasValue && !props.disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 active:text-gray-800 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" strokeWidth={2.5} />
              </button>
            )}

            {/* 密碼顯示切換 */}
            {showPasswordToggle && type === 'password' && hasValue && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 active:text-gray-800 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" strokeWidth={2.5} />
                ) : (
                  <Eye className="w-5 h-5" strokeWidth={2.5} />
                )}
              </button>
            )}

            {/* 自定義右側圖標 */}
            {rightIcon && (
              <button
                type="button"
                onClick={onRightIconClick}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 active:text-gray-800 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                {rightIcon}
              </button>
            )}
          </div>

          {/* 焦點指示器 */}
          {isFocused && !hasError && (
            <div className="absolute inset-0 rounded-xl border-2 border-blue-600 pointer-events-none -z-10 scale-105 opacity-50" />
          )}
        </div>

        {/* 自動完成建議 */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul
            ref={suggestionsRef}
            className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-60 overflow-auto ios-card-shadow-elevated ios-spring-slide-in"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <li
                key={suggestion.value}
                onClick={() => selectSuggestion(suggestion)}
                className={cn(
                  "px-5 py-3 cursor-pointer flex items-center gap-3 transition-colors",
                  "hover:bg-gray-50 active:bg-gray-100",
                  index === selectedIndex && "bg-blue-50",
                  index === 0 && "rounded-t-xl",
                  index === filteredSuggestions.length - 1 && "rounded-b-xl"
                )}
              >
                {suggestion.icon && (
                  <span className="flex-shrink-0 text-gray-400">
                    {suggestion.icon}
                  </span>
                )}
                <span className="flex-1 text-base font-medium text-gray-900">
                  {suggestion.label || suggestion.value}
                </span>
                {index === selectedIndex && (
                  <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                )}
              </li>
            ))}
          </ul>
        )}

        {/* 說明文字和驗證錯誤 */}
        {helperText && !hasError && (
          <p className="mt-2 text-sm text-gray-600">{helperText}</p>
        )}

        {hasError && (
          <div className="mt-2 space-y-1">
            {error && (
              <p className="text-sm font-semibold text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </p>
            )}
            {validationErrors.map((err, i) => (
              <p
                key={i}
                className="text-sm font-semibold text-red-600 flex items-center gap-1"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {err}
              </p>
            ))}
          </div>
        )}

        {/* 字數計數 */}
        {showCount && maxLength && (
          <div className="absolute bottom-3 right-3 text-sm text-gray-500 bg-white/90 px-2 py-1 rounded-md">
            {currentValue.length} / {maxLength}
          </div>
        )}
      </div>
    );
  }
);

IOSSmartInput.displayName = "IOSSmartInput";

export { IOSSmartInput };

/**
 * 常用驗證規則
 */
export const ValidationRules = {
  required: (message = '此欄位為必填'): ValidationRule => ({
    validate: (value) => value.trim().length > 0,
    message,
  }),

  email: (message = '請輸入有效的電子郵件'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    message,
  }),

  phone: (message = '請輸入有效的電話號碼'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return /^[\d\s\-\+\(\)]{7,}$/.test(value);
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => value.length >= min,
    message: message || `至少需要 ${min} 個字元`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => value.length <= max,
    message: message || `最多 ${max} 個字元`,
  }),

  pattern: (regex: RegExp, message = '格式不正確'): ValidationRule => ({
    validate: (value) => regex.test(value),
    message,
  }),

  custom: (validator: (value: string) => boolean, message: string): ValidationRule => ({
    validate: validator,
    message,
  }),
};
