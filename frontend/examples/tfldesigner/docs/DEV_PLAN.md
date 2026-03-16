# TFL Designer 多角色开发计划

## 项目概述
复刻 TFL Designer (clinical tables/figures/listings 编辑器)
目标：完成 Phase 2-5 的所有功能

## 角色分工

### 🏗️ 架构师 (Architect)
- 设计 SOC/PT 嵌套数据结构
- 设计模板系统架构
- 定义 API 接口规范
- 制定代码规范

### 📋 产品经理 (Product Manager)  
- 定义功能需求
- 制定验收标准
- 优先级排序
- 用户故事编写

### 💻 前端开发 (Frontend Developer)
- 实现 SOC/PT 嵌套行编辑器
- 实现模板导入/导出
- 实现 Figure 编辑器
- 实现 Listing 编辑器
- 实现导出功能

### 🧪 测试工程师 (QA)
- 编写测试用例
- 功能验收测试
- 边界条件测试
- 回归测试

---

## 任务分配

### Sprint 1: SOC/PT 嵌套行 (当前)
| 任务 | 负责人 | 状态 |
|------|--------|------|
| 设计 SOC/PT 数据结构 | 架构师 | 🚀 |
| 实现嵌套行编辑器 | 前端 | ⏳ |
| 编写测试用例 | 测试 | ⏳ |

### Sprint 2: 模板系统
| 任务 | 负责人 | 状态 |
|------|--------|------|
| 定义模板需求 | 产品经理 | ⏳ |
| 设计模板架构 | 架构师 | ⏳ |
| 实现模板导入/导出 | 前端 | ⏳ |

### Sprint 3: Figure 编辑器
| 任务 | 负责人 | 状态 |
|------|--------|------|
| 图表类型需求 | 产品经理 | ⏳ |
| Plotly 集成设计 | 架构师 | ⏳ |
| 实现图表编辑器 | 前端 | ⏳ |

### Sprint 4: Listing 编辑器
| 任务 | 负责人 | 状态 |
|------|--------|------|
| Listing 需求定义 | 产品经理 | ⏳ |
| 实现 Listing 编辑器 | 前端 | ⏳ |

### Sprint 5: 导出功能
| 任务 | 负责人 | 状态 |
|------|--------|------|
| 导出格式需求 | 产品经理 | ⏳ |
| 实现 Word/RTF/PDF 导出 | 前端 | ⏳ |

---

## 开发环境
- 项目目录: `~/.openclaw/workspace/tfl-designer/`
- Dev Server: http://localhost:3000/
- 技术栈: React + TypeScript + Ant Design + Plotly.js + Zustand

## 协作方式
- 每个 agent 在独立会话中工作
- 主会话负责协调和合并
- 定期同步进度