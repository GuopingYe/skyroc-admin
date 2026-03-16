# TFL Designer 复刻项目计划

## 项目概述

复刻 TFL Designer - 临床试验表格、图表、列表编辑器

**技术栈**: React 18 + TypeScript + Ant Design 5 + Plotly.js + Zustand + Vite

---

## Phase 1: 基础框架 (Week 1-2)

### 1.1 项目初始化 ✅
- [x] 创建项目结构
- [x] 配置 TypeScript
- [x] 配置 Vite
- [x] 创建类型定义

### 1.2 核心布局
- [ ] 主布局组件
- [ ] 路由配置
- [ ] 导航菜单

### 1.3 Study 管理
- [ ] Study 列表页
- [ ] Study 创建向导
- [ ] Study 详情页

---

## Phase 2: Table 编辑器 (Week 3-6)

### 2.1 扁平表格
- [ ] 基本表格渲染
- [ ] 行编辑器
- [ ] 统计量配置

### 2.2 嵌套结构
- [ ] 嵌套表头 (Treatment Arm Set)
- [ ] 嵌套行 (Indent)
- [ ] SOC/PT 三级嵌套

### 2.3 模板系统
- [ ] 模板导入
- [ ] 模板库浏览
- [ ] 从模板创建

---

## Phase 3: Figure 编辑器 (Week 7-9)

### 3.1 Plotly 集成
- [ ] Plotly.js 包装组件
- [ ] 图表类型切换

### 3.2 图表类型
- [ ] 折线图
- [ ] 散点图
- [ ] 柱状图
- [ ] 箱线图
- [ ] KM 曲线

### 3.3 样式配置
- [ ] 轴配置
- [ ] 图例配置
- [ ] 颜色主题

---

## Phase 4: Listing 编辑器 (Week 10-11)

### 4.1 列表结构
- [ ] 列配置器
- [ ] 列顺序调整

### 4.2 排序筛选
- [ ] 排序配置
- [ ] 筛选条件

---

## Phase 5: 导出功能 (Week 12-14)

### 5.1 Word 导出
- [ ] docx.js 集成
- [ ] 表格格式化
- [ ] 页眉页脚

### 5.2 RTF 导出
- [ ] RTF 生成器

### 5.3 PDF 导出
- [ ] pdfmake 集成
- [ ] 图表渲染

---

## 数据模型

### Study
```typescript
interface Study {
  id: string;
  studyId: string;
  title: string;
  compound: string;
  phase: string;
  diseaseArea: string;
  therapeuticArea: string;
}
```

### TableShell
```typescript
interface TableShell {
  id: string;
  shellNumber: string;
  title: string;
  population: string;
  category: AnalysisCategory;
  dataset: string;
  treatmentArmSetId: string;
  statisticsSetId: string;
  rows: TableRow[];
  footer: TableFooter;
}
```

---

## 当前状态

**Phase 1 进行中**

- [x] 项目初始化
- [x] 类型定义
- [ ] 安装依赖
- [ ] 运行测试

---

## 下一步

1. 安装 npm 依赖
2. 运行开发服务器
3. 完善 Study 管理功能
4. 开发 Table 编辑器 MVP