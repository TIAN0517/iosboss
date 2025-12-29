'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { IOSButton } from '@/components/ui/ios-button'
import {
  IOSCard,
  IOSCardHeader,
  IOSCardTitle,
  IOSCardDescription,
  IOSCardContent,
  IOSList,
  IOSListItem
} from '@/components/ui/ios-card'
import { IOSModal } from '@/components/ui/ios-modal'
import { IOSSheet, IOSActionItem, IOSCancelButton } from '@/components/ui/ios-sheet'
import { IOSTabBar } from '@/components/ui/ios-tabbar'
import { BrandIcon } from '@/components/BrandIcon'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Receipt,
  DollarSign,
  CheckSquare,
  Megaphone,
  TrendingUp,
  Truck,
  Plus,
  Search,
  Bell,
  Settings,
  Menu,
  X,
  Phone,
  Calculator,
  Users as UsersIcon,
  BarChart3,
  PhoneCall,
  FileText,
  MessageCircle,
  ChevronRight,
  LogOut,
  Home,
  Grid3x3,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react'
import { CustomerManagement } from '@/components/CustomerManagement'
import { OrderManagement } from '@/components/OrderManagement'
import { InventoryManagement } from '@/components/InventoryManagement'
import { CheckManagement } from '@/components/CheckManagement'
import { MeterReadingManagement } from '@/components/MeterReadingManagement'
import { StaffManagement } from '@/components/StaffManagement'
import { CostAnalysis } from '@/components/CostAnalysis'
import { MonthlyStatementPage } from '@/components/MonthlyStatementPage'
import { CallRecordsPage } from '@/components/CallRecordsPage'
import { MarketingManagement } from '@/components/MarketingManagement'
import { ReportsAnalysis } from '@/components/ReportsAnalysis'
import { LineBotManagement } from '@/components/LineBotManagement'
import { AIAssistant } from '@/components/AIAssistant'
import { ExcelExportTool } from '@/components/ExcelExportTool'
import { ChatSection } from '@/components/ChatSection'
import { SmartAlerts, AlertBadge } from '@/components/SmartAlerts'
import { QuickActions } from '@/components/QuickActions'
import { VoiceQuickQuery } from '@/components/VoiceQuickQuery'
import { DriverDeliveryApp } from '@/components/DriverDeliveryApp'
import { triggerHaptic } from '@/lib/ios-utils'

type Section = 'dashboard' | 'customers' | 'orders' | 'inventory' | 'checks' | 'costs' | 'marketing' | 'reports' | 'meter' | 'staff' | 'calls' | 'monthly' | 'linebot' | 'excel-export' | 'chat'

const menuItems = [
  { id: 'dashboard' as Section, icon: LayoutDashboard, label: '首頁', color: 'text-emerald-600', description: '儀表板總覽' },
  { id: 'customers' as Section, icon: Users, label: '客戶', color: 'text-blue-600', description: '管理客戶資料' },
  { id: 'orders' as Section, icon: ShoppingCart, label: '訂單', color: 'text-purple-600', description: '處理瓦斯訂單' },
  { id: 'inventory' as Section, icon: Package, label: '庫存', color: 'text-orange-600', description: '瓦斯庫存管理' },
  { id: 'checks' as Section, icon: CheckSquare, label: '支票', color: 'text-pink-600', description: '支票登記記錄' },
  { id: 'meter' as Section, icon: Calculator, label: '抄錶', color: 'text-cyan-600', description: '管線瓦斯抄錶' },
  { id: 'staff' as Section, icon: UsersIcon, label: '員工', color: 'text-indigo-600', description: '員工資訊管理' },
  { id: 'costs' as Section, icon: DollarSign, label: '成本', color: 'text-green-600', description: '成本利潤分析' },
  { id: 'monthly' as Section, icon: FileText, label: '月結', color: 'text-amber-600', description: '月結報表生成' },
  { id: 'calls' as Section, icon: PhoneCall, label: '來電', color: 'text-rose-600', description: '來電記錄查詢' },
  { id: 'marketing' as Section, icon: Megaphone, label: '營銷', color: 'text-red-600', description: '促銷活動管理' },
  { id: 'reports' as Section, icon: BarChart3, label: '統計', color: 'text-violet-600', description: '營運數據分析' },
  { id: 'excel-export' as Section, icon: FileSpreadsheet, label: 'Excel', color: 'text-teal-600', description: '會計報表導出' },
  { id: 'linebot' as Section, icon: MessageCircle, label: 'LINE', color: 'text-green-500', description: 'LINE Bot 設定' },
  { id: 'chat' as Section, icon: Sparkles, label: 'AI 助手', color: 'text-purple-500', description: '智能 AI 對話' },
]

// 底部 Tab 導航的項目
const tabItems = [
  { id: 'dashboard' as Section, label: '首頁', icon: Home },
  { id: 'orders' as Section, label: '訂單', icon: ShoppingCart, badge: 0 },
  { id: 'customers' as Section, label: '客戶', icon: Users },
  { id: 'inventory' as Section, label: '庫存', icon: Package },
  { id: 'more' as Section, label: '更多', icon: Grid3x3 },
]

// 禁用預渲染以避免服務端渲染問題
export const dynamic = 'force-dynamic'

export default function GasManagementSystem() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('dashboard')
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 檢查登入狀態 - 優先從 localStorage，再從 API 獲取
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 先檢查 localStorage
        const storedName = localStorage.getItem('user_name')
        const storedRole = localStorage.getItem('user_role')
        const storedToken = localStorage.getItem('auth_token')

        if (storedName && storedRole && storedToken) {
          setUserName(storedName)
          setUserRole(storedRole)
          setIsAuthenticated(true)
          setLoading(false)
          return
        }

        // 如果 localStorage 沒有 Token，從 API 獲取
        const token = localStorage.getItem('auth_token')
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch('/api/auth/me', { headers })
        if (response.ok) {
          const data = await response.json()
          setUserName(data.user.name)
          setUserRole(data.user.role)
          setIsAuthenticated(true)

          // 保存到 localStorage
          localStorage.setItem('user_name', data.user.name)
          localStorage.setItem('user_role', data.user.role)
          localStorage.setItem('user_username', data.user.username)
        } else {
          // 未登入，重定向到登入頁
          router.push('/login')
        }
      } catch (error) {
        console.error('Fetch user error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  // 监听自定义导航事件
  useEffect(() => {
    const handleNavigateToCustomers = () => {
      setActiveSection('customers')
    }

    window.addEventListener('navigateToCustomers', handleNavigateToCustomers)

    return () => {
      window.removeEventListener('navigateToCustomers', handleNavigateToCustomers)
    }
  }, [])

  // 登出處理
  const handleLogout = async () => {
    triggerHaptic('medium')
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    }
    triggerHaptic('success')
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'customers':
        return <CustomerManagement />
      case 'orders':
        return <OrderManagement />
      case 'inventory':
        return <InventoryManagement />
      case 'checks':
        return <CheckManagement />
      case 'meter':
        return <MeterReadingManagement />
      case 'staff':
        return <StaffManagement />
      case 'costs':
        return <CostAnalysis />
      case 'monthly':
        return <MonthlyStatementPage />
      case 'calls':
        return <CallRecordsPage />
      case 'marketing':
        return <MarketingManagement />
      case 'reports':
        return <ReportsAnalysis />
      case 'linebot':
        return <LineBotManagement />
      case 'excel-export':
        return <ExcelExportTool />
      case 'chat':
        return <ChatSection />
      case 'dashboard':
      default:
        return <DashboardSection setActiveSection={setActiveSection} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 ios-safe-area">
      {/* Header - iOS 優化 */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/80 sticky top-0 z-30 ios-card-shadow">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <IOSButton
              variant="ghost"
              size="icon"
              haptic={true}
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </IOSButton>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 p-2 rounded-xl shadow-lg">
                <BrandIcon size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  九九瓦斯行
                </h1>
                <p className="text-xs text-slate-500 hidden md:block">2025智能管理平台</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* 登入/登出按鈕 */}
            {userName && !loading ? (
              <>
                <div className="hidden md:flex items-center gap-2 mr-2">
                  <span className="text-sm text-slate-600">{userName}</span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                    {userRole === 'admin' ? '管理員' : userRole}
                  </span>
                </div>
                <IOSButton
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="hover:bg-red-50 hover:text-red-600"
                  title="登出"
                >
                  <LogOut className="h-5 w-5" />
                </IOSButton>
              </>
            ) : loading ? (
              <div className="h-11 w-11 animate-pulse bg-slate-200 rounded-xl" />
            ) : null}
            <IOSButton
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => {
                triggerHaptic('light')
                setSearchOpen(true)
              }}
              title="搜尋"
            >
              <Search className="h-5 w-5 text-slate-600" />
            </IOSButton>
            <div className="relative">
              <IOSButton
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  triggerHaptic('light')
                  setNotificationOpen(true)
                }}
                title="通知"
                className="relative z-10"
              >
                <Bell className="h-5 w-5 text-slate-600" />
                <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
              </IOSButton>
            </div>
            <IOSButton
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => {
                triggerHaptic('light')
                setSettingsOpen(true)
              }}
              title="設定"
            >
              <Settings className="h-5 w-5 text-slate-600" />
            </IOSButton>
          </div>
        </div>
      </header>

      {/* 搜尋面板 - iOS Modal */}
      <IOSModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="搜尋功能"
        size="md"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="搜尋客戶、訂單、庫存..."
            className="w-full px-5 py-4 text-easy-body border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-3 focus:ring-orange-500 focus:border-orange-500 transition-all"
            autoFocus
          />
          <div className="bg-orange-50 rounded-2xl p-5 border-l-4 border-orange-500">
            <p className="text-easy-body font-semibold text-gray-900 mb-1">💡 搜尋提示</p>
            <p className="text-easy-body-small text-gray-600">輸入客戶名稱、電話或訂單編號</p>
          </div>

          <div className="space-y-2">
            <p className="text-easy-subheading font-bold text-gray-900">快速搜尋</p>
            {['今日訂單', '待配送', '庫存不足', '月結客戶'].map((item) => (
              <button
                key={item}
                onClick={() => {
                  triggerHaptic('light')
                  setSearchOpen(false)
                }}
                className="w-full text-left px-5 py-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-easy-body font-medium transition-colors ios-no-select"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </IOSModal>

      {/* 通知面板 - iOS Sheet */}
      <IOSSheet
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        title="通知中心"
        height="half"
      >
        <div className="space-y-0 px-4">
          {[
            { title: '🔔 庫存提醒', desc: '20kg 瓦斯庫存不足 10 桶', color: 'border-orange-500 bg-orange-50', action: () => setActiveSection('inventory') },
            { title: '💰 新訂單', desc: '王小姐剛剛下了新訂單', color: 'border-green-500 bg-green-50', action: () => setActiveSection('orders') },
            { title: '📊 今日營收', desc: '今日營收已突破 NT$10,000', color: 'border-blue-500 bg-blue-50', action: () => setActiveSection('reports') },
          ].map((notif, index) => (
            <div
              key={index}
              onClick={() => {
                triggerHaptic('light')
                setNotificationOpen(false)
                if (notif.action) {
                  setTimeout(() => notif.action(), 300)
                }
              }}
              className={`w-full flex flex-col gap-1 px-4 py-4 border-l-4 ${notif.color} bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer ios-no-select`}
            >
              <div className="font-semibold text-base text-gray-900">{notif.title}</div>
              <div className="text-sm text-gray-600">{notif.desc}</div>
            </div>
          ))}
        </div>
        <IOSCancelButton onPress={() => setNotificationOpen(false)} />
      </IOSSheet>

      {/* 設定面板 - iOS Modal */}
      <IOSModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="系統設定"
        size="md"
      >
        <div className="space-y-3">
          {[
            { title: '🌙 深色模式', desc: '調整介面主題', action: '開啟' },
            { title: '🔔 推播通知', desc: '接收重要通知', action: '已開啟' },
            { title: '🔊 語音輸入', desc: '啟用語音指令', action: '已開啟' },
            { title: '🤖 AI 助手', desc: '智能對話助手', action: '流暢' },
          ].map((setting) => (
            <div
              key={setting.title}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl"
            >
              <div>
                <p className="text-easy-body font-semibold text-gray-900">{setting.title}</p>
                <p className="text-easy-body-small text-gray-500">{setting.desc}</p>
              </div>
              <button
                onClick={() => triggerHaptic('light')}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform"
              >
                {setting.action}
              </button>
            </div>
          ))}
        </div>
      </IOSModal>

      {/* Mobile Menu - iOS 優化 */}
      {mobileMenuOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm ios-safe-area"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* 側邊菜單 */}
          <div className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl ios-safe-area overflow-y-auto animate-in ios-slide-in-left duration-300">
            <div className="sticky top-0 bg-white z-10 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-xl shadow-lg">
                    <BrandIcon size={24} />
                  </div>
                  <span className="text-xl font-bold text-gray-900">瓦斯行管理</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 -mr-3 hover:bg-gray-100 rounded-xl transition-colors ios-no-select"
                >
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>
            </div>

            <nav className="p-4 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    triggerHaptic('light')
                    setActiveSection(item.id)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-200 ios-no-select ${
                    activeSection === item.id
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className={`h-7 w-7 flex-shrink-0 ${activeSection === item.id ? 'text-white' : item.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-lg font-bold ${activeSection === item.id ? 'text-white' : 'text-gray-900'}`}>
                      {item.label}
                    </p>
                    <p className={`text-sm ${activeSection === item.id ? 'text-orange-100' : 'text-gray-500'}`}>
                      {item.description}
                    </p>
                  </div>
                  {activeSection === item.id && (
                    <ChevronRight className="h-6 w-6 text-white flex-shrink-0" />
                  )}
                </button>
              ))}
            </nav>

            {/* 底部資訊 */}
            <div className="p-5 border-t border-gray-200 mt-4">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">Jy技術團隊開發</p>
                <p className="text-xs text-gray-500 mt-1">技術總監：BossJy</p>
                <p className="text-xs text-gray-400 mt-2">© 2025 v2.0.0 Pro</p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-64 bg-white/50 backdrop-blur-lg border-r border-slate-200 min-h-[calc(100vh-72px)]">
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ios-no-select ${
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <item.icon className={`h-5 w-5 ${activeSection === item.id ? 'text-orange-600' : 'text-slate-500'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 pb-32 md:pb-6">
          <div className="max-w-7xl mx-auto">
            {renderSection()}
          </div>
        </main>
      </div>

      {/* iOS 風格底部 Tab 導航 (僅 Mobile) */}
      <div className="md:hidden">
        <IOSTabBar
          tabs={tabItems}
          activeTab={activeSection}
          onTabChange={(tabId) => {
            if (tabId === 'more') {
              setMobileMenuOpen(true)
            } else {
              setActiveSection(tabId as Section)
            }
          }}
        />
      </div>

      {/* Footer - Desktop only */}
      <footer className="hidden md:block bg-white/80 backdrop-blur-lg border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-1.5 rounded-lg flex items-center justify-center">
                <BrandIcon size={16} className="text-white" />
              </div>
              <span className="text-sm text-slate-600">© 2025 九九瓦斯行管理系統</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="inline px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">版本 2.0.0 Pro</span>
              <span>•</span>
              <span className="font-medium text-slate-700">Jy技術團隊開發</span>
              <span>•</span>
              <span className="font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">BossJy</span>
            </div>
          </div>
        </div>
      </footer>

      {/* AI 助手 - 全局浮動 */}
      <AIAssistant />
    </div>
  )
}

function DashboardSection({ setActiveSection }: { setActiveSection: (section: Section) => void }) {
  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingDeliveries: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    inventoryCount: 0,
    pendingChecks: 0,
  })

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      const [ordersRes, customersRes, inventoryRes, checksRes] = await Promise.all([
        fetch('/api/orders?status=pending,processing'),
        fetch('/api/customers'),
        fetch('/api/inventory'),
        fetch('/api/checks?status=pending,deposited'),
      ])

      if (ordersRes.ok) {
        const orders = await ordersRes.json()
        const today = new Date().toISOString().split('T')[0]
        const todayOrders = orders.filter((o: any) => o.createdAt.startsWith(today)).length

        setStats((prev) => ({
          ...prev,
          todayOrders,
          pendingDeliveries: orders.length,
        }))
      }

      if (customersRes.ok) {
        const customers = await customersRes.json()
        setStats((prev) => ({ ...prev, totalCustomers: customers.length || 0 }))
      }

      if (inventoryRes.ok) {
        const inventory = await inventoryRes.json()
        const totalCount = inventory.reduce((sum: number, item: any) => sum + item.quantity, 0)
        setStats((prev) => ({ ...prev, inventoryCount: totalCount }))
      }

      if (checksRes.ok) {
        const checks = await checksRes.json()
        setStats((prev) => ({ ...prev, pendingChecks: checks.length || 0 }))
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleInitialize = async () => {
    try {
      triggerHaptic('medium')
      const response = await fetch('/api/init', {
        method: 'POST',
      })
      if (response.ok) {
        triggerHaptic('success')
        alert('系統初始化成功！已創建2025年最新產品價格和客戶分組。')
        window.location.reload()
      } else {
        triggerHaptic('error')
        alert('初始化失敗')
      }
    } catch (error) {
      console.error('Error initializing:', error)
      triggerHaptic('error')
      alert('初始化失敗')
    }
  }

  const dashboardStats = [
    {
      label: '今日訂單',
      value: stats.todayOrders.toString(),
      change: '新增',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      icon: ShoppingCart,
    },
    {
      label: '待配送',
      value: stats.pendingDeliveries.toString(),
      change: '配送中',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      icon: Truck,
    },
    {
      label: '本月營業額',
      value: `NT$${stats.monthlyRevenue.toLocaleString()}`,
      change: '統計中',
      color: 'text-green-600',
      bg: 'bg-green-50',
      icon: DollarSign,
    },
    {
      label: '客戶總數',
      value: stats.totalCustomers.toString(),
      change: '活躍',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      icon: Users,
    },
    {
      label: '瓦斯庫存',
      value: `${stats.inventoryCount}桶`,
      change: '管理庫存',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      icon: Package,
    },
    {
      label: '待收支票',
      value: `${stats.pendingChecks}張`,
      change: '記錄支票',
      color: 'text-pink-600',
      bg: 'bg-pink-50',
      icon: CheckSquare,
    },
  ]

  return (
    <div className="space-y-6 pb-8 md:pb-6">
      {/* 歡迎區域 - iOS 優化 */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 rounded-3xl p-8 text-white shadow-2xl ios-card-shadow-elevated ios-safe-area-top relative">
        <div className="absolute top-4 right-4">
          <AlertBadge />
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-easy-title text-white mb-3">九九瓦斯行管理系統</h2>
            <p className="text-xl text-orange-100 font-medium">2025 智能瓦斯營運管理平台</p>
            <p className="text-lg text-orange-200 mt-2">Jy技術團隊開發 • BossJy 技術總監</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <IOSButton
              onClick={handleInitialize}
              variant="default"
              size="lg"
              className="bg-white text-orange-600 hover:bg-orange-50"
            >
              <Plus className="h-6 w-6" />
              初始化系統
            </IOSButton>
            <IOSButton
              variant="outline"
              size="lg"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
            >
              <FileText className="h-6 w-6" />
              系統手冊
            </IOSButton>
          </div>
        </div>
      </div>

      {/* 智能提醒 + 快速操作 + 語音助手 - 三列佈局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SmartAlerts limit={3} showHeader={true} />
        <QuickActions onSectionChange={(section) => setActiveSection(section as Section)} />
        <VoiceQuickQuery />
      </div>

      {/* 快速操作 - iOS 大按鈕網格 */}
      <div>
        <h3 className="text-easy-heading text-gray-900 mb-4">快速操作</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: Users, label: '新增客戶', id: 'customers' as Section, color: 'bg-blue-500' },
            { icon: ShoppingCart, label: '創建訂單', id: 'orders' as Section, color: 'bg-purple-500' },
            { icon: Package, label: '查看庫存', id: 'inventory' as Section, color: 'bg-orange-500' },
            { icon: Calculator, label: '抄錶計算', id: 'meter' as Section, color: 'bg-cyan-500' },
          ].map((action) => (
            <IOSCard
              key={action.id}
              pressable
              onPress={() => {
                triggerHaptic('light')
                setActiveSection(action.id)
              }}
              className="text-center p-6"
            >
              <div className={`${action.color} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                <action.icon className="h-8 w-8 text-white" />
              </div>
              <p className="text-lg font-bold text-gray-900">{action.label}</p>
            </IOSCard>
          ))}
        </div>
      </div>

      {/* 統計數據 - iOS 大卡片 */}
      <div>
        <h3 className="text-easy-heading text-gray-900 mb-4">今日概況</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboardStats.map((stat) => (
            <IOSCard key={stat.label} className="p-5" elevated>
              <div className="flex items-start justify-between mb-3">
                <div className={`${stat.bg} p-3 rounded-xl`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${stat.bg} ${stat.color}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-easy-body text-gray-600 font-medium">{stat.label}</p>
              <p className="text-easy-title text-gray-900">{stat.value}</p>
            </IOSCard>
          ))}
        </div>
      </div>

      {/* 司機配送快捷入口 */}
      <IOSCard>
        <IOSCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-green-600" />
              <IOSCardTitle>司機配送</IOSCardTitle>
            </div>
            <IOSButton
              variant="outline"
              size="sm"
              onClick={() => setActiveSection('orders')}
            >
              查看全部
            </IOSButton>
          </div>
        </IOSCardHeader>
        <IOSCardContent>
          <div className="text-center py-6 text-gray-500">
            <p className="text-easy-body">📦 有 {stats.pendingDeliveries} 筆訂單待配送</p>
            <p className="text-easy-caption text-gray-400 mt-1">點擊查看全部進入配送模式</p>
          </div>
        </IOSCardContent>
      </IOSCard>

      {/* 所有功能列表 - iOS 列表樣式 */}
      <div>
        <h3 className="text-easy-heading text-gray-900 mb-4">全部功能</h3>
        <IOSList>
          {menuItems.slice(1).map((item) => (
            <IOSListItem
              key={item.id}
              title={item.label}
              subtitle={item.description}
              leftIcon={<item.icon className={`h-7 w-7 ${item.color}`} />}
              onClick={() => {
                triggerHaptic('light')
                setActiveSection(item.id)
              }}
            />
          ))}
        </IOSList>
      </div>

      {/* 瓦斯價格參考 */}
      <IOSCard className="bg-gradient-to-br from-orange-50 to-red-50">
        <IOSCardHeader>
          <IOSCardTitle>2025年台灣瓦斯參考價格</IOSCardTitle>
          <IOSCardDescription>數據來源：能源署官方數據</IOSCardDescription>
        </IOSCardHeader>
        <IOSCardContent>
          <div className="grid grid-cols-2 gap-4">
            {[
              { size: '4kg', price: 'NT$220' },
              { size: '10kg', price: 'NT$360' },
              { size: '16kg', price: 'NT$550' },
              { size: '20kg', price: 'NT$620-730' },
              { size: '50kg', price: 'NT$1,550' },
            ].map((gas) => (
              <div
                key={gas.size}
                className="bg-white rounded-2xl p-5 border-2 border-orange-200 shadow-sm text-center"
              >
                <p className="text-easy-body text-gray-600 mb-1">{gas.size} 瓦斯</p>
                <p className="text-easy-heading font-bold text-orange-600">{gas.price}</p>
              </div>
            ))}
          </div>
        </IOSCardContent>
      </IOSCard>

      {/* 使用說明 */}
      <IOSCard>
        <IOSCardHeader>
          <IOSCardTitle>快速開始使用</IOSCardTitle>
          <IOSCardDescription>按照以下步驟開始使用系統</IOSCardDescription>
        </IOSCardHeader>
        <IOSCardContent>
          <div className="space-y-4">
            {[
              { step: 1, title: '初始化系統', desc: '點擊「初始化系統」按鈕，創建默認產品和客戶分組' },
              { step: 2, title: '新增客戶', desc: '在客戶管理中添加客戶，選擇現金客戶或月結客戶類型' },
              { step: 3, title: '管理庫存', desc: '進貨瓦斯桶，支持4kg/10kg/16kg/20kg/50kg多種規格' },
              { step: 4, title: '創建訂單', desc: '為客戶創建瓦斯、爐具、熱水器訂單' },
              { step: 5, title: '追蹤配送', desc: '指派司機配送，更新訂單狀態' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
                  {item.step}
                </div>
                <div className="flex-1">
                  <p className="text-easy-body-large font-semibold text-gray-900 mb-1">{item.title}</p>
                  <p className="text-easy-body text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </IOSCardContent>
      </IOSCard>

      {/* 版本資訊 */}
      <IOSCard className="bg-gradient-to-r from-orange-50 to-red-50 text-center">
        <IOSCardContent className="p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-2xl shadow-lg flex items-center justify-center">
              <BrandIcon size={32} className="text-white" />
            </div>
            <div>
              <p className="text-easy-body font-semibold text-gray-900">系統開發：Jy技術團隊</p>
              <p className="text-easy-body font-semibold text-gray-900">技術總監：BossJy</p>
              <p className="text-easy-caption text-gray-600 mt-2">© 2025 九九瓦斯行管理系統 v3.0 Ultra</p>
            </div>
          </div>
        </IOSCardContent>
      </IOSCard>
    </div>
  )
}
