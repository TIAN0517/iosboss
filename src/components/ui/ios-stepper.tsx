/**
 * iOS 優化步驟指示器組件
 * 顯示多步驟流程的當前進度
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { triggerHaptic } from "@/lib/ios-utils";

export interface IOSStepperProps {
  steps: { title: string; description?: string; icon?: React.ReactNode }[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: { step: "w-8 h-8 text-sm", connector: "h-0.5" },
  md: { step: "w-10 h-10 text-base", connector: "h-1" },
  lg: { step: "w-12 h-12 text-lg", connector: "h-1.5" },
};

export const IOSStepper: React.FC<IOSStepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  orientation = "horizontal",
  size = "md",
  className,
}) => {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      className={cn(
        "flex gap-4",
        isHorizontal ? "flex-row items-start" : "flex-col",
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isClickable = onStepClick && index <= currentStep;

        return (
          <React.Fragment key={index}>
            {/* 步驟項目 */}
            <div
              className={cn(
                "flex gap-3",
                isHorizontal ? "flex-col items-center flex-1" : "flex-row items-start"
              )}
            >
              {/* 步驟圖標 */}
              <button
                onClick={() => {
                  if (isClickable) {
                    triggerHaptic('light')
                    onStepClick?.(index)
                  }
                }}
                disabled={!isClickable}
                className={cn(
                  "flex-shrink-0 relative",
                  "rounded-full flex items-center justify-center",
                  "font-bold transition-all duration-300",
                  "border-2",
                  sizeStyles[size].step,
                  isCompleted || isCurrent
                    ? "bg-orange-600 border-orange-600 text-white"
                    : "bg-white border-gray-300 text-gray-400",
                  isClickable && "cursor-pointer hover:scale-105 active:scale-95",
                  !isClickable && "cursor-not-allowed opacity-60"
                )}
              >
                {isCompleted ? (
                  <Check className={size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"} />
                ) : (
                  <span>{index + 1}</span>
                )}

                {/* 當前步驟脈衝效果 */}
                {isCurrent && (
                  <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-50" />
                )}
              </button>

              {/* 步驟資訊 */}
              <div
                className={cn(
                  "flex-1",
                  isHorizontal ? "text-center mt-2" : "mt-1"
                )}
              >
                <p
                  className={cn(
                    "font-semibold transition-colors",
                    (isCompleted || isCurrent) ? "text-gray-900" : "text-gray-500"
                  )}
                >
                  {step.title}
                </p>
                {step.description && (
                  <p
                    className={cn(
                      "text-sm mt-0.5",
                      isCurrent ? "text-gray-700" : "text-gray-400"
                    )}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* 連接線 */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-shrink-0 bg-gray-200",
                  isHorizontal ? "self-start mt-5" : "ml-5",
                  isHorizontal ? "flex-1" : "w-0.5",
                  sizeStyles[size].connector,
                  index < currentStep && "bg-orange-600"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

IOSStepper.displayName = "IOSStepper";

/* ========================================
   iOS 簡化步驟指示器（數字形式）
   ======================================== */

export interface IOSStepIndicatorProps {
  current: number;
  total: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const indicatorSizeStyles = {
  sm: "text-sm px-2.5 py-1",
  md: "text-base px-3 py-1.5",
  lg: "text-lg px-4 py-2",
};

export const IOSStepIndicator: React.FC<IOSStepIndicatorProps> = ({
  current,
  total,
  showLabel = true,
  size = "md",
  className,
}) => {
  const progress = (current / total) * 100;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* 進度條 */}
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 步驟文字 */}
      {showLabel && (
        <span
          className={cn(
            "font-bold text-gray-700 rounded-full bg-gray-100",
            indicatorSizeStyles[size]
          )}
        >
          {current} / {total}
        </span>
      )}
    </div>
  );
};

IOSStepIndicator.displayName = "IOSStepIndicator";
