# 性能优化基线数据 (2026-03-24)

## 开发环境
- 冷启动时间：[需手动测量] - 运行 `pnpm dev` 记录首次启动时间
- 热更新时间：[需手动测量] - 修改文件后记录 HMR 响应时间

## 生产环境
- 构建时间：[构建失败] - ESM URL scheme 错误，需修复后重新测量
- Bundle 总大小：**4.9 MB**
- 主要 Chunk 大小：

### JavaScript (总计: 3.7 MB, 117 个文件)
| Chunk | 大小 | 说明 |
|-------|------|------|
| antd-AtoIf3d3.js | 1.5 MB | Ant Design 组件库 |
| installCanvasRenderer-CzxzcCtG.js | 541 KB | Canvas 渲染器 (ECharts) |
| sa-BVbLQEW2.js | 316 KB | Sentry/监控相关 |
| InteractiveOutputEditor-CIaRKtWR.js | 170 KB | 交互式输出编辑器 |
| reactRouter-_JTEHkep.js | 74 KB | React Router |
| layout-DNyTozb_.js | 72 KB | 布局组件 |
| animate-B7RvZv46.js | 60 KB | 动画库 |
| create-visual-element-O3ueOyFw.js | 50 KB | 可视化元素 |
| il8n-BXwaFfp7.js | 49 KB | 国际化 |
| sortable.esm-CqMw6qAp.js | 45 KB | 拖拽排序库 |
| axios-DIsA03vz.js | 35 KB | HTTP 客户端 |
| index-B8-h-ZmE.js | 33 KB | 主入口 chunk |
| redux-BRdnnc2u.js | 27 KB | Redux 状态管理 |
| mockData-B81fJFyO.js | 21 KB | Mock 数据 |

### CSS (总计: 65 KB, 6 个文件)
| 文件 | 大小 |
|------|------|
| index-DifmFUuS.css | 38 KB |
| sa-CFFCsdOa.css | 6.3 KB |
| layout-JhfXqhQL.css | 2.9 KB |
| index-CMKNK2uU.css | 1.4 KB |
| GlobalContent-CwLjpQOY.css | 918 B |
| SearchModal-CdK_Fb2i.css | 172 B |

### 其他资源
- assets/: 560 KB
- images/: 504 KB

## 按目录分布
- dist/js/pages/: 662 KB (路由页面组件)
- dist/js/: 3.7 MB (核心 JS)

## 问题发现
1. **构建失败**: Windows 环境下 ESM URL scheme 错误
   - 错误: `ERR_UNSUPPORTED_ESM_URL_SCHEME`
   - 位置: `unconfig` 模块加载配置文件时
   - 影响: 无法重新构建测量准确时间

2. **Bundle 大小问题**:
   - antd chunk 过大 (1.5 MB) - 需检查按需引入
   - Canvas 渲染器较大 (541 KB) - 考虑懒加载
   - 117 个 JS 文件可能增加 HTTP 请求开销

## 待测量项
- [ ] 修复构建后重新测量构建时间
- [ ] 冷启动时间测量
- [ ] 热更新时间测量
- [ ] 首屏加载时间 (LCP)
- [ ] 交互时间 (TTI)

## 备注
- 数据来源: 2026-03-21 构建的 dist 文件夹
- 构建工具: Vite
- 包管理器: pnpm