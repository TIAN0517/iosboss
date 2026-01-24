/**
 * 生產級持久化 Hook - 立即可用版本
 * 解決斷線後登入狀態保持問題
 */

'use client';

import { useState, useEffect } from 'react';

export interface SessionData {
  token: string;
  userId: string;
  username: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  timestamp: number;
}

const SESSION_KEY = 'production_session_v2';
const SESSION_BACKUP_KEY = 'production_session_backup';
const MAX_SESSION_AGE = 7 * 24 * 60 * 60 * 1000; // 7天

/**
 * 生產級會話持久化 Hook
 */
export function useProductionSession() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 保存會話到多重存儲
   */
  const saveSession = (data: Omit<SessionData, 'timestamp'>) => {
    if (typeof window === 'undefined') return;

    const sessionData: SessionData = {
      ...data,
      timestamp: Date.now()
    };

    try {
      // 1. 主存儲
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      
      // 2. 備份存儲
      localStorage.setItem(SESSION_BACKUP_KEY, JSON.stringify(sessionData));
      
      // 3. 簡單的 Cookie 備份
      document.cookie = `${SESSION_KEY}=${encodeURIComponent(JSON.stringify(sessionData))}; max-age=${MAX_SESSION_AGE/1000}; path=/; samesite=lax`;

      setSession(sessionData);
      console.log('✅ 會話已保存（生產級持久化）');
    } catch (error) {
      console.error('❌ 保存會話失敗:', error);
    }
  };

  /**
   * 從多重存儲載入會話
   */
  const loadSession = () => {
    if (typeof window === 'undefined') return null;

    try {
      // 1. 優先從主存儲載入
      let sessionData = localStorage.getItem(SESSION_KEY);
      let source = '主存儲';

      // 2. 從備份恢復
      if (!sessionData) {
        sessionData = localStorage.getItem(SESSION_BACKUP_KEY);
        source = '備份存儲';
      }

      // 3. 從 Cookie 恢復
      if (!sessionData) {
        const cookies = document.cookie.split(';');
        const sessionCookie = cookies.find(c => c.trim().startsWith(`${SESSION_KEY}=`));
        if (sessionCookie) {
          sessionData = decodeURIComponent(sessionCookie.split('=')[1]);
          source = 'Cookie';
        }
      }

      if (!sessionData) {
        console.log('⚠️ 未找到會話數據');
        return null;
      }

      const session: SessionData = JSON.parse(sessionData);
      
      // 檢查會話是否過期
      if (Date.now() - session.timestamp > MAX_SESSION_AGE) {
        console.log('⚠️ 會話已過期');
        clearSession();
        return null;
      }

      console.log(`✅ 會話已從 ${source} 恢復`);
      return session;
    } catch (error) {
      console.error('❌ 載入會話失敗:', error);
      return null;
    }
  };

  /**
   * 清除所有會話數據
   */
  const clearSession = () => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_BACKUP_KEY);
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_username');
      localStorage.removeItem('auth_token');
      
      // 清除 Cookie
      document.cookie = `${SESSION_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      
      setSession(null);
      console.log('🗑️ 會話已清除');
    } catch (error) {
      console.error('❌ 清除會話失敗:', error);
    }
  };

  /**
   * 檢查會話是否有效
   */
  const isSessionValid = (sessionData: SessionData | null): boolean => {
    if (!sessionData) return false;
    return Date.now() - sessionData.timestamp < MAX_SESSION_AGE;
  };

  /**
   * 初始化 Hook
   */
  useEffect(() => {
    const loadUserSession = async () => {
      try {
        // 1. 嘗試從本地存儲恢復會話
        const localSession = loadSession();
        if (localSession && isSessionValid(localSession)) {
          setSession(localSession);
          setLoading(false);
          return;
        }

        // 2. 如果本地沒有會話，嘗試從 API 恢復
        const response = await fetch('/api/auth-me', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const newSession: Omit<SessionData, 'timestamp'> = {
            token: data.token,
            userId: data.user.id,
            username: data.user.username,
            name: data.user.name,
            role: data.user.role,
            email: data.user.email,
            phone: data.user.phone
          };

          saveSession(newSession);
          setSession({ ...newSession, timestamp: Date.now() });
        } else {
          console.log('⚠️ 未登入，需要重新登入');
          clearSession();
        }
      } catch (error) {
        console.error('❌ 初始化會話失敗:', error);
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    loadUserSession();
  }, []);

  return {
    session,
    loading,
    saveSession,
    loadSession,
    clearSession,
    isLoggedIn: !!session && isSessionValid(session)
  };
}
