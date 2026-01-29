import { toast } from 'sonner'

// 成功提示
export function showSuccess(message: string) {
  toast.success(message)
}

// 錯誤提示
export function showError(message: string) {
  toast.error(message)
}

// 信息提示
export function showInfo(message: string) {
  toast.info(message)
}

// 警告提示
export function showWarning(message: string) {
  toast.warning(message)
}

// 加載狀態
export function showLoading(message: string = '處理中...') {
  return toast.loading(message)
}

//  dismiss 特定 toast
export function dismissToast(id: string | number) {
  toast.dismiss(id)
}

// 自定義 Toast
export function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
  switch (type) {
    case 'success':
      toast.success(message)
      break
    case 'error':
      toast.error(message)
      break
    case 'warning':
      toast.warning(message)
      break
    default:
      toast.info(message)
  }
}

// Promise Toast
export function showPromiseToast<T>(
  promise: Promise<T>,
  {
    loading,
    success,
    error,
  }: {
    loading: string
    success: string
    error: string
  }
) {
  return toast.promise(promise, {
    loading,
    success,
    error,
  })
}
