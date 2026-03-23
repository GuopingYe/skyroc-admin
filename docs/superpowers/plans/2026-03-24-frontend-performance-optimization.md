# 前端全流程性能优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化前端开发环境和生产环境的加载性能，包括冷启动、热更新、首屏加载和路由切换。

**Architecture:** 分三个阶段实施：Phase 1 优化 Vite 配置（预热、预构建）、Phase 2 优化 Bundle 拆分策略、Phase 3 优化运行时性能（并行请求、懒加载）。每个阶段独立验证后再进入下一阶段。

**Tech Stack:** Vite, React, TypeScript, React Query, Zustand, UnoCSS

**Design Spec:** `docs/superpowers/specs/2026-03-24-frontend-performance-optimization-design.md`

---

## 前置工作：性能基线测量

### Task 0: 测量当前性能基线

**Files:**
- N/A（仅测量）

- [ ] **Step 1: 测量开发环境冷启动时间**

```bash
cd frontend
time pnpm dev
# 等待页面完全加载后关闭
# 记录时间
```

- [ ] **Step 2: 测量热更新时间**

修改一个文件，观察终端输出的热更新耗时。

- [ ] **Step 3: 测量生产构建**

```bash
cd frontend
time pnpm build
```

- [ ] **Step 4: 分析当前 Bundle 结构**

```bash
cd frontend
pnpm build
npx vite-bundle-visualizer
```

- [ ] **Step 5: 记录基线数据**

创建文件 `docs/performance-baseline-2026-03-24.md` 记录当前性能数据：

```markdown
# 性能优化基线数据 (2026-03-24)

## 开发环境
- 冷启动时间：[记录时间]
- 热更新时间：[记录时间]

## 生产环境
- 构建时间：[记录时间]
- Bundle 总大小：[记录大小]
- 主要 Chunk 大小：[记录各 chunk 大小]

## 备注
[其他观察]
```

---

## Phase 1: Vite 配置优化

### Task 1.1: 增强预热配置

**Files:**
- Modify: `frontend/vite.config.ts:101-103`

- [ ] **Step 1: 更新 warmup.clientFiles 配置**

将以下代码替换到 `vite.config.ts` 的 `server.warmup` 部分：

```typescript
server: {
  host: '0.0.0.0',
  open: true,
  port: 9527,
  proxy: createViteProxy(viteEnv, enableProxy),
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
  },
  fs: {
    cachedChecks: true
  }
}
```

- [ ] **Step 2: 验证配置语法正确**

```bash
cd frontend
npx tsc --noEmit --skipLibCheck
```

Expected: 无错误

- [ ] **Step 3: 测试启动**

```bash
cd frontend
rm -rf node_modules/.vite
time pnpm dev
```

观察启动时间是否减少。

- [ ] **Step 4: 提交**

```bash
git add frontend/vite.config.ts
git commit -m "perf: enhance vite warmup configuration for faster cold start

- Add key entry files to warmup.clientFiles
- Enable fs.cachedChecks for faster file system operations

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 1.2: 配置依赖预构建

**Files:**
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: 添加 optimizeDeps 配置**

在 `vite.config.ts` 的 `return` 语句内，`build` 配置之前添加：

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
  exclude: [],
  force: false
},
```

- [ ] **Step 2: 验证配置语法正确**

```bash
cd frontend
npx tsc --noEmit --skipLibCheck
```

Expected: 无错误

- [ ] **Step 3: 清除缓存并测试**

```bash
cd frontend
rm -rf node_modules/.vite
time pnpm dev
```

首次启动会进行预构建，后续启动应该更快。

- [ ] **Step 4: 提交**

```bash
git add frontend/vite.config.ts
git commit -m "perf: configure optimizeDeps for dependency pre-bundling

- Pre-bundle frequently used dependencies to speed up dev server
- Include React, Ant Design, and utility libraries

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Phase 1 验证检查点

- [ ] **验证 Phase 1 完成**

1. 冷启动时间是否减少？
2. 热更新是否正常工作？
3. 应用功能是否正常？

**如果验证失败，执行回滚：**
```bash
git revert HEAD~2  # 回滚 Task 1.1 和 1.2 的两个提交
rm -rf node_modules/.vite
```

---

## Phase 2: Bundle 优化

### Task 2.1: 优化 manualChunks 配置

**Files:**
- Modify: `frontend/vite.config.ts:62-71`

> **注意 Chunk 命名变更：**
> - 原 `react` → 新 `react-core`
> - 原 `reactRouter` → 新 `react-ecosystem`
> - 原 `il8n` (typo) → 新 `i18n` (fixed)
> - 新增：`echarts`, `lodash`, `dayjs`, `zustand`, `vendor`

- [ ] **Step 1: 替换 manualChunks 配置**

将 `build.rollupOptions.output.manualChunks` 从对象形式改为函数形式：

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

  // 图表库
  if (id.includes('node_modules/echarts/') ||
      id.includes('node_modules/zrender/')) {
    return 'echarts';
  }

  // 动画库
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

  // 状态管理
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

- [ ] **Step 2: 执行生产构建测试**

```bash
cd frontend
pnpm build
```

Expected: 构建成功，无错误

- [ ] **Step 3: 分析 Bundle 结构**

```bash
cd frontend
npx vite-bundle-visualizer
```

检查：
- 各 chunk 大小是否合理
- 是否有重复打包的模块
- react-core, antd, echarts 等是否正确分离

- [ ] **Step 4: 提交**

```bash
git add frontend/vite.config.ts
git commit -m "perf: optimize manualChunks for better bundle splitting

- Use function-based manualChunks for fine-grained control
- Separate React core, ecosystem, and third-party libraries
- Fix typo: il8n -> i18n

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2.2: 检查第三方库按需引入

**Files:**
- Check: `frontend/src/plugins/dayjs.ts`
- Check: `frontend/babel.config.js` 或 `frontend/.babelrc`

- [ ] **Step 1: 检查 dayjs 配置**

```bash
cat frontend/src/plugins/dayjs.ts
```

确认是否只引入了必要的 locale 和 plugin。如果引入过多，记录优化建议。

- [ ] **Step 2: 检查 antd 按需引入配置**

```bash
# 检查是否有 babel-plugin-import 配置
cat frontend/babel.config.js 2>/dev/null || cat frontend/.babelrc 2>/dev/null || echo "No babel config found"
```

- [ ] **Step 3: 检查是否有全量引入**

```bash
cd frontend
# 检查是否有 import antd from 'antd' 这样的全量引入
grep -r "from 'antd'" src/ | grep -v "from 'antd/es" | grep -v "import {"
```

如果有全量引入，需要修改为按需引入。

- [ ] **Step 4: 记录结果**

如果检查发现问题，创建单独的修复任务。如果配置正确，跳过此任务。

---

### Task 2.3: 确认路由懒加载配置

**Files:**
- Check: `frontend/src/features/router/router.ts`
- Check: `frontend/src/router/elegant/imports.ts`

- [ ] **Step 1: 检查路由懒加载配置**

```bash
cat frontend/src/router/elegant/imports.ts | head -50
```

确认页面是否使用 `lazy()` 导入。

- [ ] **Step 2: 检查 Suspense fallback**

```bash
cat frontend/src/features/router/RouterProvider.tsx
```

确认是否有统一的 fallback 组件。

- [ ] **Step 3: 如果需要优化，记录改进点**

如果发现同步加载的页面组件，记录需要修改的文件。

---

### Phase 2 验证检查点

- [ ] **验证 Phase 2 完成**

1. 生产构建是否成功？
2. Bundle 体积是否合理？
3. 各 chunk 是否正确分离？
4. 应用功能是否正常？

**如果验证失败，执行回滚：**
```bash
git revert HEAD~1  # 回滚 Task 2.1 的提交
pnpm build
```

---

## Phase 3: 运行时优化

### Task 3.1: 优化路由初始化并行化

**Files:**
- Modify: `frontend/src/features/router/initRouter.ts`

> **优化目标：** 在动态模式下，将 `fetchGetUserInfo` 和 `fetchGetBackendRoutes` 从串行改为并行执行。

- [ ] **Step 1: 替换 initAuthRoutes 函数**

将 `initAuthRoutes` 函数完整替换为以下代码：

```typescript
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
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd frontend
npx tsc --noEmit --skipLibCheck
```

Expected: 无错误

- [ ] **Step 3: 测试应用启动**

```bash
cd frontend
pnpm dev
```

测试：
- 登录是否正常
- 路由是否正确加载
- 页面功能是否正常

- [ ] **Step 4: 提交**

```bash
git add frontend/src/features/router/initRouter.ts
git commit -m "perf: parallelize user info and routes fetching in initAuthRoutes

- Use Promise.allSettled for parallel API calls in dynamic mode
- Keep devAutoLogin serial (authentication must complete first)
- Handle partial failures gracefully

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3.2: 创建数据加载骨架屏组件

**Files:**
- Create: `frontend/src/components/Skeleton/DataSkeleton.tsx`

- [ ] **Step 1: 创建骨架屏组件目录**

```bash
mkdir -p frontend/src/components/Skeleton
```

- [ ] **Step 2: 创建 DataSkeleton 组件**

```typescript
// frontend/src/components/Skeleton/DataSkeleton.tsx
// @unocss-include

interface DataSkeletonProps {
  rows?: number;
  className?: string;
}

export function DataSkeleton({ rows = 4, className = '' }: DataSkeletonProps) {
  return (
    <div className={`p-16px ${className}`}>
      <div className="animate-pulse flex flex-col gap-8px">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-16px bg-gray-200 dark:bg-gray-700 rounded"
            style={{ width: `${Math.random() * 50 + 25}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="p-16px">
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex gap-8px mb-8px">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-32px bg-gray-200 dark:bg-gray-700 rounded flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-8px mb-4px">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-24px bg-gray-100 dark:bg-gray-800 rounded flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建导出文件**

```typescript
// frontend/src/components/Skeleton/index.ts
export { DataSkeleton, TableSkeleton } from './DataSkeleton';
```

- [ ] **Step 4: 验证编译**

```bash
cd frontend
npx tsc --noEmit --skipLibCheck
```

Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add frontend/src/components/Skeleton/
git commit -m "feat: add DataSkeleton and TableSkeleton components

- UnoCSS-based skeleton components for loading states
- Support customizable rows and columns

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3.3: 优化 RouterProvider 的 Suspense fallback

**Files:**
- Modify: `frontend/src/features/router/RouterProvider.tsx`

- [ ] **Step 1: 检查当前 RouterProvider 配置**

```bash
cat frontend/src/features/router/RouterProvider.tsx
```

- [ ] **Step 2: 如果需要，添加 Suspense fallback**

如果当前没有 Suspense 或 fallback 不统一，修改为：

```typescript
import { Suspense } from 'react';
import { RouterProvider as Provider } from 'react-router-dom';

import GlobalLoading from '@/pages/loading';

import { router } from './router';
import { RouterContext } from './router-context';

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

- [ ] **Step 3: 验证编译**

```bash
cd frontend
npx tsc --noEmit --skipLibCheck
```

Expected: 无错误

- [ ] **Step 4: 测试页面加载**

刷新页面，确认加载过程中显示 GlobalLoading。

- [ ] **Step 5: 提交（如果有修改）**

```bash
git add frontend/src/features/router/RouterProvider.tsx
git commit -m "perf: add Suspense with GlobalLoading fallback to RouterProvider

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3.4: Modal/Drawer 组件懒加载（可选优化）

> **说明：** 此任务为可选优化，可以在主优化完成后根据实际需要实施。

**Files:**
- 各页面组件中的 Modal/Drawer

**实施策略：**
对于大型 Modal/Drawer 组件，使用 `lazy()` + 条件渲染实现懒加载：

```typescript
import { lazy, Suspense } from 'react';

const HeavyModal = lazy(() => import('./HeavyModal'));

function ParentComponent() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button onClick={() => setVisible(true)}>Open</Button>
      {visible && (
        <Suspense fallback={<Spin />}>
          <HeavyModal visible={visible} onClose={() => setVisible(false)} />
        </Suspense>
      )}
    </>
  );
}
```

**适用场景：**
- 代码体积较大的 Modal（如复杂的表单、表格选择器）
- 不在首屏渲染路径上的 Drawer
- 包含大量图表或数据的弹窗组件

---

### Phase 3 验证检查点

- [ ] **验证 Phase 3 完成**

1. 应用启动是否正常？
2. 路由切换是否更流畅？
3. 网络请求是否并行化？（检查 Network 面板）
4. 加载状态是否统一？

**如果验证失败，执行回滚：**
```bash
git log --oneline -5  # 查看最近的提交
git revert HEAD~3  # 回滚 Phase 3 的核心提交（Task 3.1-3.3）
```

---

## 最终验证

### Task 4: 全面回归测试

- [ ] **Step 1: 执行完整功能测试**

测试关键功能：
- 登录/登出
- 页面导航
- 数据加载
- 表单提交

- [ ] **Step 2: 性能对比测量**

```bash
# 开发环境冷启动
time pnpm dev

# 生产构建
time pnpm build

# Bundle 分析
npx vite-bundle-visualizer
```

对比 Phase 1 前的基线数据，计算优化效果。

- [ ] **Step 3: 创建性能报告**

记录优化前后的对比数据。

---

## 实施注意事项

1. **每个 Phase 完成后验证再继续**
2. **如果验证失败，立即回滚**
3. **保持小步提交，便于回滚**
4. **测试关键功能确保无回归**

## 回滚策略总览

| Phase | 回滚命令 |
|-------|----------|
| Phase 1 | `git revert HEAD~2` |
| Phase 2 | `git revert HEAD~1` |
| Phase 3 | `git revert HEAD~3` |

## 预期效果

| 指标 | 优化前（基线） | 优化后目标 | 提升幅度 |
|------|---------------|-----------|---------|
| 开发环境冷启动 | 待测量 | ~3s | ~70% |
| 开发环境热更新 | 待测量 | ~0.5s | ~75% |
| 生产环境首次加载 | 待测量 | ~2s | ~60% |
| 路由切换时间 | 待测量 | ~0.3s | ~70% |