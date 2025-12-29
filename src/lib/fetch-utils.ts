/**
 * 安全的 fetch JSON 解析函數
 * 當回應不是 JSON 時返回 null 而不是拋出錯誤
 */
export async function safeFetchJson<T = any>(response: Response): Promise<T | null> {
  if (!response.ok) {
    return null
  }

  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}

/**
 * 帶錯誤處理的 fetch 函數
 * 當 fetch 失敗或返回非 JSON 時提供友好的錯誤訊息
 */
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<{ data: any; error: string | null }> {
  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      // 嘗試解析錯誤回應
      try {
        const errorData = await response.json()
        return { data: null, error: errorData.error || errorData.message || '請求失敗' }
      } catch {
        return { data: null, error: `請求失敗 (${response.status})` }
      }
    }

    // 檢查回應類型
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return { data: null, error: '伺服器回應格式錯誤' }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : '網路錯誤' }
  }
}
