---
description: 前端架构规范（基于 skyroc-admin/Soybean-Admin 二次开发）。当需要编写新的业务页面（如元数据映射、PR 审批、Tracker 看板、TFL 构建器）或修改 UI 交互时必须调用此规范。
---
# Frontend Rules (Based on skyroc-admin framework)

## 0. 首要原则：尊重与复用现有框架 (Respect the Boilerplate)
我们当前基于 `skyroc-admin` (Soybean Admin 的 React 版本) 模板进行二次开发。在编写任何代码前，**必须先阅读并遵循该模板现有的约定**：
1. **API 请求:** 绝对禁止原生 `fetch` 或自行封装 axios。必须使用项目中现有的网络请求工具类（通常在 `src/utils/http` 或 `src/service` 下）。
2. **路由与菜单:** 必须遵循项目原有的动态路由和权限菜单加载逻辑（通常在 `src/router` 中配置）。
3. **UI 组件库:** 优先使用项目内置的 UI 库（如 Ant Design 或类似库）以及页面组件模板（Page Wrapper, Card 组件等），保持风格高度一致。
4. **CSS 样式:** 优先使用模板内置的 Tailwind CSS / UnoCSS 原子类，避免编写冗长的自定义 CSS 文件。

## 1. 核心业务模块开发规范 (MDR 特定要求)

### A. 权限与盲态控制 (RBAC & Blinding)
- 结合框架内置的权限系统，对非盲态（`Unblinded_Only`）数据进行严格的 UI 隔离和警示色（如红色 Lock Icon）标识。

### B. 元数据映射台 (Mapping Studio)
- 涉及海量 SDR/SDTM 字典映射时，若内置 Table 组件性能不足，允许引入 `@tanstack/react-table` 进行虚拟化列表渲染。
- 必须采用分栏布局或右侧 Drawer 进行映射详情编辑。

### C. 审批与 Diff 视图 (Governance UI)
- 针对 Global Library 的 Pull Request 审批，必须实现 JSON/逻辑代码的左右分栏 Diff 对比（绿增红减）。

### D. TFL 构建器 (Mock Shell Builder) - 最复杂交互
- 对于拖拽生成 TFL Mock Shell 的页面，允许引入 `@dnd-kit/core`。
- 必须使用 `Zustand` + `Immer` 独立管理拖拽模板树的复杂状态，不要污染框架的全局 Store。
- 导入 JSON 时，强制使用 `Zod` 进行数据验证。