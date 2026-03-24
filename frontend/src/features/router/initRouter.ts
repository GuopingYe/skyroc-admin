import type { RouteObject } from 'react-router-dom';

import { authRoutes } from '@/router';
import { fetchGetBackendRoutes, fetchGetUserInfo } from '@/service/api';
import { QUERY_KEYS } from '@/service/keys';
import { queryClient } from '@/service/queryClient';
import { store } from '@/store';
import { devAutoLogin } from '@/utils/dev-login';

import { setCacheRoutes, setHomePath } from './routeStore';
import { filterAuthRoutesByRoles, mergeValuesByParent, transformBackendRoutesToReactRoutes } from './shared';

export async function initAuthRoutes(addRoutes: (parent: string | null, route: RouteObject[]) => void) {
  const authRouteMode = import.meta.env.VITE_AUTH_ROUTE_MODE;

  // 开发模式自动登录（保持串行，必须先完成认证）
  await devAutoLogin();

  const reactAuthRoutes = mergeValuesByParent(authRoutes);

  // 静态模式
  if (authRouteMode === 'static') {
    // 静态模式：只获取用户信息
    const userInfo = await queryClient.ensureQueryData<Api.Auth.UserInfo>({
      queryFn: fetchGetUserInfo,
      queryKey: QUERY_KEYS.AUTH.USER_INFO
    });

    const isSuper = userInfo?.roles.includes(import.meta.env.VITE_STATIC_SUPER_ROLE);

    if (isSuper) {
      reactAuthRoutes.forEach(route => {
        addRoutes(route.parent, route.route);
      });
    } else {
      const filteredRoutes = filterAuthRoutesByRoles(reactAuthRoutes, userInfo?.roles || []);

      filteredRoutes.forEach(({ parent, route }) => {
        addRoutes(parent, route);
      });
    }
  } else {
    // 动态模式：并行获取用户信息和路由
    try {
      const [userInfoResult, routesResult] = await Promise.allSettled([
        queryClient.ensureQueryData<Api.Auth.UserInfo>({
          queryFn: fetchGetUserInfo,
          queryKey: QUERY_KEYS.AUTH.USER_INFO
        }),
        queryClient.ensureQueryData<Api.Route.BackendRouteResponse>({
          gcTime: Infinity,
          queryFn: fetchGetBackendRoutes,
          queryKey: QUERY_KEYS.ROUTE.USER_ROUTES,
          staleTime: Infinity
        })
      ]);

      // 处理用户信息获取结果
      if (userInfoResult.status === 'rejected') {
        console.error('Failed to fetch user info:', userInfoResult.reason);
        // 用户信息获取失败，但可以继续尝试加载路由
      }

      // 处理路由获取结果
      if (routesResult.status === 'rejected') {
        console.error('Failed to fetch backend routes:', routesResult.reason);
        window.$message?.error('路由初始化失败，请刷新页面重试');
        return;
      }

      const data = routesResult.value;

      store.dispatch(setHomePath(data.home));

      const routeParentMap = new Map<string, string | null>();

      function collectParentInfo(routes: Api.Route.BackendRoute[], parent: string | null = null) {
        routes.forEach(route => {
          const routeParent = route.layout !== undefined ? route.layout : parent;
          routeParentMap.set(route.name, routeParent ?? null);
        });
      }

      collectParentInfo(data.routes, '(base)');

      // 将后端路由结构转换为 React Router 路由结构
      const { cacheRoutes, routes: reactRoutes } = transformBackendRoutesToReactRoutes(data.routes);

      // 设置缓存路由
      if (cacheRoutes.length > 0) {
        store.dispatch(setCacheRoutes(cacheRoutes));
      }

      reactRoutes.forEach(routeArray => {
        const parent = routeParentMap.get(routeArray.id as string);
        if (parent) {
          addRoutes(parent, [routeArray]);
        } else {
          addRoutes(null, [routeArray]);
        }
      });
    } catch (error) {
      console.error('Failed to initialize auth routes:', error);
      window.$message?.error('路由初始化失败，请刷新页面重试');
    }
  }
}
