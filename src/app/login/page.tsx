'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrandIcon } from '@/components/BrandIcon'
import { IOSButton } from '@/components/ui/ios-button'
import { IOSInput } from '@/components/ui/ios-input'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardDescription, IOSCardContent } from '@/components/ui/ios-card'
import { Lock, User, LogIn, AlertCircle, Shield, CheckCircle, Crown } from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'
import { saveAuthData } from '@/lib/auth-client'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      triggerHaptic('medium')

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      const token = response.headers.get('X-Auth-Token')

      if (response.ok) {
        triggerHaptic('success')

        // 優先使用 response body 中的 token，其次使用 header
        const authToken = data.token || token

        // 保存 Token 和用戶資料到 localStorage
        if (data.user && authToken) {
          saveAuthData(authToken, data.user)
        } else if (data.user) {
          // Cookie 模式備份
          localStorage.setItem('user_name', data.user.name)
          localStorage.setItem('user_role', data.user.role)
          localStorage.setItem('user_username', data.user.username)
        }

        setSuccessMsg('登入成功！正在跳轉...')

        // 延遲一點跳轉，確保 Cookie 和 localStorage 都設置完成
        setTimeout(() => {
          window.location.href = '/'
        }, 300)
      } else {
        triggerHaptic('error')
        setError(data.error || '登入失敗，請檢查帳號密碼')
      }
    } catch (err) {
      triggerHaptic('error')
      setError('網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4 ios-safe-area">
      <div className="w-full max-w-md">
        {/* Logo 和標題 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 p-5 rounded-3xl shadow-2xl mb-6 w-[98px] h-[98px]">
            <BrandIcon size={48} className="text-white" />
          </div>
          <h1 className="text-easy-title font-bold text-gray-900 mb-2">
            九九瓦斯行管理系統
          </h1>
          <p className="text-easy-body text-gray-600 flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            專業管理系統
          </p>
          <p className="text-easy-caption text-gray-500 mt-1">
            2025 安全加強版
          </p>
        </div>

        {/* 登入表單 */}
        <IOSCard className="shadow-2xl">
          <IOSCardHeader className="text-center pb-4">
            <IOSCardTitle>歡迎回來</IOSCardTitle>
            <IOSCardDescription>請輸入您的帳號密碼</IOSCardDescription>
          </IOSCardHeader>
          <IOSCardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 安全提示 */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <Shield className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-800">安全管理系統</p>
                  <p className="text-blue-700 mt-1">請使用您的專屬帳號登入</p>
                </div>
              </div>

              {/* 成功訊息 */}
              {successMsg && (
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-easy-body text-green-700">{successMsg}</p>
                </div>
              )}

              {/* 錯誤訊息 */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-easy-body text-red-700">{error}</p>
                </div>
              )}

              {/* 帳號輸入 */}
              <div>
                <label className="block text-easy-body font-semibold text-gray-900 mb-2">
                  帳號
                </label>
                <IOSInput
                  type="text"
                  placeholder="請輸入您的帳號"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  disabled={loading}
                  leftIcon={<User className="h-5 w-5 text-gray-400" />}
                  autoComplete="username"
                  className="text-easy-body"
                />
              </div>

              {/* 密碼輸入 */}
              <div>
                <label className="block text-easy-body font-semibold text-gray-900 mb-2">
                  密碼
                </label>
                <IOSInput
                  type="password"
                  placeholder="請輸入您的密碼"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                  leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
                  autoComplete="current-password"
                  className="text-easy-body"
                />
              </div>

              {/* 登入按鈕 */}
              <IOSButton
                type="submit"
                loading={loading}
                disabled={!formData.username || !formData.password}
                variant="default"
                size="lg"
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
              >
                <LogIn className="h-5 w-5 mr-2" />
                {loading ? '登入中...' : '登入'}
              </IOSButton>
            </form>

            {/* 提示訊息 */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-easy-caption text-gray-500 text-center">
                🔐 安全登入系統 • 數據加密傳輸
              </p>
              <p className="text-easy-caption text-blue-500 text-center mt-2 font-medium">
                ⚠️ 請使用授權帳號登入
              </p>
            </div>
          </IOSCardContent>
        </IOSCard>

        {/* 版本資訊 */}
        <div className="text-center mt-6">
          <p className="text-easy-caption text-gray-500">
            © 2025 九九瓦斯行管理系統 v2.1.0 Security
          </p>
          <p className="text-easy-caption text-gray-400 mt-1">
            Jy技術團隊開發 • BossJy 技術總監
          </p>
        </div>
      </div>
    </div>
  )
}
