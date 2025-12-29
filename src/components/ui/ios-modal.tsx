/**
 * iOS 原生風格模態框組件
 * 採用 iOS 原生設計語言
 */

'use client'

import * as React from "react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/ios-utils";
import { X } from "lucide-react";

export interface IOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
  preventClose?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full mx-4',
};

export const IOSModal: React.FC<IOSModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  preventClose = false,
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);

  // 處理背景點擊關閉
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!preventClose && e.target === e.currentTarget) {
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
      // 防止背景滾動
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, preventClose]);

  // 點擊背景關閉
  const handleClose = () => {
    if (!preventClose) {
      triggerHaptic('light');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center ios-safe-area"
      onClick={handleBackdropClick}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* 模態框 */}
      <div
        ref={modalRef}
        className={cn(
          "relative bg-white rounded-3xl shadow-2xl w-full",
          "ios-card-shadow-elevated",
          "animate-in ios-slide-in-up duration-300",
          sizeClasses[size],
          "max-h-[90vh] overflow-hidden flex flex-col"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題欄 */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 flex-shrink-0">
            {title && (
              <h2 className="text-easy-heading font-bold text-gray-900">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="p-2 -mr-2 hover:bg-gray-100 rounded-xl transition-colors ios-no-select"
                disabled={preventClose}
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            )}
          </div>
        )}

        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
};

IOSModal.displayName = "IOSModal";

export default IOSModal;
