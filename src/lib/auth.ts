/**
 * 安全認證工具函數
 * 使用 JWT 和 bcrypt 實現安全的認證系統
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// JWT 密鑰 - 必須與 middleware.ts 中的 JWT_SECRET 完全一致
// 在開發環境中，process.env.JWT_SECRET 可能無法正確讀取，所以直接使用相同值
const JWT_SECRET = process.env.JWT_SECRET || '9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY=';
const JWT_EXPIRES_IN = '7d'; // Token 有效期

/**
 * Token 介面
 */
export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

/**
 * 生成 JWT Token
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * 驗證 JWT Token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * 雜湊密碼
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * 驗證密碼
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 從請求中提取 Token（支援 Bearer token 和 Cookie）
 */
export function extractToken(request: Request): string | null {
  // 嘗試從 Authorization header 獲取
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 嘗試從 Cookie 獲取
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const authCookie = cookies.find(c => c.startsWith('auth_token='));
    if (authCookie) {
      return authCookie.substring('auth_token='.length);
    }
  }

  return null;
}

/**
 * 驗證請求是否已認證
 */
export function isAuthenticated(request: Request): TokenPayload | null {
  const token = extractToken(request);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * 驗證 Token 並返回用戶完整信息（包含數據庫查詢）
 */
export async function verifyAuth(token: string) {
  try {
    const payload = verifyToken(token);
    if (!payload) return null;

    // 從數據庫獲取完整用戶信息
    const { db } = await import('./db');
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) return null;

    return user;
  } catch (error) {
    return null;
  }
}
