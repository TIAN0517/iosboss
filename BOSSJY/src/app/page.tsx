'use client'

// 台灣花蓮店家自動搜尋與爬取工具
// 2026 Jy技術團隊 BossJy 製作
// 新增功能：下載、批量操作、編輯、刪除、統計面板

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Globe,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Loader2,
  Store,
  Image as ImageIcon,
  ExternalLink,
  Star,
  Users,
  Download,
  Trash2,
  Edit3,
  BarChart3,
  RefreshCw,
  CheckSquare,
  Square,
  Zap,
  Filter
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface StoreInfo {
  name: string
  address: string
  phoneNumber: string
  website?: string
  imageUrl?: string
  signboard?: string
  lineAccount?: string
  location?: string
  lineActive?: boolean
  lineVerifiedAt?: string
  createdAt?: string
  id?: string
  isEditing?: boolean
  isSelected?: boolean
}

interface SearchResult {
  title: string
  url: string
  snippet: string
  hasPhone?: boolean
  hasAddress?: boolean
}

interface StatsData {
  overview: {
    totalStores: number
    storesWithPhone: number
    storesWithAddress: number
    storesWithImage: number
    storesWithLineAccount: number
    averageCompleteness: number
  }
  lineStats: {
    lineActive: number
    lineInactive: number
    unverified: number
    verificationRate: number
  }
}

export default function StoreAutoSearchPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractingAll, setExtractingAll] = useState(false)
  const [verifyingLine, setVerifyingLine] = useState<Set<number>>(new Set())
  const [batchVerifying, setBatchVerifying] = useState(false)
  const [autoCrawling, setAutoCrawling] = useState(false)
  const [autoCrawlProgress, setAutoCrawlProgress] = useState({ current: 0, total: 0, stage: '' })
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [extractedStores, setExtractedStores] = useState<StoreInfo[]>([])
  const [savedStores, setSavedStores] = useState<StoreInfo[]>([])
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set())
  const [editingStore, setEditingStore] = useState<StoreInfo | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [deletingStores, setDeletingStores] = useState<Set<string>>(new Set())

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: '請輸入搜尋關鍵字',
        description: '例如：花蓮餐廳、花蓮麵線、吉安鄉咖啡廳',
        variant: 'destructive',
      })
      return
    }

    setSearching(true)
    try {
      const response = await fetch('/api/search-stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      })

      const result = await response.json()

      if (result.success) {
        setSearchResults(result.results || [])
        toast({
          title: '搜尋完成',
          description: `找到 ${result.results?.length || 0} 個相關結果`,
        })
      } else {
        toast({
          title: '搜尋失敗',
          description: result.error || '請稍後再試',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '發生錯誤',
        description: '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setSearching(false)
    }
  }

  const extractStoreInfo = async (url: string, index: number) => {
    setExtracting(true)
    try {
      const response = await fetch('/api/extract-from-web', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const result = await response.json()

      if (result.success && result.store) {
        setExtractedStores(prev => {
          if (prev.some(s => s.name === result.store.name)) {
            return prev
          }
          return [...prev, result.store]
        })
        toast({
          title: '資訊提取成功',
          description: `成功提取 ${result.store.name} 的店家資訊`,
        })
      } else {
        toast({
          title: '提取失敗',
          description: result.error || '無法提取店家資訊',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '發生錯誤',
        description: '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setExtracting(false)
    }
  }

  const extractAllStores = async () => {
    if (searchResults.length === 0) {
      toast({
        title: '沒有搜尋結果',
        description: '請先搜尋店家',
        variant: 'destructive',
      })
      return
    }

    setExtractingAll(true)
    let successCount = 0

    for (let i = 0; i < Math.min(searchResults.length, 20); i++) {
      try {
        const response = await fetch('/api/extract-from-web', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: searchResults[i].url }),
        })

        const result = await response.json()

        if (result.success && result.store) {
          setExtractedStores(prev => {
            if (prev.some(s => s.name === result.store.name)) {
              return prev
            }
            return [...prev, result.store]
          })
          successCount++
        }
      } catch (error) {
        console.error('Failed to extract store:', error)
      }

      await new Promise(resolve => setTimeout(resolve, 300))
    }

    setExtractingAll(false)
    toast({
      title: '批量提取完成',
      description: `成功提取 ${successCount} 個店家資訊`,
    })
  }

  // 檢查店家是否符合所有必要條件
  const isStoreQualified = (store: StoreInfo): boolean => {
    return !!(
      store.phoneNumber &&
      store.phoneNumber.trim() !== '' &&
      store.address &&
      store.address.trim() !== '' &&
      store.signboard &&
      store.signboard.trim() !== '' &&
      store.lineAccount &&
      store.lineAccount.trim() !== ''
    )
  }

  // 一鍵自動爬取：搜尋 → 提取 → 過濾 → 驗證LINE → 儲存
  const autoCrawlAll = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: '請輸入搜尋關鍵字',
        description: '例如：花蓮餐廳、花蓮麵線、吉安鄉咖啡廳',
        variant: 'destructive',
      })
      return
    }

    setAutoCrawling(true)
    setAutoCrawlProgress({ current: 0, total: 0, stage: '正在搜尋...' })
    setExtractedStores([])
    setSearchResults([])

    try {
      // 步驟 1: 搜尋
      setAutoCrawlProgress({ current: 0, total: 0, stage: '正在搜尋店家...' })
      const searchResponse = await fetch('/api/search-stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      })
      const searchResult = await searchResponse.json()

      if (!searchResult.success || !searchResult.results?.length) {
        toast({
          title: '搜尋失敗',
          description: '找不到相關店家，請嘗試其他關鍵字',
          variant: 'destructive',
        })
        setAutoCrawling(false)
        return
      }

      setSearchResults(searchResult.results || [])
      const results = searchResult.results.slice(0, 15) // 最多處理15個
      setAutoCrawlProgress({ current: 0, total: results.length, stage: '正在提取店家資訊...' })

      // 步驟 2: 提取所有店家資訊
      const extracted: StoreInfo[] = []
      for (let i = 0; i < results.length; i++) {
        setAutoCrawlProgress({ current: i + 1, total: results.length, stage: `正在提取 ${i + 1}/${results.length}...` })

        try {
          const extractResponse = await fetch('/api/extract-from-web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: results[i].url }),
          })
          const extractResult = await extractResponse.json()

          if (extractResult.success && extractResult.store) {
            extracted.push(extractResult.store)
          }
        } catch (error) {
          console.error('提取失敗:', results[i].url)
        }

        await new Promise(resolve => setTimeout(resolve, 200)) // 避免請求過快
      }

      setExtractedStores(extracted)

      // 步驟 3: 過濾只保留符合條件的店家
      const qualifiedStores = extracted.filter(isStoreQualified)
      setAutoCrawlProgress({ current: 0, total: qualifiedStores.length, stage: `正在驗證LINE (${qualifiedStores.length}個符合條件)...` })

      // 步驟 4: 驗證LINE
      for (let i = 0; i < qualifiedStores.length; i++) {
        const store = qualifiedStores[i]
        if (store.phoneNumber) {
          setAutoCrawlProgress({ current: i + 1, total: qualifiedStores.length, stage: `正在驗證LINE ${i + 1}/${qualifiedStores.length}...` })

          try {
            const verifyResponse = await fetch('/api/verify-line', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phoneNumber: store.phoneNumber,
                storeName: store.name,
              }),
            })
            const verifyResult = await verifyResponse.json()

            if (verifyResult.success) {
              // 更新本地資料
              const updateIndex = extracted.findIndex(s => s.name === store.name)
              if (updateIndex !== -1) {
                extracted[updateIndex] = {
                  ...extracted[updateIndex],
                  lineActive: verifyResult.lineActive,
                  lineVerifiedAt: new Date().toISOString(),
                }
              }
            }
          } catch (error) {
            console.error('LINE驗證失敗:', store.name)
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }

      setExtractedStores([...extracted])

      // 重新過濾符合條件的店家
      const finalQualified = extracted.filter(isStoreQualified)

      // 步驟 5: 自動儲存符合條件的店家
      setAutoCrawlProgress({ current: 0, total: finalQualified.length, stage: '正在儲存店家...' })
      let savedCount = 0
      const skippedCount = extracted.length - finalQualified.length

      for (let i = 0; i < finalQualified.length; i++) {
        const store = finalQualified[i]
        setAutoCrawlProgress({ current: i + 1, total: finalQualified.length, stage: `正在儲存 ${i + 1}/${finalQualified.length}...` })

        try {
          const saveResponse = await fetch('/api/stores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(store),
          })

          if (saveResponse.ok) {
            savedCount++
          }
        } catch (error) {
          console.error('儲存失敗:', store.name)
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // 重新載入已儲存的店家
      await loadSavedStores()

      // 步驟 6: 顯示結果摘要
      setAutoCrawling(false)
      toast({
        title: '🎉 一鍵自動爬取完成！',
        description: (
          <div className="mt-2 space-y-1">
            <p>✅ 成功儲存 <strong>{savedCount}</strong> 個符合條件的店家</p>
            <p>⚠️ 跳過 <strong>{skippedCount}</strong> 個資料不完整的店家</p>
            <p className="text-sm text-slate-400">
              條件：電話 + 地址 + 招牌照片 + LINE帳號
            </p>
          </div>
        ),
      })

    } catch (error) {
      console.error('自動爬取失敗:', error)
      setAutoCrawling(false)
      toast({
        title: '發生錯誤',
        description: '自動爬取失敗，請稍後再試',
        variant: 'destructive',
      })
    }
  }

  const verifyLineActive = async (index: number, phoneNumber: string) => {
    if (!phoneNumber) {
      toast({
        title: '沒有電話號碼',
        variant: 'destructive',
      })
      return
    }

    setVerifyingLine(prev => new Set(prev).add(index))
    try {
      const response = await fetch('/api/verify-line', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          storeName: extractedStores[index].name,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setExtractedStores(prev => {
          const newStores = [...prev]
          newStores[index] = {
            ...newStores[index],
            lineActive: result.lineActive,
            lineVerifiedAt: new Date().toISOString(),
          }
          return newStores
        })
        toast({
          title: result.lineActive ? 'LINE活躍' : 'LINE未活躍',
          description: `電話號碼 ${phoneNumber} ${result.lineActive ? '在LINE上活躍' : '在LINE上未活躍'}`,
        })
      } else {
        toast({
          title: '驗證失敗',
          description: result.error || '請稍後再試',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '發生錯誤',
        description: '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setVerifyingLine(prev => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }
  }

  const batchVerifyLine = async () => {
    if (extractedStores.length === 0) {
      toast({
        title: '沒有可驗證的店家',
        variant: 'destructive',
      })
      return
    }

    setBatchVerifying(true)
    const storeIds = extractedStores.filter(s => s.phoneNumber).map(s => s.id!).filter(Boolean)

    if (storeIds.length === 0) {
      setBatchVerifying(false)
      toast({
        title: '沒有電話號碼的店家',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: storeIds }),
      })

      const result = await response.json()

      if (result.success) {
        // 更新所有店家的 LINE 狀態
        setExtractedStores(prev => 
          prev.map((store, idx) => {
            const result = result.results.find((r: any) => r.id === store.id)
            if (result && result.success) {
              return {
                ...store,
                lineActive: result.lineActive,
                lineVerifiedAt: new Date().toISOString(),
              }
            }
            return store
          })
        )
        toast({
          title: '批量驗證完成',
          description: `成功驗證 ${result.results.filter((r: any) => r.success).length} 個店家`,
        })
      } else {
        toast({
          title: '批量驗證失敗',
          description: result.error || '請稍後再試',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '發生錯誤',
        description: '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setBatchVerifying(false)
    }
  }

  const saveStore = async (index: number) => {
    const store = extractedStores[index]
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...store,
          lineAccount: store.lineAccount,
        }),
      })

      if (response.ok) {
        toast({
          title: '儲存成功',
          description: `${store.name} 已儲存`,
        })
        loadSavedStores()
      } else {
        toast({
          title: '儲存失敗',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '發生錯誤',
        description: '請稍後再試',
        variant: 'destructive',
      })
    }
  }

  const saveAllStores = async () => {
    if (extractedStores.length === 0) {
      toast({
        title: '沒有可儲存的店家',
        variant: 'destructive',
      })
      return
    }

    let successCount = 0
    for (let i = 0; i < extractedStores.length; i++) {
      try {
        const response = await fetch('/api/stores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...extractedStores[i],
            lineAccount: extractedStores[i].lineAccount,
          }),
        })

        if (response.ok) successCount++
      } catch (error) {
        console.error('Failed to save store:', error)
      }
    }

    toast({
      title: '批量儲存完成',
      description: `成功儲存 ${successCount} 個店家`,
    })
    loadSavedStores()
  }

  const deleteStore = async (storeId: string) => {
    setDeletingStores(prev => new Set(prev).add(storeId))
    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: '刪除成功',
          description: '店家已刪除',
        })
        
        // 從提取列表中移除
        setExtractedStores(prev => prev.filter(s => s.id !== storeId))
        setSelectedStores(prev => {
          const newSet = new Set(prev)
          newSet.delete(storeId)
          return newSet
        })
        loadSavedStores()
      } else {
        toast({
          title: '刪除失敗',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '發生錯誤',
        description: '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setDeletingStores(prev => {
        const newSet = new Set(prev)
        newSet.delete(storeId)
        return newSet
      })
    }
  }

  const batchDeleteStores = async () => {
    const selectedIds = Array.from(selectedStores)
    if (selectedIds.length === 0) {
      toast({
        title: '請先選擇要刪除的店家',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedIds }),
      })

      if (response.ok) {
        toast({
          title: '批量刪除成功',
          description: `成功刪除 ${selectedIds.length} 個店家`,
        })
        
        // 更新列表
        setExtractedStores(prev => prev.filter(s => !selectedIds.includes(s.id!)))
        setSavedStores(prev => prev.filter(s => !selectedIds.includes(s.id!)))
        setSelectedStores(new Set())
      } else {
        toast({
          title: '批量刪除失敗',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '發生錯誤',
        description: '請稍後再試',
        variant: 'destructive',
      })
    }
  }

  const downloadCSV = async () => {
    try {
      const response = await fetch('/api/export-stores')
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `花蓮店家資訊_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        toast({
          title: '下載成功',
          description: '店家資訊已匯出為 CSV',
        })
      }
    } catch (error) {
      toast({
        title: '下載失敗',
        description: '請稍後再試',
        variant: 'destructive',
      })
    }
  }

  const loadSavedStores = async () => {
    try {
      const response = await fetch('/api/stores')
      if (response.ok) {
        const data = await response.json()
        setSavedStores(data.stores || [])
      }
    } catch (error) {
      console.error('Failed to load stores:', error)
    }
  }

  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const response = await fetch('/api/stats')
      if (response.ok) {
        const data = await response.json()
        setStatsData(data.stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
      toast({
        title: '載入統計失敗',
        variant: 'destructive',
      })
    } finally {
      setLoadingStats(false)
    }
  }

  const toggleStoreSelection = (storeId: string) => {
    setSelectedStores(prev => {
      const newSet = new Set(prev)
      if (newSet.has(storeId)) {
        newSet.delete(storeId)
      } else {
        newSet.add(storeId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedStores.size === extractedStores.length) {
      setSelectedStores(new Set())
    } else {
      setSelectedStores(new Set(extractedStores.map(s => s.id!).filter(Boolean)))
    }
  }

  const startEditing = (store: StoreInfo) => {
    setEditingStore({ ...store, isEditing: true })
  }

  const saveEdit = () => {
    if (!editingStore || !editingStore.id) return
    
    // 更新到提取列表
    setExtractedStores(prev => 
      prev.map(s => s.id === editingStore.id ? editingStore : s)
    )
    
    setEditingStore(null)
    toast({
      title: '編輯已儲存',
      description: '店家資訊已更新',
    })
  }

  const cancelEdit = () => {
    setEditingStore(null)
  }

  const toggleStats = () => {
    if (showStats) {
      setShowStats(false)
    } else {
      loadStats()
    }
    setShowStats(!showStats)
  }

  // 鼓入已儲存的店家
  useState(() => {
    loadSavedStores()
  })

  // 計算資訊完整度
  const getCompletenessScore = (store: StoreInfo) => {
    let score = 0
    if (store.name) score += 25
    if (store.phoneNumber) score += 25
    if (store.address) score += 25
    if (store.imageUrl) score += 15
    if (store.lineAccount || store.lineActive) score += 10
    return score
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 pb-20">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            台灣花蓮店家自動搜尋工具
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            AI驅動的自動搜尋、爬取、資訊提取與LINE驗證系統
          </p>
        </div>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search">搜尋與提取</TabsTrigger>
            <TabsTrigger value="extracted">已提取店家</TabsTrigger>
            <TabsTrigger value="saved">已儲存店家</TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="mr-2 h-4 w-4" />
              統計
            </TabsTrigger>
          </TabsList>

          {/* 搜尋與提取頁籤 */}
          <TabsContent value="search" className="space-y-6">
            {/* 搜尋區域 */}
            <Card>
              <CardHeader>
                <CardTitle>搜尋店家</CardTitle>
                <CardDescription>
                  自動搜尋網路上有推廣的台灣花蓮店家資訊
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="輸入關鍵字，例如：花蓮餐廳、花蓮麵線、吉安鄉咖啡廳..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                    disabled={autoCrawling}
                  />
                  <Button onClick={handleSearch} disabled={searching || autoCrawling}>
                    {searching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        搜尋
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        搜尋
                      </>
                    )}
                  </Button>
                </div>

                {/* 一鍵自動爬取按鈕 */}
                <Button
                  onClick={autoCrawlAll}
                  disabled={autoCrawling || !searchQuery.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  {autoCrawling ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      <span className="flex-1 text-left">
                        {autoCrawlProgress.stage}
                        {autoCrawlProgress.total > 0 && (
                          <span className="ml-2 text-sm opacity-80">
                            ({autoCrawlProgress.current}/{autoCrawlProgress.total})
                          </span>
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-5 w-5" />
                      一鍵自動爬取（自動過濾只儲存完整資料）
                    </>
                  )}
                </Button>

                {/* 進度提示 */}
                {autoCrawling && (
                  <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>自動過濾條件：電話 + 地址 + 招牌照片 + LINE帳號</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 搜尋結果 */}
            {searchResults.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>搜尋結果</CardTitle>
                    <CardDescription>
                      找到 {searchResults.length} 個相關店家
                    </CardDescription>
                  </div>
                  <Button
                    onClick={extractAllStores}
                    disabled={extractingAll}
                    size="sm"
                  >
                    {extractingAll || extracting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      '全部提取（最多20個）'
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {searchResults.map((result, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="mb-2 flex items-center gap-2">
                                <h4 className="font-semibold line-clamp-2">{result.title}</h4>
                                <div className="flex gap-2">
                                  {result.hasPhone && (
                                    <Badge variant="default" className="bg-green-600">
                                      <Phone className="mr-1 h-3 w-3" />
                                      有電話
                                    </Badge>
                                  )}
                                  {result.hasAddress && (
                                    <Badge variant="outline">
                                      <MapPin className="mr-1 h-3 w-3" />
                                      有地址
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="mb-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                {result.snippet}
                              </p>
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {result.url}
                              </a>
                            </div>
                            <Button
                              onClick={() => extractStoreInfo(result.url, index)}
                              disabled={extracting || extractingAll}
                              size="sm"
                            >
                              {extracting || extractingAll ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                '提取資訊'
                              )}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 已提取店家頁籤 */}
          <TabsContent value="extracted" className="space-y-4">
            {/* 操作工具欄 */}
            {extractedStores.length > 0 && (
              <Card className="mb-4">
                <CardContent className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2">
                    {/* 選擇全部 */}
                    <Button
                      onClick={toggleSelectAll}
                      variant="outline"
                      size="sm"
                    >
                      {selectedStores.size === extractedStores.length ? (
                        <>
                          <Square className="mr-1 h-4 w-4" />
                          取消選擇
                        </>
                      ) : (
                        <>
                          <CheckSquare className="mr-1 h-4 w-4" />
                          選擇全部
                        </>
                      )}
                    </Button>

                    {/* 批量LINE驗證 */}
                    <Button
                      onClick={batchVerifyLine}
                      disabled={batchVerifying}
                      variant="outline"
                      size="sm"
                    >
                      {batchVerifying ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="mr-1 h-4 w-4" />
                          批量驗證LINE
                        </>
                      )}
                    </Button>

                    {/* 批量儲存 */}
                    <Button
                      onClick={saveAllStores}
                      variant="outline"
                      size="sm"
                    >
                      <>
                        <Download className="mr-1 h-4 w-4" />
                        全部儲存
                      </>
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    {/* 批量刪除 */}
                    <Button
                      onClick={batchDeleteStores}
                      disabled={selectedStores.size === 0}
                      variant="destructive"
                      size="sm"
                    >
                      {selectedStores.size > 0 ? (
                        <>
                          <Trash2 className="mr-1 h-4 w-4" />
                          批量刪除（{selectedStores.size}）
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-1 h-4 w-4" />
                          批量刪除
                        </>
                      )}
                    </Button>

                    {/* 下載CSV */}
                    <Button
                      onClick={downloadCSV}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="mr-1 h-4 w-4" />
                      匯出CSV
                    </Button>
                  </div>

                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    已提取 {extractedStores.length} 個店家
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 店家列表 */}
            <ScrollArea className="h-[650px]">
              <div className="space-y-4">
                {extractedStores.length === 0 ? (
                  <Card>
                    <CardContent className="flex h-48 items-center justify-center text-slate-400">
                      <div className="text-center">
                        <Store className="mx-auto mb-4 h-12 w-12" />
                        <p>尚未提取任何店家</p>
                        <p className="text-sm">請先搜尋店家並提取資訊</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  // 按完整度排序
                  extractedStores
                    .sort((a, b) => getCompletenessScore(b) - getCompletenessScore(a))
                    .map((store, index) => (
                      <Card key={store.id || index} className={`p-4 border-2 transition-all ${selectedStores.has(store.id || '') ? 'border-primary bg-primary/5' : ''}`}>
                        <div className="space-y-4">
                          {/* 選擇框 */}
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedStores.has(store.id || '')}
                              onChange={() => toggleStoreSelection(store.id || '')}
                              className="mt-1 h-5 w-5"
                            />
                            <div className="flex-1">
                              {/* 完整度 */}
                              <Badge 
                                variant={getCompletenessScore(store) >= 80 ? 'default' : 'outline'}
                                className={getCompletenessScore(store) >= 80 ? 'bg-green-600' : ''}
                              >
                                完整度 {getCompletenessScore(store)}%
                              </Badge>

                              {/* LINE狀態 */}
                              {store.lineActive === true ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  LINE活躍
                                </Badge>
                              ) : store.lineActive === false ? (
                                <Badge variant="destructive">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  LINE未活躍
                                </Badge>
                              ) : store.lineVerifiedAt ? (
                                <Badge variant="outline">
                                  已驗證
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          {/* 編輯/刪除按鈕 */}
                          <div className="flex gap-2">
                            {editingStore?.id === store.id ? (
                              <div className="flex gap-1">
                                <Button
                                  onClick={saveEdit}
                                  size="sm"
                                  variant="outline"
                                >
                                  <CheckSquare className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={cancelEdit}
                                  size="sm"
                                  variant="ghost"
                                >
                                  取消
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => startEditing(store)}
                                size="sm"
                                variant="ghost"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              onClick={() => store.id && deleteStore(store.id)}
                              disabled={deletingStores.has(store.id || '')}
                              variant="ghost"
                              size="sm"
                            >
                              {deletingStores.has(store.id || '') ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          {/* 驗證LINE */}
                          {store.phoneNumber && !store.lineActive && (
                            <Button
                              onClick={() => verifyLineActive(index, store.phoneNumber!)}
                              disabled={verifyingLine.has(index)}
                              variant="outline"
                              size="sm"
                            >
                              {verifyingLine.has(index) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Phone className="mr-1 h-4 w-4" />
                                  驗證LINE
                                </>
                              )}
                            </Button>
                          )}

                          {/* 儲存 */}
                          <Button
                            onClick={() => saveStore(index)}
                            variant="default"
                            size="sm"
                          >
                            儲存店家
                          </Button>
                        </div>

                        {/* 店家圖片 */}
                        {store.imageUrl && (
                          <div className="aspect-video w-full overflow-hidden rounded-lg border">
                            <img
                              src={store.imageUrl}
                              alt={store.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        )}

                        {/* 店家基本資訊 */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold">
                                {editingStore?.id === store.id ? (
                                  <Input
                                    value={editingStore.name}
                                    onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                                    className="flex-1"
                                    autoFocus
                                  />
                                ) : (
                                  store.name
                                )}
                              </h4>
                            </div>
                          </div>

                          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <p className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span className="font-medium text-slate-900 dark:text-slate-50">
                                {store.phoneNumber || '未提供'}
                              </span>
                            </p>
                            <p className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span className={store.address ? '' : 'text-slate-400'}>
                                {store.address || '未提供'}
                              </span>
                            </p>
                            {store.website && (
                              <p className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <a
                                  href={store.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  {store.website}
                                </a>
                              </p>
                            )}
                            {store.lineAccount && (
                              <p className="flex items-center gap-2">
                                <span className="font-medium text-slate-900 dark:text-slate-50">
                                  LINE: {store.lineAccount}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* 招牌描述 */}
                          {store.signboard && (
                            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              <div className="flex items-center gap-2 mb-1">
                                <ImageIcon className="h-4 w-4" />
                                <strong>招牌描述：</strong>
                              </div>
                              {store.signboard}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 已儲存店家頁籤 */}
          <TabsContent value="saved" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>已儲存店家</CardTitle>
                  <CardDescription>
                    已儲存到資料庫的台灣花蓮店家
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    loadSavedStores()
                    setShowStats(true)
                  }}
                  variant="outline"
                  size="sm"
                >
                  <BarChart3 className="mr-1 h-4 w-4" />
                  查看統計
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[650px]">
                  <div className="space-y-4">
                    {savedStores.length === 0 ? (
                      <Card>
                        <CardContent className="flex h-48 items-center justify-center text-slate-400">
                          <div className="text-center">
                            <Store className="mx-auto mb-4 h-12 w-12" />
                            <p>尚未儲存任何店家</p>
                            <p className="text-sm">請先搜尋店家並提取資訊</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      savedStores.map((store, index) => (
                        <Card key={store.id || index} className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold">{store.name}</h4>
                                {store.lineActive === true && (
                                  <Badge variant="default" className="bg-green-600 ml-2">
                                    LINE活躍
                                  </Badge>
                                )}
                              </div>
                              {store.id && (
                                <Button
                                  onClick={() => deleteStore(store.id)}
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            {store.phoneNumber && (
                              <p className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {store.phoneNumber}
                              </p>
                            )}
                            {store.address && (
                              <p className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {store.address}
                              </p>
                            )}
                            {store.website && (
                              <p className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <a
                                  href={store.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  {store.website}
                                </a>
                              </p>
                            )}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 統計面板 */}
          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>統計面板</CardTitle>
                  <Button
                    onClick={loadStats}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="mr-1 h-4 w-4" />
                    重新整理
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="mt-4 text-slate-600">載入統計中...</p>
                  </div>
                ) : statsData ? (
                  <div className="space-y-6">
                    {/* 總覽 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">總覽</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">總店家數</div>
                          <div className="text-2xl font-bold">{statsData.overview.totalStores}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">有電話號碼</div>
                          <div className="text-2xl font-bold">{statsData.overview.storesWithPhone}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">有地址</div>
                          <div className="text-2xl font-bold">{statsData.overview.storesWithAddress}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">有門面照片</div>
                          <div className="text-2xl font-bold">{statsData.overview.storesWithImage}</div>
                        </div>
                      </div>
                    </div>

                    {/* LINE統計 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">LINE 統計</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">LINE活躍</div>
                          <div className="text-2xl font-bold text-green-600">{statsData.lineStats.lineActive}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">LINE未活躍</div>
                          <div className="text-2xl font-bold">{statsData.lineStats.lineInactive}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">未驗證</div>
                          <div className="text-2xl font-bold">{statsData.lineStats.unverified}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">驗證率</div>
                          <div className="text-2xl font-bold">{statsData.lineStats.verificationRate}%</div>
                        </div>
                      </div>
                    </div>

                    {/* 完整度統計 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">資訊完整度</h3>
                      <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">平均完整度</div>
                        <div className="text-2xl font-bold">{statsData.overview.averageCompleteness}%</div>
                      </div>
                    </div>

                    {/* 時間分佈 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">時間分佈</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">最近7天</div>
                          <div className="text-2xl font-bold">{statsData.timeDistribution.last7Days}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">最近30天</div>
                          <div className="text-2xl font-bold">{statsData.timeDistribution.last30Days}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center text-slate-400">
                    <p>點擊「重新整理」載入統計</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 版權頁尾 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Users className="h-4 w-4" />
            <span className="font-semibold">2026 Jy技術團隊</span>
            <span className="text-slate-400">|</span>
            <Star className="h-4 w-4" />
            <span className="font-semibold">BossJy 製作</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
