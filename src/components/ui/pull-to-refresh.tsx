'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PullToRefreshIndicatorProps {
  isPulling: boolean
  pullDistance: number
  canRefresh: boolean
  isRefreshing: boolean
  threshold: number
  className?: string
}

export function PullToRefreshIndicator({
  isPulling,
  pullDistance,
  canRefresh,
  isRefreshing,
  threshold = 80,
  className = '',
}: PullToRefreshIndicatorProps) {
  // 計算進度百分比 (0-1)
  const progress = Math.min(pullDistance / threshold, 1)
  // 計算顯示高度（限制在最大值）
  const height = Math.min(pullDistance, threshold * 1.2)

  return (
    <AnimatePresence>
      {(isPulling || isRefreshing) && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: isRefreshing ? threshold : height }}
          exit={{ height: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'fixed top-0 left-0 right-0 z-50 flex items-center justify-center overflow-hidden pointer-events-none',
            'bg-gradient-to-b from-orange-50/95 to-transparent',
            className
          )}
          style={{
            height: isRefreshing ? threshold : undefined,
          }}
        >
          <div className="flex flex-col items-center justify-center">
            {/* 旋轉指示器 */}
            <motion.div
              animate={{
                rotate: isRefreshing ? 360 : progress * 180,
                scale: canRefresh || isRefreshing ? 1 : 0.8,
              }}
              transition={{
                rotate: isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : { type: 'spring', stiffness: 200 },
                scale: { type: 'spring', stiffness: 300, damping: 20 },
              }}
              className={`p-3 rounded-full shadow-lg ${
                canRefresh || isRefreshing
                  ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white'
                  : 'bg-white text-orange-500'
              }`}
            >
              <RefreshCw className="h-6 w-6" />
            </motion.div>

            {/* 狀態文字 */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isRefreshing ? 'refreshing' : canRefresh ? 'ready' : 'pulling'}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="mt-2 text-center"
              >
                {isRefreshing ? (
                  <p className="text-sm font-semibold text-orange-600">更新中...</p>
                ) : canRefresh ? (
                  <p className="text-sm font-semibold text-orange-600">放開更新</p>
                ) : (
                  <p className="text-sm font-medium text-slate-500">下拉更新</p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 漸變遮罩 */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * 邊緣滑動返回視覺指示器
 */
export function EdgeSwipeIndicator({ isDragging }: { isDragging: boolean }) {
  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 0.6, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 bottom-0 w-16 bg-gradient-to-r from-slate-900/20 to-transparent pointer-events-none z-50"
          style={{
            backdropFilter: 'blur(4px)',
          }}
        >
          {/* 左箭頭指示器 */}
          <div className="absolute top-1/2 left-2 transform -translate-y-1/2">
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-slate-600"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
