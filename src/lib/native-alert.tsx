'use client'

import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'
import { hapticManager } from './haptic-manager'

/**
 * iOS 風格提示框類型
 */
export type NativeAlertType = 'success' | 'error' | 'warning' | 'info'

/**
 * 提示框配置
 */
export interface NativeAlertOptions {
  title?: string
  message: string
  type?: NativeAlertType
  duration?: number
  position?: 'top' | 'center' | 'bottom'
  actionText?: string
  onAction?: () => void
  onClose?: () => void
}

/**
 * iOS 風格對話框選項
 */
export interface NativeDialogOptions {
  title: string
  message?: string
  buttons: Array<{
    text: string
    style?: 'default' | 'cancel' | 'destructive'
    onPress?: () => void | Promise<void>
  }>
  type?: 'default' | 'input' | 'secureInput'
  placeholder?: string
  defaultValue?: string
}

/**
 * 提示框組件
 */
function NativeAlertComponent({
  message,
  type = 'info',
  duration = 3000,
  position = 'top',
  actionText,
  onAction,
  onClose,
  visible,
}: NativeAlertOptions & { visible: boolean }) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (visible && duration > 0) {
      const interval = 50
      const step = 100 / (duration / interval)
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev <= step) {
            clearInterval(timer)
            onClose?.()
            return 0
          }
          return prev - step
        })
      }, interval)

      return () => clearInterval(timer)
    }
  }, [visible, duration, onClose])

  const icons = {
    success: <CheckCircle className="h-6 w-6 text-green-500" />,
    error: <XCircle className="h-6 w-6 text-red-500" />,
    warning: <AlertCircle className="h-6 w-6 text-orange-500" />,
    info: <Info className="h-6 w-6 text-blue-500" />,
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-orange-50 border-orange-200',
    info: 'bg-blue-50 border-blue-200',
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-50"
            onClick={onClose}
          />

          {/* 提示框 */}
          <div className={`fixed z-50 flex ${
            position === 'top' ? 'top-4 left-1/2 -translate-x-1/2' :
            position === 'bottom' ? 'bottom-20 left-1/2 -translate-x-1/2' :
            'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
          }`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: position === 'bottom' ? 50 : -50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: position === 'bottom' ? 50 : -50 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`max-w-sm w-full mx-4 p-4 rounded-2xl border-2 shadow-2xl ${bgColors[type]}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {icons[type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {message}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              {/* 進度條 */}
              {duration > 0 && (
                <div className="mt-3 h-1 bg-black/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-current opacity-30"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: type === 'success' ? '#22c55e' :
                                       type === 'error' ? '#ef4444' :
                                       type === 'warning' ? '#f97316' : '#3b82f6',
                    }}
                  />
                </div>
              )}

              {/* 操作按鈕 */}
              {actionText && (
                <button
                  onClick={() => {
                    onAction?.()
                    onClose?.()
                  }}
                  className="mt-3 w-full py-2 px-4 bg-gray-900 text-white rounded-xl font-medium text-sm active:scale-95 transition-transform"
                >
                  {actionText}
                </button>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * 對話框組件
 */
function NativeDialogComponent({
  title,
  message,
  buttons,
  type = 'default',
  placeholder,
  defaultValue,
  visible,
  onClose,
}: NativeDialogOptions & { visible: boolean; onClose: (value?: string) => void }) {
  const [inputValue, setInputValue] = useState(defaultValue || '')

  const handleButtonPress = async (button: typeof buttons[0]) => {
    const result = type === 'input' || type === 'secureInput' ? inputValue : undefined
    await button.onPress?.()
    onClose(result)
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={() => onClose()}
          />

          {/* 對話框 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 標題和內容 */}
              <div className="p-6 text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {title}
                </h3>
                {message && (
                  <p className="text-sm text-gray-600 mb-4">
                    {message}
                  </p>
                )}

                {/* 輸入框 */}
                {(type === 'input' || type === 'secureInput') && (
                  <input
                    type={type === 'secureInput' ? 'password' : 'text'}
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                )}
              </div>

              {/* 按鈕 */}
              <div className="border-t border-gray-200">
                {buttons.map((button, index) => (
                  <button
                    key={index}
                    onClick={() => handleButtonPress(button)}
                    className={`w-full py-4 px-6 text-base font-medium transition-colors ${
                      button.style === 'destructive'
                        ? 'text-red-600 active:bg-red-50'
                        : button.style === 'cancel'
                        ? 'text-gray-600 font-semibold active:bg-gray-50'
                        : 'text-blue-600 font-semibold active:bg-blue-50'
                    } ${index > 0 ? 'border-t border-gray-200' : ''}`}
                  >
                    {button.text}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * 顯示提示框
 */
export function showNativeAlert(options: NativeAlertOptions): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  const cleanup = () => {
    root.unmount()
    document.body.removeChild(container)
  }

  // 觸發震動反饋
  const type = options.type || 'info'
  if (type === 'success') hapticManager.success()
  else if (type === 'error') hapticManager.error()
  else if (type === 'warning') hapticManager.warning()
  else hapticManager.feedback('navigation')

  root.render(
    <NativeAlertComponent
      {...options}
      visible={true}
      onClose={() => {
        options.onClose?.()
        cleanup()
      }}
    />
  )
}

/**
 * 顯示對話框
 */
export function showNativeDialog(options: NativeDialogOptions): Promise<string | undefined> {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const cleanup = (value?: string) => {
      root.unmount()
      document.body.removeChild(container)
      resolve(value)
    }

    hapticManager.feedback('confirm')

    root.render(
      <NativeDialogComponent
        {...options}
        visible={true}
        onClose={(value) => {
          cleanup(value)
        }}
      />
    )
  })
}

/**
 * 便捷方法：顯示成功提示
 */
export function showSuccess(message: string, duration?: number): void {
  showNativeAlert({ message, type: 'success', duration })
}

/**
 * 便捷方法：顯示錯誤提示
 */
export function showError(message: string, duration?: number): void {
  showNativeAlert({ message, type: 'error', duration })
}

/**
 * 便捷方法：顯示警告提示
 */
export function showWarning(message: string, duration?: number): void {
  showNativeAlert({ message, type: 'warning', duration })
}

/**
 * 便捷方法：顯示信息提示
 */
export function showInfo(message: string, duration?: number): void {
  showNativeAlert({ message, type: 'info', duration })
}

/**
 * 便捷方法：顯示確認對話框
 */
export function showConfirm(
  title: string,
  message?: string
): Promise<boolean> {
  return showNativeDialog({
    title,
    message,
    buttons: [
      { text: '取消', style: 'cancel' },
      { text: '確定' },
    ],
  }).then(() => true)
}

/**
 * 便捷方法：顯示刪除確認對話框
 */
export function showDeleteConfirm(
  title: string = '確認刪除',
  message?: string
): Promise<boolean> {
  return showNativeDialog({
    title,
    message: message || '此操作無法復原，確定要刪除嗎？',
    buttons: [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive' },
    ],
  }).then(() => true)
}

/**
 * 便捷方法：顯示輸入對話框
 */
export function showInput(
  title: string,
  placeholder?: string,
  defaultValue?: string
): Promise<string | undefined> {
  return showNativeDialog({
    title,
    placeholder,
    defaultValue,
    type: 'input',
    buttons: [
      { text: '取消', style: 'cancel' },
      { text: '確定' },
    ],
  })
}

/**
 * 便捷方法：顯示密碼輸入對話框
 */
export function showSecureInput(
  title: string,
  placeholder?: string
): Promise<string | undefined> {
  return showNativeDialog({
    title,
    placeholder,
    type: 'secureInput',
    buttons: [
      { text: '取消', style: 'cancel' },
      { text: '確定' },
    ],
  })
}
