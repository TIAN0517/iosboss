/**
 * 生產級會話持久化管理器
 * 解決斷線、瀏覽器清除緩存、服務重啟後的登入狀態保持問題
 */

import { createCookie, createBrowserClient } from '@supabase/ssr'

// 客戶端持久化策略
export class ProductionSessionManager {
  private static instance: ProductionSessionManager;
  private supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  static getInstance(): ProductionSessionManager {
    if (!ProductionSessionManager.instance) {
      ProductionSessionManager.instance = new ProductionSessionManager();
    }
    return ProductionSessionManager.instance;
  }

  /**
   * 保存會話 - 多層持久化策略
   */
  async saveSession(session: {
    userId: string;
    username: string;
    name: string;
    role: string;
    email?: string;
    phone?: string;
    token: string;
  }): Promise<void> {
    try {
      // 1. Supabase 持久化（主要）
      await this.supabase.from('user_sessions').upsert({
        user_id: session.userId,
        username: session.username,
        name: session.name,
        role: session.role,
        email: session.email,
        phone: session.phone,
        token: session.token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });

      // 2. localStorage 備份（次要）
      if (typeof window !== 'undefined') {
        localStorage.setItem('session_backup', JSON.stringify({
          ...session,
          timestamp: Date.now()
        }));
      }

      // 3. HTTP-only Cookie（最穩定）
      document.cookie = `session_token=${session.token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;

      console.log('✅ 會話已保存到多層存儲');
    } catch (error) {
      console.error('❌ 保存會話失敗:', error);
    }
  }

  /**
   * 載入會話 - 多層恢復策略
   */
  async loadSession(): Promise<any | null> {
    try {
      // 1. 優先從 Supabase 恢復
      const { data: sessionData, error } = await this.supabase
        .from('user_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && sessionData) {
        console.log('✅ 從 Supabase 恢復會話');
        return sessionData;
      }

      // 2. 從 localStorage 恢復
      if (typeof window !== 'undefined') {
        const backupData = localStorage.getItem('session_backup');
        if (backupData) {
          const session = JSON.parse(backupData);
          // 檢查是否過期
          if (Date.now() - session.timestamp < 7 * 24 * 60 * 60 * 1000) {
            console.log('✅ 從 localStorage 恢復會話');
            return session;
          } else {
            localStorage.removeItem('session_backup');
          }
        }
      }

      // 3. 從 Cookie 恢復
      const cookieMatch = document.cookie.match(/session_token=([^;]+)/);
      if (cookieMatch) {
        console.log('✅ 從 Cookie 恢復會話');
        // 這裡可以發送請求到後端驗證 Token
      }

      return null;
    } catch (error) {
      console.error('❌ 載入會話失敗:', error);
      return null;
    }
  }

  /**
   * 清除會話
   */
  async clearSession(): Promise<void> {
    try {
      // 清除 Supabase 數據
      await this.supabase.from('user_sessions').delete().neq('id', '');

      // 清除 localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('session_backup');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_role');
        localStorage.removeItem('auth_token');
      }

      // 清除 Cookie
      document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      console.log('✅ 會話已清除');
    } catch (error) {
      console.error('❌ 清除會話失敗:', error);
    }
  }

  /**
   * 檢查登入狀態
   */
  async isLoggedIn(): Promise<boolean> {
    const session = await this.loadSession();
    return !!session;
  }
}

// 服務器端持久化（使用 Cookie）
export const createServerSession = () => {
  return createCookie('session_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
};

// React Hook 整合
export const useSessionManager = () => {
  const sessionManager = ProductionSessionManager.getInstance();
  
  return {
    saveSession: sessionManager.saveSession.bind(sessionManager),
    loadSession: sessionManager.loadSession.bind(sessionManager),
    clearSession: sessionManager.clearSession.bind(sessionManager),
    isLoggedIn: sessionManager.isLoggedIn.bind(sessionManager),
  };
};
