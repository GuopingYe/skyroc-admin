# SOC/PT 嵌套数据结构设计文档

## 1. 概述

本文档描述不良事件（Adverse Events, AE）表格中 SOC/PT 嵌套数据结构的设计，支持三级层级展示：**SOC > PT > Event**。

### 1.1 MedDRA 背景

- **SOC (System Organ Class)**: 系统器官分类，MedDRA 最高层级
  - 示例：`10017962` - "Gastrointestinal disorders"（胃肠系统疾病）
  
- **PT (Preferred Term)**: 首选语，标准化的医学术语
  - 示例：`10007050` - "Nausea"（恶心）
  
- **LLT (Lowest Level Term)**: 最低层级术语（本设计不涉及）

### 1.2 设计目标

- ✅ 支持三级嵌套：SOC → PT → Event
- ✅ 支持展开/折叠（每层级独立控制）
- ✅ 支持多维度排序（按名称、发生率、事件数）
- ✅ 支持灵活筛选（SOC、PT、严重程度等）
- ✅ 支持多治疗组统计汇总
- ✅ 兼容 Ant Design Table 组件

---

## 2. 数据结构说明

### 2.1 核心类型

#### 2.1.1 MedDRANode（基类）

```typescript
interface MedDRANode {
  code: string;       // MedDRA 编码
  name: string;      // 标准名称
  shortName?: string; // 简称（可选）
}
```

#### 2.1.2 SOCNode（顶层）

```typescript
interface SOCNode extends MedDRANode {
  id: string;
  type: 'SOC';
  expanded?: boolean;     // UI 展开状态
  ptNodes: PTNode[];      // 子 PT 节点
  stats?: SOCStats;       // 汇总统计
  sortOrder?: number;     // 排序权重
  isFiltered?: boolean;   // 筛选标记
}
```

#### 2.1.3 PTNode（中层）

```typescript
interface PTNode extends MedDRANode {
  id: string;
  type: 'PT';
  socId: string;          // 父 SOC ID
  socCode: string;        // 父 SOC Code
  expanded?: boolean;
  eventNodes: EventNode[];// 子 Event 节点
  stats?: PTStats;
  sortOrder?: number;
  isFiltered?: boolean;
}
```

#### 2.1.4 EventNode（底层）

```typescript
interface EventNode extends MedDRANode {
  id: string;
  type: 'Event';
  ptId: string;
  ptCode: string;
  socCode: string;
  
  // 事件详情
  verbatim?: string;      // 受试者原始描述
  severity?: 'Mild' | 'Moderate' | 'Severe';
  causality?: 'Related' | 'Not Related';
  outcome?: string;
  actionTaken?: string;
  
  stats?: EventStats;
  sortOrder?: number;
  isFiltered?: boolean;
}
```

### 2.2 统计数据结构

#### 2.2.1 SOCStats

```typescript
interface SOCStats {
  subjectCount: Record<string, number>;     // { armId: count }
  subjectPercent?: Record<string, number>;  // { armId: percent }
  eventCount?: Record<string, number>;      // { armId: count }
  totalSubjects?: number;
}
```

#### 2.2.2 EventStats

```typescript
interface EventStats {
  byArm: Record<string, ArmEventStats>;
}

interface ArmEventStats {
  n: number;              // 发生例数
  percent?: number;       // 百分比
  grade?: Record<string, number>;      // 按严重程度
  causality?: Record<string, number>;  // 按因果关系
  outcome?: Record<string, number>;    // 按结局
}
```

### 2.3 树结构

```typescript
interface AEDataTree {
  studyId: string;
  population: string;     // 分析人群
  socNodes: SOCNode[];     // SOC 节点数组
  
  filters?: AETreeFilter;
  sortConfig?: AETreeSort;
}
```

### 2.4 筛选与排序

```typescript
interface AETreeFilter {
  socCodes?: string[];
  ptCodes?: string[];
  minSubjects?: number;
  severity?: ('Mild' | 'Moderate' | 'Severe')[];
  causality?: ('Related' | 'Not Related')[];
}

interface AETreeSort {
  field: 'name' | 'subjectCount' | 'eventCount' | 'sortOrder';
  order: 'asc' | 'desc';
  scope: 'SOC' | 'PT' | 'Event';
}
```

### 2.5 行配置（表格渲染用）

```typescript
interface SOCPTRowConfig extends TableRow {
  nodeType: 'SOC' | 'PT' | 'Event';
  code: string;
  meddraName: string;
  socId?: string;
  ptId?: string;
  isExpanded?: boolean;
  hasChildren?: boolean;
  isFiltered?: boolean;
  rowStyle?: 'header' | 'data' | 'summary';
  dataRef?: SOCNode | PTNode | EventNode;
}
```

---

## 3. API 设计

### 3.1 工具函数接口

```typescript
interface SOCPTHelpers {
  // 扁平化树为行数组
  flattenTree(tree: AEDataTree, expandedOnly?: boolean): SOCPTRowConfig[];
  
  // 切换展开状态
  toggleExpand(nodeId: string, nodeType: 'SOC' | 'PT'): void;
  
  // 全部展开/折叠
  expandAll(): void;
  collapseAll(): void;
  
  // 筛选
  filterTree(filters: AETreeFilter): AEDataTree;
  
  // 排序
  sortTree(sortConfig: AETreeSort): AEDataTree;
  
  // 查找节点
  findNode(code: string, nodeType: 'SOC' | 'PT' | 'Event'): 
    SOCNode | PTNode | EventNode | undefined;
  
  // 统计汇总
  aggregateStats(node: SOCNode | PTNode): SOCStats | PTStats;
}
```

### 3.2 Zustand Store API

```typescript
interface AEStore {
  // State
  tree: AEDataTree;
  expandedNodes: Set<string>;
  filters: AETreeFilter;
  sortConfig: AETreeSort;
  
  // Actions
  setTree: (tree: AEDataTree) => void;
  toggleExpand: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setFilters: (filters: AETreeFilter) => void;
  setSort: (sortConfig: AETreeSort) => void;
  
  // Computed
  flattenedRows: SOCPTRowConfig[];
  visibleSOCCount: number;
  visiblePTCount: number;
  visibleEventCount: number;
}
```

### 3.3 React 组件 Props

```typescript
interface SOCPTTableProps {
  tree: AEDataTree;
  onRowClick?: (row: SOCPTRowConfig) => void;
  onExpandChange?: (nodeId: string, expanded: boolean) => void;
  defaultExpanded?: boolean;
  showStats?: boolean;
  highlightCode?: string;
  className?: string;
}
```

---

## 4. 示例数据

### 4.1 完整示例

```json
{
  "studyId": "STUDY001",
  "population": "SAFETY",
  "socNodes": [
    {
      "id": "soc-001",
      "type": "SOC",
      "code": "10017962",
      "name": "Gastrointestinal disorders",
      "shortName": "GI disorders",
      "expanded": true,
      "sortOrder": 1,
      "stats": {
        "subjectCount": {
          "arm-placebo": 15,
          "arm-drug-10mg": 22,
          "arm-drug-20mg": 28
        },
        "subjectPercent": {
          "arm-placebo": 25.0,
          "arm-drug-10mg": 36.7,
          "arm-drug-20mg": 46.7
        },
        "eventCount": {
          "arm-placebo": 18,
          "arm-drug-10mg": 32,
          "arm-drug-20mg": 45
        },
        "totalSubjects": 60
      },
      "ptNodes": [
        {
          "id": "pt-001",
          "type": "PT",
          "code": "10007050",
          "name": "Nausea",
          "socId": "soc-001",
          "socCode": "10017962",
          "expanded": true,
          "sortOrder": 1,
          "stats": {
            "subjectCount": {
              "arm-placebo": 8,
              "arm-drug-10mg": 15,
              "arm-drug-20mg": 20
            },
            "subjectPercent": {
              "arm-placebo": 13.3,
              "arm-drug-10mg": 25.0,
              "arm-drug-20mg": 33.3
            }
          },
          "eventNodes": [
            {
              "id": "evt-001",
              "type": "Event",
              "code": "10007050",
              "name": "Nausea",
              "ptId": "pt-001",
              "ptCode": "10007050",
              "socCode": "10017962",
              "severity": "Mild",
              "causality": "Related",
              "outcome": "Recovered",
              "stats": {
                "byArm": {
                  "arm-placebo": {
                    "n": 5,
                    "percent": 8.3,
                    "grade": { "Mild": 4, "Moderate": 1 },
                    "causality": { "Related": 2, "Not Related": 3 },
                    "outcome": { "Recovered": 5 }
                  },
                  "arm-drug-10mg": {
                    "n": 10,
                    "percent": 16.7,
                    "grade": { "Mild": 6, "Moderate": 3, "Severe": 1 },
                    "causality": { "Related": 8, "Not Related": 2 },
                    "outcome": { "Recovered": 9, "Ongoing": 1 }
                  },
                  "arm-drug-20mg": {
                    "n": 15,
                    "percent": 25.0,
                    "grade": { "Mild": 8, "Moderate": 5, "Severe": 2 },
                    "causality": { "Related": 13, "Not Related": 2 },
                    "outcome": { "Recovered": 12, "Ongoing": 2, "Fatal": 1 }
                  }
                }
              }
            },
            {
              "id": "evt-002",
              "type": "Event",
              "code": "10047370",
              "name": "Vomiting",
              "ptId": "pt-001",
              "ptCode": "10007050",
              "socCode": "10017962",
              "stats": {
                "byArm": {
                  "arm-placebo": { "n": 3, "percent": 5.0 },
                  "arm-drug-10mg": { "n": 5, "percent": 8.3 },
                  "arm-drug-20mg": { "n": 5, "percent": 8.3 }
                }
              }
            }
          ]
        },
        {
          "id": "pt-002",
          "type": "PT",
          "code": "10020804",
          "name": "Diarrhoea",
          "socId": "soc-001",
          "socCode": "10017962",
          "expanded": false,
          "sortOrder": 2,
          "stats": {
            "subjectCount": {
              "arm-placebo": 4,
              "arm-drug-10mg": 6,
              "arm-drug-20mg": 8
            }
          },
          "eventNodes": []
        }
      ]
    },
    {
      "id": "soc-002",
      "type": "SOC",
      "code": "10018065",
      "name": "General disorders and administration site conditions",
      "shortName": "General disorders",
      "expanded": false,
      "sortOrder": 2,
      "stats": {
        "subjectCount": {
          "arm-placebo": 10,
          "arm-drug-10mg": 12,
          "arm-drug-20mg": 15
        }
      },
      "ptNodes": [
        {
          "id": "pt-003",
          "type": "PT",
          "code": "10020772",
          "name": "Fatigue",
          "socId": "soc-002",
          "socCode": "10018065",
          "eventNodes": []
        }
      ]
    }
  ]
}
```

### 4.2 扁平化后行数据

```typescript
const flattenedRows: SOCPTRowConfig[] = [
  // SOC 行（展开）
  {
    id: "soc-001",
    label: "Gastrointestinal disorders",
    nodeType: "SOC",
    level: 0,
    code: "10017962",
    meddraName: "Gastrointestinal disorders",
    isExpanded: true,
    hasChildren: true,
    rowStyle: "header",
    indent: 0
  },
  // PT 行（展开）
  {
    id: "pt-001",
    label: "Nausea",
    nodeType: "PT",
    level: 1,
    code: "10007050",
    meddraName: "Nausea",
    socId: "soc-001",
    isExpanded: true,
    hasChildren: true,
    rowStyle: "header",
    indent: 20
  },
  // Event 行
  {
    id: "evt-001",
    label: "Nausea",
    nodeType: "Event",
    level: 2,
    code: "10007050",
    meddraName: "Nausea",
    socId: "soc-001",
    ptId: "pt-001",
    hasChildren: false,
    rowStyle: "data",
    indent: 40
  },
  // PT 行（折叠，无子节点显示）
  {
    id: "pt-002",
    label: "Diarrhoea",
    nodeType: "PT",
    level: 1,
    code: "10020804",
    meddraName: "Diarrhoea",
    socId: "soc-001",
    isExpanded: false,
    hasChildren: false,
    rowStyle: "data",
    indent: 20
  },
  // SOC 行（折叠）
  {
    id: "soc-002",
    label: "General disorders",
    nodeType: "SOC",
    level: 0,
    code: "10018065",
    meddraName: "General disorders",
    isExpanded: false,
    hasChildren: true,
    rowStyle: "header",
    indent: 0
  }
];
```

---

## 5. 实现要点

### 5.1 展开状态管理

使用 Zustand 管理展开状态，支持持久化：

```typescript
// useAEStore.ts
export const useAEStore = create<AEStore>()(
  persist(
    (set, get) => ({
      expandedNodes: new Set<string>(),
      
      toggleExpand: (nodeId: string) => {
        set((state) => {
          const newExpanded = new Set(state.expandedNodes);
          if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId);
          } else {
            newExpanded.add(nodeId);
          }
          return { expandedNodes: newExpanded };
        });
      },
      
      expandAll: () => {
        const allIds = collectAllNodeIds(get().tree);
        set({ expandedNodes: new Set(allIds) });
      },
      
      collapseAll: () => {
        set({ expandedNodes: new Set() });
      }
    }),
    { name: 'ae-tree-expanded' }
  )
);
```

### 5.2 扁平化算法

```typescript
function flattenTree(
  tree: AEDataTree, 
  expandedNodes: Set<string>
): SOCPTRowConfig[] {
  const rows: SOCPTRowConfig[] = [];
  
  function traverse(
    soc: SOCNode, 
    pt?: PTNode, 
    event?: EventNode
  ): void {
    if (event) {
      // Event 节点
      rows.push(createEventRow(event, pt!, soc));
    } else if (pt) {
      // PT 节点
      rows.push(createPTRow(pt, soc));
      if (expandedNodes.has(pt.id)) {
        pt.eventNodes.forEach(e => traverse(soc, pt, e));
      }
    } else {
      // SOC 节点
      rows.push(createSOCRow(soc));
      if (expandedNodes.has(soc.id)) {
        soc.ptNodes.forEach(p => traverse(soc, p));
      }
    }
  }
  
  tree.socNodes.forEach(soc => traverse(soc));
  return rows;
}
```

### 5.3 排序算法

```typescript
function sortTree(tree: AEDataTree, config: AETreeSort): AEDataTree {
  const { field, order, scope } = config;
  
  const sortedSOCs = [...tree.socNodes].sort((a, b) => {
    if (field === 'name') {
      return order === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name);
    }
    if (field === 'subjectCount') {
      const aCount = sumStats(a.stats?.subjectCount);
      const bCount = sumStats(b.stats?.subjectCount);
      return order === 'asc' ? aCount - bCount : bCount - aCount;
    }
    return 0;
  });
  
  // 如果 scope 包含 PT，继续排序子节点
  if (scope === 'PT' || scope === 'Event') {
    sortedSOCs.forEach(soc => {
      soc.ptNodes.sort(/* 类似逻辑 */);
    });
  }
  
  return { ...tree, socNodes: sortedSOCs };
}
```

### 5.4 Ant Design Table 集成

```tsx
// SOCPTTable.tsx
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const SOCPTTable: React.FC<SOCPTTableProps> = ({ tree }) => {
  const expandedNodes = useAEStore(s => s.expandedNodes);
  const toggleExpand = useAEStore(s => s.toggleExpand);
  
  const rows = useMemo(
    () => flattenTree(tree, expandedNodes),
    [tree, expandedNodes]
  );
  
  const columns: ColumnsType<SOCPTRowConfig> = [
    {
      title: 'System Organ Class / Preferred Term',
      dataIndex: 'label',
      key: 'label',
      render: (text, record) => (
        <div style={{ paddingLeft: record.indent }}>
          {record.hasChildren && (
            <ExpandIcon 
              expanded={record.isExpanded}
              onClick={() => toggleExpand(record.id)}
            />
          )}
          <MedDRAName node={record} />
        </div>
      )
    },
    // 各治疗组的列...
  ];
  
  return <Table columns={columns} dataSource={rows} />;
};
```

---

## 6. 性能优化建议

### 6.1 虚拟滚动

对于大量 SOC/PT 数据（>500 行），使用 `react-window` 或 `antd@4` 的虚拟滚动：

```tsx
<Table
  virtual
  scroll={{ y: 600 }}
  // ...
/>
```

### 6.2 懒加载

对于超大数据集，实现按需加载 PT/Event：

```typescript
interface SOCNode {
  // ...
  ptNodesLoaded?: boolean;
  onLoadPTNodes?: () => Promise<PTNode[]>;
}
```

### 6.3 缓存

使用 React Query 缓存后端查询：

```typescript
const { data: tree } = useQuery(
  ['ae-tree', studyId, population],
  () => fetchAETree(studyId, population),
  { staleTime: 5 * 60 * 1000 }
);
```

---

## 7. 后续扩展

### 7.1 多语言支持

```typescript
interface MedDRANode {
  code: string;
  name: string;        // 默认语言
  nameLocalized?: {
    en: string;
    zh: string;
    ja: string;
  };
}
```

### 7.2 拖拽排序

支持用户自定义 SOC/PT 顺序：

```typescript
interface AETreeUserConfig {
  userId: string;
  customOrder: Array<{ code: string; order: number }>;
}
```

### 7.3 注释与标记

```typescript
interface AnnotatedNode extends SOCNode {
  annotations?: Array<{
    type: 'comment' | 'flag' | 'highlight';
    content: string;
    createdBy: string;
    createdAt: string;
  }>;
}
```

---

## 8. 参考资源

- [MedDRA 官方文档](https://www.meddra.org/)
- [CDISC ADaM AE 数据集](https://www.cdisc.org/standards/foundational/adam)
- [Ant Design Table 组件](https://ant.design/components/table-cn)
- [Zustand 状态管理](https://github.com/pmndrs/zustand)

---

*文档版本: 1.0.0*
*创建日期: 2026-03-14*
*作者: TFL Designer 架构团队*