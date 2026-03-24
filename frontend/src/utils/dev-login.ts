/**
 * 开发环境自动登录工具 Development Auto Login Utility
 *
 * 在开发环境下自动使用默认账号登录，方便开发调试
 */

import { clearAuthStorage } from '@/features/auth/shared';
import { setToken } from '@/features/auth/authStore';
import { store } from '@/store';
import { localStg } from '@/utils/storage';

/** 缓存的登录 Promise，确保同一时间只有一个登录请求在进行 */
let loginPromise: Promise<string | null> | null = null;

/** 开发模式自动登录
 * 如果没有 token 或 token 已过期，则使用默认账号密码登录
 *
 * 特性：
 * - 幂等性：多次调用只会发起一次登录请求
 * - 缓存：成功登录后直接返回缓存的 token
 */
export async function devAutoLogin(): Promise<string | null> {
  const { MODE, VITE_DEV_AUTO_LOGIN, VITE_DEV_LOGIN_PASSWORD, VITE_DEV_LOGIN_USERNAME } = import.meta.env;

  // 只在非生产模式且开启了自动登录时执行
  if (MODE === 'production' || VITE_DEV_AUTO_LOGIN !== 'Y') {
    return null;
  }

  // 如果有正在进行的登录请求，直接返回该 Promise（避免重复登录）
  if (loginPromise) {
    return loginPromise;
  }

  // 创建登录流程的 Promise
  loginPromise = (async () => {
    try {
      // 检查现有 token 是否有效
      const existingToken = localStg.get('token');
      if (existingToken) {
        // 验证 token 是否有效
        try {
          const verifyResp = await fetch('/proxy-default/api/v1/auth/getUserInfo', {
            headers: { 'Authorization': `Bearer ${existingToken}` }
          });
          if (verifyResp.ok) {
            const verifyData = await verifyResp.json();
            if (verifyData.code === '0000') {
              console.log('[Dev Auto Login] Existing token is valid, skipping auto login');
              return existingToken;
            }
          }
          // Token 无效，清除旧数据
          console.log('[Dev Auto Login] Existing token is invalid, will re-login');
          clearAuthStorage();
        } catch {
          console.log('[Dev Auto Login] Token verification failed, will re-login');
        }
      }

      console.log('[Dev Auto Login] Attempting auto login with default credentials...');

      const response = await fetch('/proxy-default/api/v1/auth/login', {
        body: JSON.stringify({
          password: VITE_DEV_LOGIN_PASSWORD || 'admin123',
          userName: VITE_DEV_LOGIN_USERNAME || 'admin'
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
      });

      if (!response.ok) {
        console.error('[Dev Auto Login] Login request failed:', response.status);
        return null;
      }

      const data = await response.json();

      if (data.code === '0000' && data.data) {
        const { refreshToken, token } = data.data;

        // 保存 token
        localStg.set('token', token);
        localStg.set('refreshToken', refreshToken);

        // 更新 store
        store.dispatch(setToken(token));

        console.log('[Dev Auto Login] Auto login successful!');
        return token;
      }

      console.error('[Dev Auto Login] Login failed:', data.msg);
      return null;
    } catch (error) {
      console.error('[Dev Auto Login] Error:', error);
      return null;
    } finally {
      // 清除缓存的 Promise，允许下次重试
      loginPromise = null;
    }
  })();

  return loginPromise;
}

/** 清除开发登录状态 Clear dev login state */
export function clearDevLogin(): void {
  clearAuthStorage();
  loginPromise = null;
  console.log('[Dev Login] Login state cleared. Refresh page to see login page.');
}

// 暴露到 window 方便调试
if (import.meta.env.DEV) {
  (window as any).__devLogin = {
    clear: clearDevLogin,
    login: devAutoLogin
  };
}
