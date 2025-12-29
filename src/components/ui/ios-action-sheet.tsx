/**
 * iOS 原生風格 Action Sheet 組件
 * 採用 iOS 設計語言，從底部滑入的操作選單
 */

'use client'

import * as React from "react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/ios-utils";
import { X } from "lucide-react";

export interface ActionSheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface IOSActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
  showCancelButton?: boolean;
  cancelButtonLabel?: string;
}

export const IOSActionSheet: React.FC<IOSActionSheetProps> = ({
  isOpen,
  onClose,
  title,
  message,
  actions,
  showCancelButton = true,
  cancelButtonLabel = "取消",
}) => {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      // 防止背景滾動
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleActionPress = (action: ActionSheetAction) => {
    if (action.disabled) return;

    triggerHaptic('light');
    handleClose();
    // 延遲執行動作，等待動畫完成
    setTimeout(() => {
      action.onPress();
    }, 300);
  };

  const handleClose = () => {
    setIsClosing(true);
    triggerHaptic('light');

    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center ios-safe-area"
      onClick={handleBackdropClick}
    >
      {/* 背景遮罩 */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40",
          isClosing ? "animate-out fade-out duration-300" : "animate-in fade-in duration-200"
        )}
      />

      {/* Action Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "relative w-full max-w-lg mx-4 mb-4",
          "animate-in",
          isClosing ? "ios-slide-fade-out" : "ios-spring-slide-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題和訊息 */}
        {(title || message) && (
          <div className="bg-white rounded-t-3xl px-5 pt-5 pb-4">
            {title && (
              <h3 className="text-easy-heading font-bold text-gray-900 text-center mb-1">
                {title}
              </h3>
            )}
            {message && (
              <p className="text-base text-gray-600 text-center">
                {message}
              </p>
            )}
          </div>
        )}

        {/* 操作按鈕列表 */}
        <div className="bg-white rounded-b-3xl overflow-hidden ios-card-shadow-elevated">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionPress(action)}
              disabled={action.disabled}
              className={cn(
                "w-full px-5 py-4 text-left text-base font-semibold",
                "flex items-center gap-3 ios-transition-colors",
                "active:bg-gray-100",
                "border-t border-gray-200 first:border-t-0",
                action.destructive
                  ? "text-red-600 active:bg-red-50"
                  : "text-gray-900",
                action.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* 圖標 */}
              {action.icon && (
                <span className={cn(
                  "flex-shrink-0",
                  action.destructive ? "text-red-600" : "text-gray-600"
                )}>
                  {action.icon}
                </span>
              )}

              {/* 標籤 */}
              <span className="flex-1">{action.label}</span>
            </button>
          ))}

          {/* 取消按鈕 */}
          {showCancelButton && (
            <>
              <div className="h-2 bg-gray-100" />
              <button
                onClick={handleClose}
                className="w-full px-5 py-4 text-left text-base font-semibold text-blue-600 active:bg-gray-100 ios-transition-colors"
              >
                {cancelButtonLabel}
              </button>
            </>
          )}
        </div>

        {/* 拖拽手柄指示器 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
      </div>
    </div>
  );
};

/**
 * Action Sheet Hook
 */
export const useActionSheet = () => {
  const [actionSheet, setActionSheet] = React.useState<{
    props: IOSActionSheetProps;
    resolve: (value: number | null) => void;
  } | null>(null);

  const showActionSheet = React.useCallback((
    options: Omit<IOSActionSheetProps, 'isOpen' | 'onClose'>
  ): Promise<number | null> => {
    return new Promise((resolve) => {
      setActionSheet({
        props: {
          ...options,
          isOpen: true,
          onClose: () => {
            setActionSheet(null);
            resolve(null);
          },
        },
        resolve,
      });
    });
  }, []);

  const handleActionPress = (index: number) => {
    if (actionSheet) {
      actionSheet.resolve(index);
      setActionSheet(null);
    }
  };

  // 修改 actions 以包含 resolve 調用
  const enhancedProps = actionSheet
    ? {
        ...actionSheet.props,
        actions: actionSheet.props.actions.map((action, index) => ({
          ...action,
          onPress: () => {
            action.onPress();
            handleActionPress(index);
          },
        })),
      }
    : null;

  return {
    actionSheet: enhancedProps ? { ...enhancedProps, isOpen: !!enhancedProps } : null,
    showActionSheet,
    hideActionSheet: () => {
      if (actionSheet) {
        actionSheet.resolve(null);
        setActionSheet(null);
      }
    },
  };
};

IOSActionSheet.displayName = "IOSActionSheet";

export default IOSActionSheet;
