# TFL Designer

Clinical Trial Tables, Figures, and Listings Editor

## 技术栈

- **前端框架**: React 18 + TypeScript
- **UI 组件库**: Ant Design 5
- **图表引擎**: Plotly.js
- **状态管理**: Zustand
- **构建工具**: Vite

## 项目结构

```
tfl-designer/
├── src/
│   ├── components/
│   │   ├── table/          # 表格编辑器组件
│   │   │   ├── NestedRowEditor.tsx    # 嵌套行编辑器 (支持 SOC/PT)
│   │   │   ├── TreatmentArmEditor.tsx # 治疗组编辑器 (支持分组)
│   │   │   ├── TablePreview.tsx       # 表格预览
│   │   │   └── TemplateSelector.tsx   # 模板选择器
│   │   ├── figure/         # 图表编辑器组件
│   │   │   ├── ChartTypeSelector.tsx  # 图表类型选择
│   │   │   ├── AxesConfig.tsx         # 坐标轴配置
│   │   │   ├── SeriesConfig.tsx       # 数据系列配置
│   │   │   └── FigurePreview.tsx      # 图表预览 (Plotly)
│   │   ├── listing/        # 列表编辑器组件
│   │   │   ├── ColumnEditor.tsx       # 列配置
│   │   │   ├── SortConfig.tsx         # 排序配置
│   │   │   └── ListingPreview.tsx     # 列表预览
│   │   └── common/
│   │       └── ExportModal.tsx        # 导出对话框
│   ├── pages/              # 页面
│   ├── stores/             # Zustand stores
│   ├── types/              # TypeScript 类型定义
│   ├── data/               # 内置模板数据
│   └── utils/              # 工具函数 (导出等)
├── docs/                   # 文档
│   ├── PRD.md              # 产品需求文档
│   ├── SOC_PT_DESIGN.md    # SOC/PT 设计文档
│   └── DEV_PLAN.md         # 开发计划
└── tfl-research/           # 研究资料 (107 个模板)
```

## 开发阶段

### Phase 1: 基础框架 ✅
### Phase 2: Table 编辑器 ✅
### Phase 3: Figure 编辑器 ✅
### Phase 4: Listing 编辑器 ✅
### Phase 5: 导出功能 ✅

## 已实现功能

### Table 编辑器
- ✅ 研究 CRUD 操作
- ✅ 表格元数据编辑
- ✅ SOC/PT 嵌套行编辑
- ✅ 多级嵌套表头 (基于 Grouping)
- ✅ 模板系统 (内置 10+ 模板)
- ✅ 实时预览

### Figure 编辑器
- ✅ 图表类型选择 (line, bar, scatter, box, km_curve)
- ✅ X/Y 轴配置
- ✅ 数据系列管理
- ✅ Plotly 实时预览

### Listing 编辑器
- ✅ 列配置 (变量、标签、宽度、对齐)
- ✅ 多字段排序
- ✅ 分页预览

### 导出功能
- ✅ Word (.doc) 导出
- ✅ RTF 导出
- ✅ PDF (HTML) 导出
- ✅ 批量导出

## 启动开发

```bash
npm install
npm run dev
# 访问 http://localhost:3000/
```

## 文档

- [产品需求文档](docs/PRD.md)
- [SOC/PT 设计文档](docs/SOC_PT_DESIGN.md)
- [开发计划](docs/DEV_PLAN.md)