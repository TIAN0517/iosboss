/**
 * iOS 原生風格 Toast 通知組件
 * 採用 iOS 設計語言，支持多種樣式和位置
 */

'use client'

import * as React from "react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/ios-utils";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom' | 'center';

export interface IOSToastProps {
  message: string;
  variant?: ToastVariant;
  position?: ToastPosition;
  duration?: number;
  onClose?: () => void;
  showIcon?: boolean;
  showCloseButton?: boolean;
}

const variantConfig = {
  success: {
    bgColor: 'bg-green-600',
    textColor: 'text-white',
    icon: CheckCircle,
    haptic: 'success' as const,
  },
  error: {
    bgColor: 'bg-red-600',
    textColor: 'text-white',
    icon: XCircle,
    haptic: 'error' as const,
  },
  warning: {
    bgColor: 'bg-orange-500',
    textColor: 'text-white',
    icon: AlertCircle,
    haptic: 'warning' as const,
  },
  info: {
    bgColor: 'bg-blue-600',
    textColor: 'text-white',
    icon: Info,
    haptic: 'light' as const,
  },
};

const positionClasses = {
  top: 'top-4 ios-safe-area-top',
  bottom: 'bottom-4 ios-safe-area-bottom',
  center: 'top-1/2 -translate-y-1/2',
};

export const IOSToast: React.FC<IOSToastProps> = ({
  message,
  variant = 'info',
  position = 'top',
  duration = 3000,
  onClose,
  showIcon = true,
  showCloseButton = false,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isExiting, setIsExiting] = React.useState(false);
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  React.useEffect(() => {
    // 触發震動反饋
    triggerHaptic(config.haptic);

    // 進入動畫
    setIsVisible(true);

    // 自動關閉
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [config.haptic, duration]);

  const handleClose = () => {
    setIsExiting(true);
    triggerHaptic('light');

    // 等待退出動畫完成
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed left-4 right-4 z-[100] flex items-start gap-3",
        "px-5 py-4 rounded-2xl shadow-xl",
        config.bgColor,
        config.textColor,
        positionClasses[position],
        isExiting
          ? "ios-slide-fade-out"
          : "ios-spring-slide-in"
      )}
    >
      {/* 圖標 */}
      {showIcon && (
        <div className="flex-shrink-0 mt-0.5">
          <IconComponent className="w-6 h-6" strokeWidth={2.5} />
        </div>
      )}

      {/* 訊息文字 */}
      <p className="flex-1 text-base font-semibold leading-snug">
        {message}
      </p>

      {/* 關閉按鈕 */}
      {showCloseButton && (
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 -m-1 rounded-lg hover:bg-white/20 active:bg-white/30 transition-colors ios-no-select"
        >
          <X className="w-5 h-5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};

/**
 * Toast Hook - 管理 Toast 狀態
 */
export interface ToastOptions extends Omit<IOSToastProps, 'onClose'> {}

export const useToast = () => {
  const [toast, setToast] = React.useState<ToastOptions | null>(null);

  const showToast = React.useCallback((options: ToastOptions) => {
    setToast(options);
  }, []);

  const hideToast = React.useCallback(() => {
    setToast(null);
  }, []);

  // 快捷方法
  const success = React.useCallback((message: string, options?: Partial<ToastOptions>) => {
    showToast({ message, variant: 'success', ...options });
  }, [showToast]);

  const error = React.useCallback((message: string, options?: Partial<ToastOptions>) => {
    showToast({ message, variant: 'error', ...options });
  }, [showToast]);

  const warning = React.useCallback((message: string, options?: Partial<ToastOptions>) => {
    showToast({ message, variant: 'warning', ...options });
  }, [showToast]);

  const info = React.useCallback((message: string, options?: Partial<ToastOptions>) => {
    showToast({ message, variant: 'info', ...options });
  }, [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    success,
    error,
    warning,
    info,
  };
};

/**
 * Toast Provider 組件
 */
export const IOSToastProvider: React.FC<{
  children: React.ReactNode;
  toast: ToastOptions | null;
  onHide?: () => void;
}> = ({ children, toast, onHide }) => {
  return (
    <>
      {children}
      {toast && <IOSToast {...toast} onClose={onHide} />}
    </>
  );
};

IOSToast.displayName = "IOSToast";

export default IOSToast;
