/**
 * iOS 原生風格底部彈出面板 (Sheet)
 * 類似 iOS Action Sheets 或 Share Sheets
 */

'use client'

import * as React from "react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/ios-utils";
import { X, ChevronDown } from "lucide-react";

export interface IOSSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: 'auto' | 'half' | 'full';
  showHandle?: boolean;
  preventClose?: boolean;
}

const heightClasses = {
  auto: 'max-h-[70vh]',
  half: 'h-[50vh]',
  full: 'h-[85vh]',
};

export const IOSSheet: React.FC<IOSSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  showHandle = true,
  preventClose = false,
}) => {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startY, setStartY] = React.useState(0);
  const [currentY, setCurrentY] = React.useState(0);

  // 處理拖拽關閉
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (preventClose) return;
    setIsDragging(true);
    setStartY('touches' in e ? e.touches[0].clientY : e.clientY);
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || preventClose) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setCurrentY(Math.max(0, clientY - startY));
  };

  const handleDragEnd = () => {
    if (!isDragging || preventClose) return;
    setIsDragging(false);

    // 如果向下拖動超過 100px，關閉面板
    if (currentY > 100) {
      triggerHaptic('medium');
      onClose();
    }
    setCurrentY(0);
  };

  // 處理背景點擊關閉
  const handleBackdropClick = () => {
    if (!preventClose) {
      triggerHaptic('light');
      onClose();
    }
  };

  // ESC 鍵關閉
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventClose && isOpen) {
        triggerHaptic('light');
        onClose();
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
  }, [isOpen, onClose, preventClose]);

  if (!isOpen) return null;

  const transformStyle = {
    transform: isDragging ? `translateY(${currentY}px)` : 'translateY(0)',
    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end ios-safe-area">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleBackdropClick}
      />

      {/* Sheet 面板 */}
      <div
        ref={sheetRef}
        className={cn(
          "relative bg-white rounded-t-[32px] shadow-2xl w-full",
          "ios-safe-area-top",
          heightClasses[height],
          "animate-in ios-slide-in-up duration-300",
          "overflow-hidden flex flex-col"
        )}
        style={transformStyle}
      >
        {/* 拖拽手柄 */}
        {showHandle && (
          <div
            className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
          >
            <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* 標題欄 */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-easy-heading font-bold text-gray-900">
              {title}
            </h2>
            {!preventClose && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className="p-2 -mr-2 hover:bg-gray-100 rounded-xl transition-colors ios-no-select"
              >
                <ChevronDown className="h-6 w-6 text-gray-600" />
              </button>
            )}
          </div>
        )}

        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

IOSSheet.displayName = "IOSSheet";

/**
 * iOS 風格的操作按鈕列表項
 */
export interface IOSActionItemProps {
  label: string;
  icon?: React.ReactNode;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

const colorClasses = {
  default: 'text-gray-900',
  primary: 'text-blue-600',
  success: 'text-green-600',
  warning: 'text-orange-600',
  danger: 'text-red-600',
};

export const IOSActionItem: React.FC<IOSActionItemProps> = ({
  label,
  icon,
  color = 'default',
  onPress,
  disabled = false,
  destructive = false,
}) => {
  const actualColor = destructive ? 'danger' : color;

  return (
    <button
      onClick={() => {
        triggerHaptic('light');
        onPress();
      }}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-4 px-6 py-4",
        "border-b border-gray-200 last:border-b-0",
        "active:bg-gray-100 transition-colors",
        "ios-no-select",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {icon && (
        <div className={cn("flex-shrink-0", colorClasses[actualColor])}>
          {icon}
        </div>
      )}
      <span className={cn("text-easy-body font-semibold", colorClasses[actualColor])}>
        {label}
      </span>
    </button>
  );
};

IOSActionItem.displayName = "IOSActionItem";

/**
 * iOS 風格的取消按鈕 (Sheet 底部)
 */
export const IOSCancelButton: React.FC<{
  onPress: () => void;
  label?: string;
}> = ({ onPress, label = '取消' }) => {
  return (
    <div className="px-4 pb-4 pt-2">
      <button
        onClick={() => {
          triggerHaptic('light');
          onPress();
        }}
        className="w-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-2xl py-4 text-center ios-no-select transition-colors"
      >
        <span className="text-easy-body font-bold text-gray-900">
          {label}
        </span>
      </button>
    </div>
  );
};

IOSCancelButton.displayName = "IOSCancelButton";

export default IOSSheet;
