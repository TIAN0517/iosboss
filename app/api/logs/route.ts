/**
 * LINE 系統日誌 API 路由
 * 提供日誌查詢、管理和統計功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// 獲取日誌列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 查詢參數
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const level = searchParams.get('level')
    const category = searchParams.get('category')
    const source = searchParams.get('source')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    let query = supabase
      .from('line_system_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // 應用過濾器
    if (level && level !== 'ALL') {
      query = query.eq('level', level)
    }
    
    if (category && category !== 'ALL') {
      query = query.eq('category', category)
    }
    
    if (source && source !== 'ALL') {
      query = query.eq('source', source)
    }
    
    if (search) {
      query = query.or(
        `message_content.ilike.%${search}%,user_name.ilike.%${search}%,event_type.ilike.%${search}%`
      )
    }
    
    if (startDate) {
      query = query.gte('timestamp', startDate)
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate)
    }
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('查詢日誌失敗:', error)
      return NextResponse.json(
        { error: '查詢日誌失敗', details: error.message },
        { status: 500 }
      )
    }
    
    // 獲取總數
    const { count: totalCount } = await supabase
      .from('line_system_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', startDate || '1970-01-01')
      .lte('timestamp', endDate || '2999-12-31')
    
    return NextResponse.json({
      data: data || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    })
  } catch (error) {
    console.error('獲取日誌失敗:', error)
    return NextResponse.json(
      { error: '獲取日誌失敗', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    )
  }
}

// 創建日誌記錄
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('line_system_logs')
      .insert([body])
      .select()
    
    if (error) {
      console.error('創建日誌失敗:', error)
      return NextResponse.json(
        { error: '創建日誌失敗', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ data: data?.[0] })
  } catch (error) {
    console.error('創建日誌失敗:', error)
    return NextResponse.json(
      { error: '創建日誌失敗', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    )
  }
}

// 清除舊日誌
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    const { error } = await supabase
      .from('line_system_logs')
      .delete()
      .lt('timestamp', cutoffDate.toISOString())
    
    if (error) {
      console.error('清除日誌失敗:', error)
      return NextResponse.json(
        { error: '清除日誌失敗', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      message: `已清除 ${days} 天前的日誌記錄`,
      cutoffDate: cutoffDate.toISOString()
    })
  } catch (error) {
    console.error('清除日誌失敗:', error)
    return NextResponse.json(
      { error: '清除日誌失敗', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    )
  }
}
