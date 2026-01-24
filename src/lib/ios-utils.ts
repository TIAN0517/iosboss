/**
 * iOS 專用工具函數
 * 提供觸控優化、手勢檢測、視覺反饋等功能
 */

import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * 檢測是否為 iOS 設備
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && 'ontouchend' in document)
  );
}

/**
 * 檢測是否為 iPad（包含 iPad Pro）
 */
export function isIPad(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;
  return /iPad/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

/**
 * 檢測是否為 iPhone
 */
export function isIPhone(): boolean {
  if (typeof window === 'undefined') return false;

  return /iPhone|iPod/.test(window.navigator.userAgent);
}

/**
 * 獲取 iOS 安全區域尺寸
 */
export function getSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const safeArea = getComputedStyle(document.documentElement);

  return {
    top: parseInt(safeArea.getPropertyValue('env(safe-area-inset-top)') || '0'),
    bottom: parseInt(safeArea.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(safeArea.getPropertyValue('env(safe-area-inset-left)') || '0'),
    right: parseInt(safeArea.getPropertyValue('env(safe-area-inset-right)') || '0'),
  };
}

/**
 * 震動反饋 (Haptic Feedback) - 增強版
 * 使用 iOS 的震動 API 提供觸覺反饋，支持智能震動模式
 */

export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'
  | 'impact'
  | 'transform'
  | 'notification'
  | 'path';

export type HapticIntensity = 'weak' | 'medium' | 'strong';

// 高級震動模式配置
const hapticPatterns: Record<HapticType, number[]> = {
  // 基礎震動
  light: [10],
  medium: [20],
  heavy: [30],

  // 狀態震動
  success: [10, 50, 10],
  warning: [20, 50, 20],
  error: [30, 30, 30, 30],

  // UI 交互震動
  selection: [5], // 選擇項目
  impact: [15], // 輕微衝擊
  transform: [10, 30, 10], // 轉換動畫

  // 通知震動
  notification: [20, 40, 20, 40],
  path: [8, 40, 8, 40, 8], // 路徑導航
};

// 智能震動記錄（避免過度震動）
let lastHapticTime = 0;
let lastHapticType: HapticType | null = null;
const hapticDebounce = 100; // 震動間隔（毫秒）
const repeatHapticThreshold = 500; // 重複震動間隔（毫秒）

export function triggerHaptic(
  type: HapticType = 'light',
  options?: {
    intensity?: HapticIntensity;
    force?: boolean; // 強制執行，忽略防抖
  }
): void {
  if (typeof window === 'undefined' || !window.navigator) return;

  const { intensity = 'medium', force = false } = options || {};
  const now = Date.now();
  const timeSinceLastHaptic = now - lastHapticTime;

  // 防抖邏輯
  if (!force) {
    if (timeSinceLastHaptic < hapticDebounce) {
      return; // 震動太頻繁，忽略
    }

    // 相同類型的震動需要更長間隔
    if (lastHapticType === type && timeSinceLastHaptic < repeatHapticThreshold) {
      return;
    }
  }

  // 檢查震動支持
  if (!('vibrate' in window.navigator)) return;

  // 應用強度調整
  let pattern = hapticPatterns[type];
  if (intensity !== 'medium') {
    const multiplier = intensity === 'weak' ? 0.6 : 1.4;
    pattern = pattern.map((duration) => Math.max(5, duration * multiplier));
  }

  // 執行震動
  window.navigator.vibrate(pattern);

  // 更新記錄
  lastHapticTime = now;
  lastHapticType = type;
}

/**
 * 連續震動序列（用於複雜交互）
 */
export function triggerHapticSequence(patterns: HapticType[], delay = 100): void {
  patterns.forEach((type, index) => {
    setTimeout(() => {
      triggerHaptic(type, { force: true });
    }, index * delay);
  });
}

/**
 * 自適應震動（根據上下文自動選擇強度）
 */
export function triggerAdaptiveHaptic(
  context: 'scroll' | 'swipe' | 'tap' | 'hold' | 'drag',
  velocity?: number
): void {
  let type: HapticType = 'light';
  let intensity: HapticIntensity = 'medium';

  switch (context) {
    case 'scroll':
      type = 'selection';
      intensity = 'weak';
      break;
    case 'swipe':
      type = 'impact';
      intensity = velocity && velocity > 1000 ? 'strong' : 'medium';
      break;
    case 'tap':
      type = 'light';
      intensity = 'weak';
      break;
    case 'hold':
      type = 'medium';
      intensity = 'medium';
      break;
    case 'drag':
      type = 'selection';
      intensity = 'weak';
      break;
  }

  triggerHaptic(type, { intensity });
}

/**
 * 聲音反饋（使用 Web Audio API）
 */
let audioContext: AudioContext | null = null;

export function playSound(
  type: 'success' | 'error' | 'warning' | 'tap' | 'click' | 'notification',
  volume: number = 0.3
): void {
  if (typeof window === 'undefined') return;

  // 初始化 AudioContext
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  // 需要用戶交互才能播放
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // 根據類型設置音調
  const soundConfigs = {
    success: { frequency: 587.33, duration: 0.15, type: 'sine' }, // D5
    error: { frequency: 196, duration: 0.2, type: 'sawtooth' }, // G3
    warning: { frequency: 440, duration: 0.1, type: 'square' }, // A4
    tap: { frequency: 800, duration: 0.05, type: 'sine' },
    click: { frequency: 1000, duration: 0.03, type: 'sine' },
    notification: { frequency: 523.25, duration: 0.2, type: 'sine' }, // C5
  };

  const config = soundConfigs[type];
  oscillator.type = config.type as OscillatorType;
  oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);

  // 音量包絡
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + config.duration);
}

/**
 * 綜合反饋（震動 + 聲音）
 */
export function triggerFeedback(
  hapticType: HapticType = 'light',
  soundType?: 'success' | 'error' | 'warning' | 'tap' | 'click' | 'notification'
): void {
  triggerHaptic(hapticType);
  if (soundType) {
    playSound(soundType);
  }
}

/**
 * 靜音模式檢測
 */
export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;

  // 檢查系統靜音狀態（僅在某些設備上可用）
  return false;
}

/**
 * 啟用/禁用反饋
 */
let feedbackEnabled = true;

export function setFeedbackEnabled(enabled: boolean): void {
  feedbackEnabled = enabled;
}

export function isFeedbackEnabled(): boolean {
  return feedbackEnabled;
}

/**
 * 防止 iOS 橡皮筋效果
 */
export function preventOverscroll(element: HTMLElement): void {
  if (!element) return;

  let startY = 0;

  element.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  element.addEventListener('touchmove', (e) => {
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const currentY = e.touches[0].clientY;
    const direction = currentY - startY;

    // 已經到頂部且繼續向上滑
    if (scrollTop === 0 && direction < 0) {
      e.preventDefault();
    }

    // 已經到底部且繼續向下滑
    if (scrollTop + clientHeight >= scrollHeight && direction > 0) {
      e.preventDefault();
    }
  }, { passive: false });
}

/**
 * 觸控反饋自定義 Hook
 * 結合視覺和觸覺反饋
 */
export function useTouchFeedback() {
  const elementRef = useRef<HTMLElement>(null);

  const handleTouchStart = useCallback(() => {
    triggerHaptic('light');

    if (elementRef.current) {
      elementRef.current.style.transform = 'scale(0.96)';
      elementRef.current.style.opacity = '0.9';
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.style.transform = 'scale(1)';
      elementRef.current.style.opacity = '1';
    }
  }, []);

  return {
    elementRef,
    touchFeedbackProps: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * iOS 滑動手勢 Hook - 增強版
 * 用於檢測左滑/右滑/上滑/下滑手勢
 */
export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold: number = 50
) {
  const touchStartRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const deltaX = touchEnd.x - touchStartRef.current.x;
    const deltaY = touchEnd.y - touchStartRef.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // 水平滑動
    if (absDeltaX > absDeltaY && absDeltaX > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
        triggerHaptic('light');
      } else {
        onSwipeLeft?.();
        triggerHaptic('light');
      }
    }
    // 垂直滑動
    else if (absDeltaY > threshold) {
      if (deltaY > 0) {
        onSwipeDown?.();
        triggerHaptic('light');
      } else {
        onSwipeUp?.();
        triggerHaptic('light');
      }
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  return {
    swipeGestureProps: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * iOS 捏合手勢 Hook
 * 用於檢測捏合縮放手勢
 */
export function usePinchGesture(
  onPinchStart?: (scale: number) => void,
  onPinchMove?: (scale: number) => void,
  onPinchEnd?: (scale: number) => void
) {
  const initialDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);

  const getDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
      initialScaleRef.current = 1;
      onPinchStart?.(1);
      triggerHaptic('light');
    }
  }, [onPinchStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistanceRef.current > 0) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialDistanceRef.current;
      onPinchMove?.(scale);
    }
  }, [onPinchMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2 && initialDistanceRef.current > 0) {
      onPinchEnd?.(initialScaleRef.current);
      initialDistanceRef.current = 0;
      triggerHaptic('medium');
    }
  }, [onPinchEnd]);

  return {
    pinchGestureProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * iOS 旋轉手勢 Hook
 * 用於檢測雙指旋轉手勢
 */
export function useRotateGesture(
  onRotateStart?: (angle: number) => void,
  onRotateMove?: (angle: number) => void,
  onRotateEnd?: (angle: number) => void
) {
  const initialAngleRef = useRef<number>(0);
  const currentAngleRef = useRef<number>(0);

  const getAngle = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialAngleRef.current = getAngle(e.touches[0], e.touches[1]);
      currentAngleRef.current = 0;
      onRotateStart?.(0);
      triggerHaptic('light');
    }
  }, [onRotateStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const currentAngle = getAngle(e.touches[0], e.touches[1]);
      const angleDiff = currentAngle - initialAngleRef.current;
      currentAngleRef.current = angleDiff;
      onRotateMove?.(angleDiff);
    }
  }, [onRotateMove]);

  const handleTouchEnd = useCallback(() => {
    if (initialAngleRef.current !== 0) {
      onRotateEnd?.(currentAngleRef.current);
      initialAngleRef.current = 0;
      triggerHaptic('medium');
    }
  }, [onRotateEnd]);

  return {
    rotateGestureProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * iOS 平移手勢 Hook
 * 用於檢測拖拽移動手勢
 */
export function usePanGesture(
  onPanStart?: (x: number, y: number) => void,
  onPanMove?: (deltaX: number, deltaY: number) => void,
  onPanEnd?: (deltaX: number, deltaY: number) => void
) {
  const startPosRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startPosRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    isDraggingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - startPosRef.current.x;
    const deltaY = e.touches[0].clientY - startPosRef.current.y;

    // 檢測是否開始拖拽（移動超過 5px）
    if (!isDraggingRef.current && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      isDraggingRef.current = true;
      onPanStart?.(startPosRef.current.x, startPosRef.current.y);
      triggerHaptic('selection');
    }

    if (isDraggingRef.current) {
      onPanMove?.(deltaX, deltaY);
    }
  }, [onPanMove, onPanStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isDraggingRef.current) {
      const deltaX = e.changedTouches[0].clientX - startPosRef.current.x;
      const deltaY = e.changedTouches[0].clientY - startPosRef.current.y;
      onPanEnd?.(deltaX, deltaY);
      isDraggingRef.current = false;
      triggerHaptic('light');
    }
  }, [onPanEnd]);

  return {
    panGestureProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * iOS 雙擊手勢 Hook
 */
export function useDoubleTap(
  onDoubleTap?: () => void,
  delay: number = 300
) {
  const lastTapRef = useRef<number>(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
      onDoubleTap?.();
      triggerHaptic('medium');
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [onDoubleTap, delay]);

  return {
    doubleTapProps: {
      onClick: handleTap,
    },
  };
}

/**
 * 長按手勢 Hook
 * 用於檢測長按操作
 */
export function useLongPress(
  callback: () => void,
  ms: number = 500
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback(() => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      callback();
      triggerHaptic('medium');
    }, ms);
  }, [callback, ms]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(() => {
    start();
  }, [start]);

  const handleTouchEnd = useCallback(() => {
    if (!isLongPressRef.current) {
      clear();
    }
  }, [clear]);

  const handleTouchMove = useCallback(() => {
    clear();
  }, [clear]);

  return {
    longPressProps: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove,
    },
  };
}

/**
 * iOS 軟鍵盤自動收起
 */
export function dismissKeyboard(): void {
  if (typeof document === 'undefined') return;

  // 收起鍵盤
  const activeElement = document.activeElement as HTMLElement;
  if (activeElement) {
    activeElement.blur();
  }
}

/**
 * 檢查軟鍵盤是否打開
 */
export function isKeyboardOpen(): boolean {
  if (typeof window === 'undefined') return false;

  // iOS 軟鍵盤打開時，視窗高度會變小
  const threshold = 200;
  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;
  const screenHeight = window.screen.height;

  return screenHeight - windowHeight > threshold && windowWidth === window.screen.width;
}

/**
 * iOS 狀態欄高度
 */
export function getStatusBarHeight(): number {
  if (typeof window === 'undefined') return 0;

  const isLandscape = window.orientation === 90 || window.orientation === -90;

  // iOS 狀態欄高度
  if (isIPad()) {
    return isLandscape ? 24 : 20;
  }

  if (isIPhone()) {
    // iPhone X 及以上型號有劉海
    const hasNotch = /iPhone10|iPhone11|iPhone12|iPhone13|iPhone14|iPhone15|iPhone16/.test(
      window.navigator.userAgent
    );

    if (hasNotch) {
      return isLandscape ? 0 : 44;
    }

    return isLandscape ? 0 : 20;
  }

  return 0;
}

/**
 * iOS 底部安全區域高度（Home Indicator）
 */
export function getHomeIndicatorHeight(): number {
  if (typeof window === 'undefined') return 0;

  // iPhone X 及以上型號有 Home Indicator
  const hasHomeIndicator = /iPhone10|iPhone11|iPhone12|iPhone13|iPhone14|iPhone15|iPhone16/.test(
    window.navigator.userAgent
  );

  return hasHomeIndicator ? 34 : 0;
}

/**
 * 螢幕閃爍提醒（視覺反饋）
 */
export function flashScreen(color: string = 'rgba(59, 130, 246, 0.2)'): void {
  if (typeof document === 'undefined') return;

  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${color};
    pointer-events: none;
    z-index: 9999;
    animation: flash-animation 0.3s ease-out forwards;
  `;

  document.body.appendChild(flash);

  setTimeout(() => {
    document.body.removeChild(flash);
  }, 300);
}

/**
 * 注入閃爍動畫樣式
 */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes flash-animation {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * 平滑滾動到元素
 */
export function smoothScrollTo(elementId: string): void {
  if (typeof document === 'undefined') return;

  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    // iOS 震動反饋
    triggerHaptic('light');
  }
}

/**
 * 設備方向檢測
 */
export function getOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') return 'portrait';

  return window.orientation === 0 || window.orientation === 180 ? 'portrait' : 'landscape';
}

/**
 * 監聽設備方向變化
 */
export function useOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void) {
  useEffect(() => {
    const handleChange = () => {
      callback(getOrientation());
    };

    window.addEventListener('orientationchange', handleChange);
    window.addEventListener('resize', handleChange);

    return () => {
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  }, [callback]);
}

/**
 * iOS 邊緣滑動返回手勢 Hook
 * 用於檢測從螢幕左邊緣向右滑動的手勢（模擬 iOS 返回手勢）
 */
export function useEdgeSwipe(
  onSwipeBack?: () => void,
  edgeThreshold: number = 20,
  swipeThreshold: number = 100
) {
  const touchStartRef = useRef({ x: 0, y: 0, isEdge: false });
  const isDraggingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touch = e.touches[0];
    const isEdge = touch.clientX <= edgeThreshold;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      isEdge,
    };

    if (isEdge) {
      isDraggingRef.current = false;
    }
  }, [edgeThreshold]);

  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!touchStartRef.current.isEdge) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;

    // 檢測是否開始拖拽（向右滑動超過 10px）
    if (!isDraggingRef.current && deltaX > 10) {
      isDraggingRef.current = true;
      triggerHaptic('selection');
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (!touchStartRef.current.isEdge || !isDraggingRef.current) {
      touchStartRef.current = { x: 0, y: 0, isEdge: false };
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // 向右滑動超過閾值，且垂直移動不大（確保是水平滑動）
    if (deltaX > swipeThreshold && deltaY < 50) {
      onSwipeBack?.();
      triggerHaptic('medium');
    }

    // 重置狀態
    touchStartRef.current = { x: 0, y: 0, isEdge: false };
    isDraggingRef.current = false;
  }, [onSwipeBack, swipeThreshold]);

  return {
    edgeSwipeProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    isDragging: isDraggingRef.current,
  };
}

/**
 * iOS 下拉刷新手勢 Hook
 * 用於檢測下拉刷新手勢
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  threshold: number = 80
) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const pullStartRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    const scrollableElement = target.closest('[data-scrollable]') as HTMLElement || document.documentElement;

    // 只在頂部時啟用下拉刷新
    if (scrollableElement.scrollTop === 0) {
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
      pullStartRef.current = touch.clientY;
      isDraggingRef.current = false;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);

    // 只在下拉且水平移動不大時觸發
    if (deltaY > 10 && deltaX < 50 && deltaY > 0) {
      const target = e.target as HTMLElement;
      const scrollableElement = target.closest('[data-scrollable]') as HTMLElement || document.documentElement;

      if (scrollableElement.scrollTop === 0 && !isRefreshing) {
        e.preventDefault();
        isDraggingRef.current = true;

        // 計算下拉距離（帶阻尼效果）
        const distance = Math.min(deltaY * 0.4, threshold * 1.5);
        setPullDistance(distance);
        setIsPulling(true);

        // 震動反饋（當達到閾值時）
        if (distance >= threshold && pullDistance < threshold) {
          triggerHaptic('medium');
        }
      }
    }
  }, [threshold, isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDraggingRef.current) {
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    // 如果下拉距離超過閾值，執行刷新
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      triggerHaptic('success');
      setPullDistance(threshold);

      try {
        await onRefresh();
      } finally {
        // 延迟重置以顯示完成動畫
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }, 500);
      }
    } else {
      // 未達到閾值，彈回
      setPullDistance(0);
      setIsPulling(false);
    }

    isDraggingRef.current = false;
  }, [pullDistance, threshold, onRefresh]);

  const reset = useCallback(() => {
    setPullDistance(0);
    setIsPulling(false);
    setIsRefreshing(false);
  }, []);

  return {
    pullToRefreshProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    isPulling,
    pullDistance,
    isRefreshing,
    canRefresh: pullDistance >= threshold,
    reset,
  };
}
