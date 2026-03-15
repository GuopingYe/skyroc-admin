/**
 * 开发环境自动登录工具 Development Auto Login Utility
 *
 * 在开发环境下自动使用默认账号登录，方便开发调试
 */

import { setToken } from '@/features/auth/authStore';
import { store } from '@/store';
import { localStg } from '@/utils/storage';

/** 开发模式自动登录 如果没有 token 且开启了自动登录，则使用默认账号密码登录 */
export async function devAutoLogin(): Promise<string | null> {
  const { MODE, VITE_DEV_AUTO_LOGIN, VITE_DEV_LOGIN_PASSWORD, VITE_DEV_LOGIN_USERNAME } = import.meta.env;

  // 只在非生产模式且开启了自动登录时执行
  if (MODE === 'production' || VITE_DEV_AUTO_LOGIN !== 'Y') {
    return null;
  }

  // 如果已有 token，不自动登录
  if (localStg.get('token')) {
    return null;
  }

  console.log('[Dev Auto Login] Attempting auto login with default credentials...');

  try {
    const response = await fetch('/proxy-default/auth/login', {
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
  }
}

/** 清除开发登录状态 Clear dev login state */
export function clearDevLogin(): void {
  localStg.remove('token');
  localStg.remove('refreshToken');
  localStg.remove('userInfo');
  console.log('[Dev Login] Login state cleared. Refresh page to see login page.');
}

// 暴露到 window 方便调试
if (import.meta.env.DEV) {
  (window as any).__devLogin = {
    clear: clearDevLogin,
    login: devAutoLogin
  };
}
