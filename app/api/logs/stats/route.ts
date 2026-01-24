/**
 * LINE 系統日誌統計 API
 * 提供系統性能、錯誤統計、趨勢分析等功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// 獲取日誌統計
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '24h' // 24h, 7d, 30d
    const type = searchParams.get('type') || 'overview' // overview, errors, performance, trends
    
    let timeFilter = ''
    switch (period) {
      case '1h':
        timeFilter = `timestamp >= NOW() - INTERVAL '1 hour'`
        break
      case '24h':
        timeFilter = `timestamp >= NOW() - INTERVAL '24 hours'`
        break
      case '7d':
        timeFilter = `timestamp >= NOW() - INTERVAL '7 days'`
        break
      case '30d':
        timeFilter = `timestamp >= NOW() - INTERVAL '30 days'`
        break
      default:
        timeFilter = `timestamp >= NOW() - INTERVAL '24 hours'`
    }
    
    switch (type) {
      case 'overview':
        return await getOverviewStats(timeFilter)
      case 'errors':
        return await getErrorStats(timeFilter)
      case 'performance':
        return await getPerformanceStats(timeFilter)
      case 'trends':
        return await getTrendsStats(timeFilter)
      default:
        return await getOverviewStats(timeFilter)
    }
  } catch (error) {
    console.error('獲取統計失敗:', error)
    return NextResponse.json(
      { error: '獲取統計失敗', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    )
  }
}

// 獲取概覽統計
async function getOverviewStats(timeFilter: string) {
  // 總日誌數
  const { data: totalLogs } = await supabase
    .from('line_system_logs')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', timeFilter.split(' >= ')[1])
  
  // 按級別統計
  const { data: levelStats } = await supabase
    .from('line_system_logs')
    .select('level')
    .gte('timestamp', timeFilter.split(' >= ')[1])
  
  const levelCounts = levelStats?.reduce((acc: any, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1
    return acc
  }, {}) || {}
  
  // 按分類統計
  const { data: categoryStats } = await supabase
    .from('line_system_logs')
    .select('category')
    .gte('timestamp', timeFilter.split(' >= ')[1])
  
  const categoryCounts = categoryStats?.reduce((acc: any, log) => {
    acc[log.category] = (acc[log.category] || 0) + 1
    return acc
  }, {}) || {}
  
  // 按來源統計
  const { data: sourceStats } = await supabase
    .from('line_system_logs')
    .select('source')
    .gte('timestamp', timeFilter.split(' >= ')[1])
  
  const sourceCounts = sourceStats?.reduce((acc: any, log) => {
    acc[log.source] = (acc[log.source] || 0) + 1
    return acc
  }, {}) || {}
  
  // 最近的錯誤
  const { data: recentErrors } = await supabase
    .from('line_system_logs')
    .select('*')
    .eq('level', 'ERROR')
    .gte('timestamp', timeFilter.split(' >= ')[1])
    .order('timestamp', { ascending: false })
    .limit(5)
  
  return NextResponse.json({
    overview: {
      totalLogs: totalLogs?.length || 0,
      levelDistribution: levelCounts,
      categoryDistribution: categoryCounts,
      sourceDistribution: sourceCounts,
      recentErrors: recentErrors || []
    }
  })
}

// 獲取錯誤統計
async function getErrorStats(timeFilter: string) {
  const timestamp = timeFilter.split(' >= ')[1]
  
  // 錯誤趨勢（按小時）
  const { data: hourlyErrors } = await supabase
    .from('line_system_logs')
    .select('timestamp, error_message')
    .eq('level', 'ERROR')
    .gte('timestamp', timestamp)
    .order('timestamp')
  
  // 錯誤類型統計
  const { data: errorTypes } = await supabase
    .from('line_system_logs')
    .select('error_message')
    .eq('level', 'ERROR')
    .gte('timestamp', timestamp)
  
  const errorTypeCounts = errorTypes?.reduce((acc: any, log) => {
    const errorType = log.error_message?.split(':')[0] || 'Unknown'
    acc[errorType] = (acc[errorType] || 0) + 1
    return acc
  }, {}) || {}
  
  // 最常見的錯誤
  const sortedErrors = Object.entries(errorTypeCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([error, count]) => ({ error, count }))
  
  return NextResponse.json({
    errors: {
      total: errorTypes?.length || 0,
      hourlyTrend: hourlyErrors || [],
      topErrors: sortedErrors,
      errorRate: hourlyErrors?.length || 0
    }
  })
}

// 獲取性能統計
async function getPerformanceStats(timeFilter: string) {
  const timestamp = timeFilter.split(' >= ')[1]
  
  // 響應時間統計
  const { data: responseTimes } = await supabase
    .from('line_system_logs')
    .select('response_time, response_status')
    .gte('timestamp', timestamp)
    .not('response_time', 'is', null)
  
  const responseTimeData = responseTimes || []
  const avgResponseTime = responseTimeData.length > 0 
    ? responseTimeData.reduce((sum, log) => sum + (log.response_time || 0), 0) / responseTimeData.length
    : 0
  
  const responseTimeBuckets = {
    fast: responseTimeData.filter(log => (log.response_time || 0) < 100).length,
    medium: responseTimeData.filter(log => (log.response_time || 0) >= 100 && (log.response_time || 0) < 500).length,
    slow: responseTimeData.filter(log => (log.response_time || 0) >= 500 && (log.response_time || 0) < 1000).length,
    verySlow: responseTimeData.filter(log => (log.response_time || 0) >= 1000).length
  }
  
  // API 成功率
  const apiLogs = responseTimeData.filter(log => log.response_status)
  const successRate = apiLogs.length > 0 
    ? (apiLogs.filter(log => (log.response_status || 0) < 400).length / apiLogs.length) * 100
    : 100
  
  return NextResponse.json({
    performance: {
      averageResponseTime: Math.round(avgResponseTime),
      responseTimeDistribution: responseTimeBuckets,
      successRate: Math.round(successRate * 100) / 100,
      totalRequests: apiLogs.length
    }
  })
}

// 獲取趨勢統計
async function getTrendsStats(timeFilter: string) {
  const timestamp = timeFilter.split(' >= ')[1]
  
  // 按時間統計（每小時）
  const { data: timeSeries } = await supabase
    .from('line_system_logs')
    .select('timestamp, level')
    .gte('timestamp', timestamp)
    .order('timestamp')
  
  const hourlyStats: any = {}
  
  timeSeries?.forEach(log => {
    const hour = new Date(log.timestamp).toISOString().slice(0, 13) + ':00:00'
    if (!hourlyStats[hour]) {
      hourlyStats[hour] = { total: 0, INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 }
    }
    hourlyStats[hour].total++
    hourlyStats[hour][log.level]++
  })
  
  // 轉換為數組格式
  const trendData = Object.entries(hourlyStats).map(([hour, stats]) => ({
    time: hour,
    ...stats
  })).sort(([a], [b]) => a.localeCompare(b))
  
  // 活躍用戶統計
  const { data: activeUsers } = await supabase
    .from('line_system_logs')
    .select('user_id')
    .gte('timestamp', timestamp)
    .not('user_id', 'is', null)
  
  const uniqueUsers = new Set(activeUsers?.map(log => log.user_id).filter(Boolean)).size
  
  // 消息統計
  const { data: messageStats } = await supabase
    .from('line_system_logs')
    .select('message_type')
    .eq('category', 'MESSAGE')
    .gte('timestamp', timestamp)
  
  const messageTypeCounts = messageStats?.reduce((acc: any, log) => {
    acc[log.message_type || 'unknown'] = (acc[log.message_type || 'unknown'] || 0) + 1
    return acc
  }, {}) || {}
  
  return NextResponse.json({
    trends: {
      timeSeries: trendData,
      activeUsers: uniqueUsers,
      messageDistribution: messageTypeCounts,
      peakHour: trendData.length > 0 
        ? trendData.reduce((peak, current) => 
            current.total > peak.total ? current : peak
          )
        : null
    }
  })
}
