/**
 * iOS 原生風格底部導航欄 (Tab Bar) - 升級版
 * 採用 iOS 18 設計語言，新增更流暢的動畫效果
 */

'use client'

import * as React from "react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/ios-utils";
import { usePathname, useRouter } from "next/navigation";

export interface IOSTabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export interface IOSTabBarProps {
  tabs: IOSTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const IOSTabBar: React.FC<IOSTabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
}) => {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0",
        "ios-glass-18",
        "border-t-2 border-gray-200/80",
        "ios-safe-area-bottom",
        "ios-card-shadow",
        "z-40",
        className
      )}
    >
      <div className="flex items-center justify-around h-16 md:h-20">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (!isActive) {
                  triggerHaptic('light');
                  onTabChange(tab.id);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "flex-1 h-full",
                "transition-all duration-300",
                "ios-no-select",
                "relative",
                isActive ? "opacity-100" : "opacity-50"
              )}
            >
              {/* 激活指示器 */}
              {isActive && (
                <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-orange-600 rounded-b-full ios-bounce-scale" />
              )}

              <div className="relative">
                <Icon
                  className={cn(
                    "w-6 h-6 md:w-7 md:h-7",
                    "transition-all duration-300",
                    isActive
                      ? "text-orange-600 scale-110"
                      : "text-gray-600"
                  )}
                />
                {/* 徽章 */}
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-md ios-bounce-scale">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] md:text-xs font-medium",
                  "transition-all duration-300",
                  isActive
                    ? "text-orange-600 font-semibold"
                    : "text-gray-600"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

IOSTabBar.displayName = "IOSTabBar";

/**
 * iOS 風格的分段控制器 (Segmented Control) - 升級版
 */
export interface IOSSegment {
  value: string;
  label: string;
}

export interface IOSSegmentedControlProps {
  segments: IOSSegment[];
  selectedSegment: string;
  onSegmentChange: (value: string) => void;
  className?: string;
}

export const IOSSegmentedControl: React.FC<IOSSegmentedControlProps> = ({
  segments,
  selectedSegment,
  onSegmentChange,
  className,
}) => {
  return (
    <div
      className={cn(
        "inline-flex bg-gray-200 rounded-2xl p-1.5",
        "ios-card-shadow",
        className
      )}
    >
      {segments.map((segment) => {
        const isSelected = selectedSegment === segment.value;

        return (
          <button
            key={segment.value}
            onClick={() => {
              if (!isSelected) {
                triggerHaptic('light');
                onSegmentChange(segment.value);
              }
            }}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-semibold",
              "transition-all duration-300",
              "ios-no-select",
              "relative",
              isSelected
                ? "bg-white text-gray-900 shadow-md"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {isSelected && (
              <span className="absolute inset-0 bg-white rounded-xl ios-bounce-scale" />
            )}
            <span className="relative z-10">{segment.label}</span>
          </button>
        );
      })}
    </div>
  );
};

IOSSegmentedControl.displayName = "IOSSegmentedControl";

/**
 * iOS 風格的底部工具欄 (Toolbar) - 升級版
 */
export interface IOSToolbarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export const IOSToolbar: React.FC<IOSToolbarProps> = ({
  left,
  center,
  right,
  className,
}) => {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0",
        "ios-glass-18",
        "border-t-2 border-gray-200/80",
        "ios-safe-area-bottom",
        "h-16 md:h-20",
        "flex items-center justify-between px-4 md:px-6",
        "ios-card-shadow",
        "z-40",
        className
      )}
    >
      <div className="flex-1 flex justify-start">{left}</div>
      <div className="flex items-center justify-center">{center}</div>
      <div className="flex-1 flex justify-end">{right}</div>
    </div>
  );
};

IOSToolbar.displayName = "IOSToolbar";

export default IOSTabBar;
