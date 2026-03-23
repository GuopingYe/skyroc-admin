# 前端全流程性能优化设计方案

## 背景

当前前端应用加载速度慢，影响开发效率和用户体验。问题涉及多个环节：开发环境启动、页面加载、路由切换、API 请求等。

## 目标

全流程性能优化，包括：
- 开发环境：冷启动、热更新、页面刷新
- 生产环境：首次加载、路由切换、API 请求

## Phase 1: Vite 配置优化

### 1.1 预热配置增强

**当前配置：**
```typescript
server: {
  warmup: {
    clientFiles: ['./index.html', './src/{pages,components}/*']
  }
}
```

**优化后：**
```typescript
server: {
  warmup: {
    clientFiles: [
      './index.html',
      './src/main.tsx',
      './src/App.tsx',
      './src/store/index.ts',
      './src/plugins/**/*.ts',
      './src/features/router/**/*.tsx',
      './src/pages/(base)/**/*.tsx'
    ]
  }
}
```

### 1.2 依赖预构建优化

**新增配置：**
```typescript
optimizeDeps: {
  include: [
    'react',
    'react-dom',
    'react-router-dom',
    'antd',
    '@ant-design/icons',
    '@ant-design/pro-components',
    'dayjs',
    'dayjs/locale/zh-cn',
    'axios',
    '@tanstack/react-query',
    'zustand',
    'lodash-es',
    'clsx',
    'tailwind-merge'
  ],
  exclude: [
    // 排除不需要预构建的包
  ],
  force: false
}
```

### 1.3 缓存策略优化

**新增配置：**
```typescript
cacheDir: 'node_modules/.vite',
server: {
  fs: {
    cachedChecks: true
  }
}
```

---

## Phase 2: Bundle 优化

### 2.1 manualChunks 细粒度拆分

**当前配置：**
```typescript
manualChunks: {
  animate: ['motion'],
  antd: ['antd', '@ant-design/v5-patch-for-react-19'],
  axios: ['axios'],
  il8n: ['react-i18next', 'i18next'],
  react: ['react', 'react-dom', 'react-error-boundary'],
  reactRouter: ['react-router-dom'],
  redux: ['react-redux', '@reduxjs/toolkit'],
  sa: ['@sa/axios', '@sa/color', '@sa/hooks', '@sa/materials', '@sa/utils']
}
```

**优化后：**
```typescript
manualChunks: (id) => {
  // React 核心
  if (id.includes('node_modules/react/') ||
      id.includes('node_modules/react-dom/') ||
      id.includes('node_modules/scheduler/')) {
    return 'react-core';
  }

  // React 生态
  if (id.includes('node_modules/react-router-dom/') ||
      id.includes('node_modules/@tanstack/')) {
    return 'react-ecosystem';
  }

  // Ant Design
  if (id.includes('node_modules/antd/') ||
      id.includes('node_modules/@ant-design/') ||
      id.includes('node_modules/rc-')) {
    return 'antd';
  }

  // 图表库
  if (id.includes('node_modules/echarts/') ||
      id.includes('node_modules/zrender/')) {
    return 'echarts';
  }

  // 工具库
  if (id.includes('node_modules/lodash-es/') ||
      id.includes('node_modules/lodash/')) {
    return 'lodash';
  }

  if (id.includes('node_modules/dayjs/')) {
    return 'dayjs';
  }

  // i18n
  if (id.includes('node_modules/i18next/') ||
      id.includes('node_modules/react-i18next/')) {
    return 'i18n';
  }

  // 状态管理
  if (id.includes('node_modules/zustand/') ||
      id.includes('node_modules/@reduxjs/') ||
      id.includes('node_modules/react-redux/')) {
    return 'state';
  }

  // @sa 系列工具
  if (id.includes('node_modules/@sa/')) {
    return 'sa-utils';
  }

  // 动画库
  if (id.includes('node_modules/motion/') ||
      id.includes('node_modules/framer-motion/')) {
    return 'animation';
  }

  // 其他 node_modules
  if (id.includes('node_modules/')) {
    return 'vendor';
  }
}
```

### 2.2 第三方库按需引入

**antd 按需引入：**
- 确认 `babel-plugin-import` 或 `@babel/plugin-transform-typescript` 配置
- 检查是否使用了全量引入 `import { Button } from 'antd'`（正确）vs `import antd from 'antd'`（错误）

**echarts 按需引入：**
```typescript
// 创建 src/utils/echarts.ts
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart, LineChart, PieChart,
  GridComponent, TooltipComponent, LegendComponent,
  CanvasRenderer
]);

export default echarts;
```

**dayjs 按需引入：**
```typescript
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';

dayjs.extend(relativeTime);
dayjs.extend(utc);
```

### 2.3 路由懒加载完善

**确认所有页面使用懒加载：**
```typescript
// 正确方式
const HomePage = lazy(() => import('@/pages/(base)/home'));

// 添加 preload
const routes = [
  {
    path: '/home',
    component: HomePage,
    preload: () => import('@/pages/(base)/home')
  }
];
```

---

## Phase 3: 运行时优化

### 3.1 路由初始化并行化

**当前问题：**
- `initAuthRoutes` 中登录验证、用户信息获取、路由获取串行执行
- 每个请求都需要等待前一个完成

**优化方案：**
```typescript
// initRouter.ts
export async function initAuthRoutes(addRoutes: (parent: string | null, route: RouteObject[]) => void) {
  const authRouteMode = import.meta.env.VITE_AUTH_ROUTE_MODE;

  // 并行执行独立请求
  const [userInfo, backendRoutes] = await Promise.all([
    queryClient.ensureQueryData<Api.Auth.UserInfo>({
      queryFn: fetchGetUserInfo,
      queryKey: QUERY_KEYS.AUTH.USER_INFO
    }),
    authRouteMode === 'dynamic'
      ? queryClient.ensureQueryData<Api.Route.BackendRouteResponse>({
          gcTime: Infinity,
          queryFn: fetchGetBackendRoutes,
          queryKey: QUERY_KEYS.ROUTE.USER_ROUTES,
          staleTime: Infinity
        })
      : Promise.resolve(null)
  ]);

  // 后续处理...
}
```

### 3.2 API 缓存策略优化

**queryClient 全局配置：**
```typescript
// queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
      gcTime: 10 * 60 * 1000,   // 10 分钟后清理缓存
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    }
  }
});
```

**针对特定 API 的缓存策略：**
```typescript
// 用户信息：长时间缓存
useQuery({
  queryKey: QUERY_KEYS.AUTH.USER_INFO,
  queryFn: fetchGetUserInfo,
  staleTime: 30 * 60 * 1000, // 30 分钟
  gcTime: Infinity
});

// 树形数据：中等时间缓存
useQuery({
  queryKey: QUERY_KEYS.GLOBAL_LIBRARY.TREE,
  queryFn: fetchGlobalLibraryTree,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000
});
```

### 3.3 组件懒加载

**Modal/Drawer 等弹窗组件懒加载：**
```typescript
import { lazy, Suspense } from 'react';

const AddDatasetModal = lazy(() => import('./AddDatasetModal'));

function ParentComponent() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button onClick={() => setVisible(true)}>Add Dataset</Button>
      {visible && (
        <Suspense fallback={<Spin />}>
          <AddDatasetModal visible={visible} onClose={() => setVisible(false)} />
        </Suspense>
      )}
    </>
  );
}
```

### 3.4 骨架屏统一配置

**创建全局骨架屏组件：**
```typescript
// src/components/Skeleton/PageSkeleton.tsx
export function PageSkeleton() {
  return (
    <div className="p-4">
      <Skeleton active paragraph={{ rows: 4 }} />
      <div className="mt-4">
        <Skeleton.Input active style={{ width: '100%', height: 200 }} />
      </div>
    </div>
  );
}
```

**路由级别 loading 配置：**
```typescript
// RouterProvider.tsx
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/Skeleton';

export const RouterProvider = () => {
  return (
    <RouterContext.Provider value={router}>
      <Suspense fallback={<PageSkeleton />}>
        <Provider router={router.reactRouter} />
      </Suspense>
    </RouterContext.Provider>
  );
};
```

---

## 预期效果

| 指标 | 当前 | 优化后 | 提升 |
|------|------|--------|------|
| 开发环境冷启动 | ~10s | ~3s | 70% |
| 开发环境热更新 | ~2s | ~0.5s | 75% |
| 生产环境首次加载 | ~5s | ~2s | 60% |
| 路由切换时间 | ~1s | ~0.3s | 70% |

---

## 实施顺序

1. **Phase 1** - Vite 配置优化（改动小，见效快）
2. **Phase 2** - Bundle 优化（需要测试验证）
3. **Phase 3** - 运行时优化（需要回归测试）

每个阶段完成后进行验证，确保无回归问题后再进入下一阶段。