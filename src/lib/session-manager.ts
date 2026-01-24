/**
 * 會話管理器 - 改善斷線後會話持久化
 * 解決斷線後 localStorage 清除導致的登入狀態丟失問題
 */

export interface UserSession {
  token: string;
  userId: string;
  username: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  timestamp: number;
}

const SESSION_KEY = 'user_session';
const SESSION_BACKUP_KEY = 'user_session_backup';

/**
 * 保存會話到 localStorage（帶備份機制）
 */
export function saveSession(session: UserSession): void {
  try {
    // 主存儲
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    // 備份存儲（防止主存儲被清除）
    localStorage.setItem(SESSION_BACKUP_KEY, JSON.stringify(session));
    
    // 同時保存到 sessionStorage（不同存儲域）
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    console.log('✅ 會話已保存:', session.username);
  } catch (error) {
    console.error('❌ 保存會話失敗:', error);
  }
}

/**
 * 從 localStorage 載入會話（多級恢復機制）
 */
export function loadSession(): UserSession | null {
  try {
    // 優先從主存儲載入
    let sessionData = localStorage.getItem(SESSION_KEY);
    let source = '主存儲';
    
    // 如果主存儲沒有，嘗試從備份恢復
    if (!sessionData) {
      sessionData = localStorage.getItem(SESSION_BACKUP_KEY);
      source = '備份存儲';
    }
    
    // 如果 localStorage 都沒有，嘗試從 sessionStorage 恢復
    if (!sessionData) {
      sessionData = sessionStorage.getItem(SESSION_KEY);
      source = 'sessionStorage';
    }
    
    if (!sessionData) {
      console.log('⚠️  未找到會話數據');
      return null;
    }
    
    const session: UserSession = JSON.parse(sessionData);
    
    // 檢查會話是否過期（7天）
    const now = Date.now();
    const sessionAge = now - session.timestamp;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
    
    if (sessionAge > maxAge) {
      console.log('⚠️  會話已過期，需要重新登入');
      clearSession();
      return null;
    }
    
    console.log(`✅ 會話已從 ${source} 恢復:`, session.username);
    return session;
  } catch (error) {
    console.error('❌ 載入會話失敗:', error);
    return null;
  }
}

/**
 * 清除所有會話數據
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_BACKUP_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    
    // 清除舊的 localStorage 鍵（兼容性）
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_username');
    localStorage.removeItem('auth_token');
    
    console.log('🗑️  會話已清除');
  } catch (error) {
    console.error('❌ 清除會話失敗:', error);
  }
}

/**
 * 檢查會話是否有效
 */
export function isSessionValid(session: UserSession | null): boolean {
  if (!session) return false;
  
  const now = Date.now();
  const sessionAge = now - session.timestamp;
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
  
  return sessionAge < maxAge;
}

/**
 * 更新會話時間戳（防止過期）
 */
export function refreshSessionTimestamp(): void {
  const session = loadSession();
  if (session) {
    session.timestamp = Date.now();
    saveSession(session);
    console.log('🔄 會話時間戳已刷新');
  }
}

/**
 * 獲取當前用戶信息
 */
export function getCurrentUser(): UserSession | null {
  return loadSession();
}

/**
 * 檢查用戶是否已登入
 */
export function isLoggedIn(): boolean {
  const session = loadSession();
  return isSessionValid(session);
}
