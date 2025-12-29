'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    name: '',
    phone: '',
    department: '',
    role: 'staff',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // 前端驗證
    if (formData.password !== formData.confirmPassword) {
      setError('密碼與確認密碼不一致')
      return
    }

    if (formData.password.length < 6) {
      setError('密碼長度至少 6 個字符')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/self-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          name: formData.name,
          phone: formData.phone || undefined,
          department: formData.department || undefined,
          role: formData.role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '註冊失敗')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login?message=請等待管理員審核啟用您的帳號')
      }, 2000)
    } catch (err) {
      setError('網路錯誤，請稍後再試')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">員工帳號申請</CardTitle>
          <CardDescription>
            填寫以下資訊申請帳號，審核通過後即可使用
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                申請成功！請等待管理員審核啟用您的帳號。
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">姓名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="請輸入真實姓名"
                  />
                </div>
                <div>
                  <Label htmlFor="username">帳號 *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    placeholder="請輸入帳號"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">電子信箱 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">手機號碼</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0912345678"
                />
              </div>

              <div>
                <Label htmlFor="department">部門</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="例如：配送部、會計部"
                />
              </div>

              <div>
                <Label htmlFor="role">職務 *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">一般員工</SelectItem>
                    <SelectItem value="driver">司機</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="password">密碼 *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="至少 6 個字符"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">確認密碼 *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  placeholder="請再次輸入密碼"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    申請中...
                  </>
                ) : (
                  '提交申請'
                )}
              </Button>

              <div className="text-center text-sm text-gray-600">
                已有帳號？{' '}
                <Link href="/login" className="text-blue-600 hover:underline">
                  立即登入
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
