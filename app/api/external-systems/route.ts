/**
 * 外部系統配置管理 API
 * 管理與外部系統的整合配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuditLogService, AuditActions } from '@/lib/database/services/audit-log.service';

/**
 * GET /api/external-systems
 * 查詢所有外部系統配置
 */
export async function GET(request: NextRequest) {
  try {
    const systems = await db.externalSystem.findMany({
      where: {},
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        webhookUrl: true,
        isActive: true,
        events: true,
        lastSyncAt: true,
        lastStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: systems });
  } catch (error) {
    console.error('[ExternalSystems] Query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/external-systems
 * 創建新的外部系統配置
 */
export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }
    const { name, description, webhookUrl, apiKey, apiSecret, events, retryCount, timeout, headers } = body

    if (!name || !webhookUrl) {
      return NextResponse.json(
        { error: 'Name and webhookUrl are required' },
        { status: 400 }
      );
    }

    const system = await db.externalSystem.create({
      data: {
        name,
        description,
        webhookUrl,
        apiKey,
        apiSecret,
        events: events || [],
        retryCount: retryCount || 3,
        timeout: timeout || 30000,
        headers,
        isActive: true,
      },
    });

    const auditService = getAuditLogService();
    await auditService.log({
      action: AuditActions.SYSTEM_CONFIG_UPDATE,
      entityType: 'ExternalSystem',
      entityId: system.id,
      newValues: { name, webhookUrl, events },
    });

    return NextResponse.json({ data: system }, { status: 201 });
  } catch (error) {
    console.error('[ExternalSystems] Create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
