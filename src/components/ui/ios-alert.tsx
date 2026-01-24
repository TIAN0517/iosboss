/**
 * iOS 原生風格警告對話框 (Alert)
 * 類似 iOS UIAlertController
 */

'use client'

import * as React from "react";
import { createRoot } from "react-dom/client";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/ios-utils";

export interface IOSAlertButton {
  label: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress: () => void;
  disabled?: boolean;
}

export interface IOSAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  buttons: IOSAlertButton[];
}

const buttonStyleClasses = {
  default: 'text-blue-600 font-semibold',
  cancel: 'text-blue-600 font-bold',
  destructive: 'text-red-600 font-semibold',
};

const buttonBgClasses = {
  default: 'hover:bg-gray-100 active:bg-gray-200',
  cancel: 'hover:bg-gray-100 active:bg-gray-200 font-bold',
  destructive: 'hover:bg-red-50 active:bg-red-100',
};

export const IOSAlert: React.FC<IOSAlertProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttons,
}) => {
  // ESC 鍵關閉（執行 cancel 按鈕或第一個按鈕）
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        const cancelButton = buttons.find(b => b.style === 'cancel') || buttons[0];
        if (cancelButton) {
          triggerHaptic('light');
          cancelButton.onPress();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, buttons]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center ios-safe-area p-4">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Alert 對話框 */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-in ios-spring duration-300 overflow-hidden">
        {/* 內容區域 */}
        <div className="px-6 py-6 text-center">
          {/* 標題 */}
          <h2 className="text-easy-heading font-bold text-gray-900 mb-2">
            {title}
          </h2>

          {/* 訊息 */}
          {message && (
            <p className="text-easy-body text-gray-600 leading-relaxed">
              {message}
            </p>
          )}
        </div>

        {/* 按鈕區域 */}
        <div className="flex flex-col">
          {buttons.length === 2 ? (
            // 兩個按鈕：水平排列
            <div className="flex border-t border-gray-200">
              {buttons.map((button, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (!button.disabled) {
                      triggerHaptic('light');
                      button.onPress();
                    }
                  }}
                  disabled={button.disabled}
                  className={cn(
                    "flex-1 py-4 text-center text-easy-body transition-colors ios-no-select",
                    buttonStyleClasses[button.style || 'default'],
                    buttonBgClasses[button.style || 'default'],
                    index === 0 && "border-r border-gray-200",
                    button.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {button.label}
                </button>
              ))}
            </div>
          ) : (
            // 一個或多個按鈕：垂直排列
            <>
              {buttons.map((button, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (!button.disabled) {
                      triggerHaptic('light');
                      button.onPress();
                    }
                  }}
                  disabled={button.disabled}
                  className={cn(
                    "w-full py-4 text-center text-easy-body transition-colors ios-no-select",
                    buttonStyleClasses[button.style || 'default'],
                    buttonBgClasses[button.style || 'default'],
                    index === 0 && buttons.length > 1 && "border-t border-gray-200",
                    index > 0 && "border-t border-gray-200",
                    button.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {button.label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

IOSAlert.displayName = "IOSAlert";

/**
 * 快捷函數：顯示確認對話框
 */
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const {
      title,
      message,
      confirmLabel = '確定',
      cancelLabel = '取消',
      destructive = false,
    } = options;

    const buttons: IOSAlertButton[] = [
      {
        label: cancelLabel,
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        label: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ];

    // 創建臨時容器
    const container = document.createElement('div');
    document.body.appendChild(container);

    // 渲染 Alert
    const root = createRoot(container);

    const handleClose = () => {
      root.unmount();
      document.body.removeChild(container);
    };

    root.render(
      <IOSAlert
        isOpen={true}
        onClose={handleClose}
        title={title}
        message={message}
        buttons={buttons.map(btn => ({
          ...btn,
          onPress: () => {
            btn.onPress();
            handleClose();
          },
        }))}
      />
    );
  });
}

/**
 * 快捷函數：顯示警告對話框
 */
export interface AlertOptions {
  title: string;
  message?: string;
  buttonLabel?: string;
}

export function showAlert(options: AlertOptions): Promise<void> {
  return new Promise((resolve) => {
    const {
      title,
      message,
      buttonLabel = '確定',
    } = options;

    const buttons: IOSAlertButton[] = [
      {
        label: buttonLabel,
        style: 'default',
        onPress: () => resolve(),
      },
    ];

    // 創建臨時容器
    const container = document.createElement('div');
    document.body.appendChild(container);

    // 渲染 Alert
    const root = createRoot(container);

    const handleClose = () => {
      root.unmount();
      document.body.removeChild(container);
    };

    root.render(
      <IOSAlert
        isOpen={true}
        onClose={handleClose}
        title={title}
        message={message}
        buttons={buttons.map(btn => ({
          ...btn,
          onPress: () => {
            btn.onPress();
            handleClose();
          },
        }))}
      />
    );
  });
}

export default IOSAlert;
