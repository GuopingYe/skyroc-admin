# 前端全流程性能优化设计方案

## 背景

当前前端应用加载速度慢，影响开发效率和用户体验。问题涉及多个环节：开发环境启动、页面加载、路由切换、API 请求等。

## 目标

全流程性能优化，包括：
- 开发环境：冷启动、热更新、页面刷新
- 生产环境：首次加载、路由切换、API 请求

---

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
server: {
  fs: {
    cachedChecks: true  // 减少文件系统检查
  }
}
```

> 注：`cacheDir: 'node_modules/.vite'` 是 Vite 默认值，无需显式配置。

### 1.4 验证与回滚

**验证方法：**
1. 运行 `vite --debug` 查看 warmup 和 optimizeDeps 耗时
2. 对比修改前后的冷启动时间
3. 测试热更新响应时间

**回滚策略：**
```bash
git revert <commit-hash>
rm -rf node_modules/.vite  # 清除缓存
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

  // Ant Design（包含所有 rc-* 组件）
  if (id.includes('node_modules/antd/') ||
      id.includes('node_modules/@ant-design/') ||
      id.includes('node_modules/rc-')) {
    return 'antd';
  }

  // 图表库（已有按需引入配置）
  if (id.includes('node_modules/echarts/') ||
      id.includes('node_modules/zrender/')) {
    return 'echarts';
  }

  // 动画库（项目使用 motion，非 framer-motion）
  if (id.includes('node_modules/motion/')) {
    return 'animation';
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

  // 状态管理（zustand 为主，保留 redux 兼容）
  if (id.includes('node_modules/zustand/')) {
    return 'zustand';
  }

  if (id.includes('node_modules/@reduxjs/') ||
      id.includes('node_modules/react-redux/')) {
    return 'redux';
  }

  // @sa 系列工具
  if (id.includes('node_modules/@sa/')) {
    return 'sa-utils';
  }

  // 其他 node_modules
  if (id.includes('node_modules/')) {
    return 'vendor';
  }
}
```

### 2.2 第三方库按需引入

#### 2.2.1 ECharts（已有实现，无需修改）

**现有配置位置：** `src/hooks/common/echarts.ts`

已包含按需引入配置：
- 图表类型：BarChart, LineChart, PieChart, BoxplotChart, GaugeChart, RadarChart, ScatterChart, PictorialBarChart
- 组件：TitleComponent, LegendComponent, TooltipComponent, GridComponent, DatasetComponent, TransformComponent, ToolboxComponent
- 渲染器：CanvasRenderer

**优化建议：** 仅在需要新增图表类型时修改此文件。

#### 2.2.2 dayjs 按需引入（确认现有配置）

检查 `src/plugins/dayjs.ts` 确认是否只引入了必要的 locale 和 plugin。

#### 2.2.3 antd 按需引入

确认 `babel-plugin-import` 配置生效，检查是否有全量引入的情况。

### 2.3 路由懒加载完善

**当前实现：** 项目使用 React Router 的 `patchRoutesOnNavigation` 模式实现路由懒加载（见 `src/features/router/router.ts`）。

**优化建议：**
1. 确认所有页面组件使用 `lazy()` 包装
2. 在路由配置中保持现有的懒加载模式，无需额外 preload 配置
3. 确保 Suspense fallback 使用统一的加载组件

### 2.4 验证与回滚

**验证方法：**
1. 运行 `vite build --mode production` 后使用 `vite-bundle-visualizer` 分析包体积
2. 检查各 chunk 大小是否合理
3. 确认没有重复打包的模块

**回滚策略：**
```bash
git revert <commit-hash>
pnpm build  # 重新构建验证
```

---

## Phase 3: 运行时优化

### 3.1 路由初始化优化

**当前问题：**
- `initAuthRoutes` 中 `devAutoLogin()` 必须先完成（设置认证）
- 用户信息获取和路由获取是独立的，可以并行

**优化方案：**
```typescript
// initRouter.ts
export async function initAuthRoutes(addRoutes: (parent: string | null, route: RouteObject[]) => void) {
  const authRouteMode = import.meta.env.VITE_AUTH_ROUTE_MODE;

  // 步骤1：确保认证完成（必须串行）
  await devAutoLogin();

  const reactAuthRoutes = mergeValuesByParent(authRoutes);

  // 步骤2：并行获取用户信息和路由（如果为动态模式）
  let userInfo: Api.Auth.UserInfo | undefined;
  let backendRoutes: Api.Route.BackendRouteResponse | null = null;

  if (authRouteMode === 'dynamic') {
    // 动态模式：并行获取用户信息和路由
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

    if (userInfoResult.status === 'fulfilled') {
      userInfo = userInfoResult.value;
    }
    if (routesResult.status === 'fulfilled') {
      backendRoutes = routesResult.value;
    }
  } else {
    // 静态模式：只获取用户信息
    userInfo = await queryClient.ensureQueryData<Api.Auth.UserInfo>({
      queryFn: fetchGetUserInfo,
      queryKey: QUERY_KEYS.AUTH.USER_INFO
    });
  }

  // 后续处理保持不变...
}
```

### 3.2 API 缓存策略优化

**现有配置位置：** `src/service/queryClient.ts`

**当前配置：**
```typescript
staleTime: 30 * 1000  // 30秒
gcTime: 10 * 60 * 1000  // 10分钟
```

**优化建议：** 当前配置对临床 MDR 系统是合理的，保持数据新鲜度。仅对特定 API 调整：

```typescript
// 用户信息：可延长缓存时间（用户信息变化较少）
useQuery({
  queryKey: QUERY_KEYS.AUTH.USER_INFO,
  queryFn: fetchGetUserInfo,
  staleTime: 5 * 60 * 1000, // 5分钟
});

// 树形数据：已有合理配置
useQuery({
  queryKey: QUERY_KEYS.GLOBAL_LIBRARY.TREE,
  queryFn: fetchGlobalLibraryTree,
  staleTime: 5 * 60 * 1000, // 已配置
  gcTime: 5 * 60 * 1000,    // 已配置
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

### 3.4 加载状态统一配置

**现有组件：** 项目已有 `GlobalLoading` 组件（`src/pages/loading.tsx`），提供带系统 Logo 和动画的加载体验。

**优化建议：**
1. 确认 Suspense fallback 使用 `GlobalLoading` 或其变体
2. 为数据加载场景创建轻量级骨架屏变体

**创建数据加载骨架屏：**
```typescript
// src/components/Skeleton/DataSkeleton.tsx
// 使用 UnoCSS 类名
export function DataSkeleton() {
  return (
    <div className="p-16px">
      <div className="animate-pulse flex flex-col gap-8px">
        <div className="h-16px bg-gray-200 rounded w-1/4" />
        <div className="h-16px bg-gray-200 rounded w-3/4" />
        <div className="h-16px bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}
```

**路由级别 loading 配置：**
```typescript
// RouterProvider.tsx
import { Suspense } from 'react';
import GlobalLoading from '@/pages/loading';

export const RouterProvider = () => {
  return (
    <RouterContext.Provider value={router}>
      <Suspense fallback={<GlobalLoading />}>
        <Provider router={router.reactRouter} />
      </Suspense>
    </RouterContext.Provider>
  );
};
```

### 3.5 验证与回滚

**验证方法：**
1. 使用 Chrome DevTools Performance 录制页面加载过程
2. 测量路由切换时间
3. 检查网络请求瀑布图，确认并行化生效

**回滚策略：**
```bash
git revert <commit-hash>
```

---

## 预期效果

| 指标 | 当前（需实测） | 优化后目标 | 预期提升 |
|------|---------------|-----------|---------|
| 开发环境冷启动 | 待测量 | ~3s | ~70% |
| 开发环境热更新 | 待测量 | ~0.5s | ~75% |
| 生产环境首次加载 | 待测量 | ~2s | ~60% |
| 路由切换时间 | 待测量 | ~0.3s | ~70% |

> **重要：** 实施前请先使用下方测量工具记录当前值，以便准确评估优化效果。

---

## 实施顺序

1. **Phase 1** - Vite 配置优化（改动小，见效快）
2. **Phase 2** - Bundle 优化（需要测试验证）
3. **Phase 3** - 运行时优化（需要回归测试）

每个阶段完成后进行验证，确保无回归问题后再进入下一阶段。

---

## 测量工具

### 开发环境
```bash
# 查看 Vite 启动各阶段耗时
vite --debug

# 分析依赖预构建
vite --debug optimizeDeps
```

### 生产环境
```bash
# 分析 bundle 体积
pnpm build
npx vite-bundle-visualizer

# Lighthouse 性能测试
npx lighthouse http://localhost:9725 --output html --output-path ./lighthouse-report.html
```

### 运行时
- Chrome DevTools Performance 面板
- Chrome DevTools Network 面板
- React DevTools Profiler