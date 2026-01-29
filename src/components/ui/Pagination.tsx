'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ pagination, onPageChange, className = '' }: PaginationProps) {
  const { page, totalPages, hasNextPage, hasPrevPage } = pagination

  return (
    <div className={`flex items-center justify-between py-4 ${className}`}>
      <div className="text-sm text-muted-foreground">
        共 {pagination.total} 筆資料
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
        >
          <ChevronLeft className="w-4 h-4" />
          上一頁
        </Button>
        <span className="text-sm">
          第 {page} / {totalPages} 頁
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
        >
          下一頁
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// 簡單的加載狀態指示器
export function LoadingIndicator({ loading }: { loading: boolean }) {
  if (!loading) return null
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
