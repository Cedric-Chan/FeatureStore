# 在线特征平台 (Feature Store)

在线特征平台的设计文档与交互原型项目。面向算法/特征工程师、算法/DS/策略及下游消费方，提供从数据源取数 → 转换加工 → 特征包组装 → 特征检索文档 → 离线宽表画布的完整产品设计。

本项目为独立设计文档项目，与 Genos Analysis、Offline Features 等工程无耦合。

---

## 项目结构

```
Feature Source/
├── README.md                    # 项目总览（本文件）
├── .gitignore
├── .cursor/                     # Cursor IDE 规则配置
├── .github/                     # GitHub Actions（自动部署 Pages）
├── .trae/                       # Trae IDE 开发规格
│
├── docs/                        # 设计文档
│   ├── architecture/            # 系统架构设计
│   ├── design/                  # 产品设计 & 前端规格
│   │   ├── prd/                 # PRD / 产品与交付
│   │   ├── front-design/        # 前端 / UI·UX 设计描述
│   │   └── assets/              # 设计资产（图片）
│   ├── api/                     # OpenAPI 接口规格 (YAML)
│   ├── research/                # 竞品调研 & 技术选型
│   └── prototype/               # HTML 交互原型入口
│
└── prototypes/                  # Figma 导出前端原型源码
    ├── feature-widetable/       # 主原型 — 全部模块（Vite + React）
    ├── feature-group/           # Feature Group 模块原型
    ├── feature-map/             # Feature Map 模块原型
    └── feature-source/          # Feature Source 模块原型
```

---

## 文档索引

### 1. 系统架构

| 文件 | 说明 |
|------|------|
| [docs/architecture/在线特征平台架构说明.md](docs/architecture/在线特征平台架构说明.md) | 四层架构（FeatureSource / Transformer / FeatureGroup / FeatureMap）、离在线一致性、离线宽表、数据流、ER 图、状态枚举与 SLA |

### 2. PRD / 产品与交付

| 文件 | 说明 |
|------|------|
| [docs/design/prd/产品与交付示意图.md](docs/design/prd/产品与交付示意图.md) | 产品架构图、操作主流程、数据流转、页面结构（五大模块）、交付与开发预研 |

### 3. 前端 / UI·UX 设计

| 文件 | 说明 |
|------|------|
| [docs/design/front-design/产品原型图.md](docs/design/front-design/产品原型图.md) | 页面结构总览、五大模块原型说明（列表/表单/状态机/画布）、Figma 交付约定 |
| [docs/design/widetable-canvas-nodes-revamp.md](docs/design/widetable-canvas-nodes-revamp.md) | WideTable 画布节点细化：Data Ingestion / Data Cleaning、Execute Config、DAG 与 Report |
| [docs/design/feature-source-interaction-spec.md](docs/design/feature-source-interaction-spec.md) | Feature Source 交互规格说明 |
| [docs/design/transformation-ui-spec.md](docs/design/transformation-ui-spec.md) | Transformation 模块 UI 规格说明 |

### 4. Figma 对照文档

| 文件 | 说明 |
|------|------|
| [docs/design/Feature-Group-Figma-Walkthrough.md](docs/design/Feature-Group-Figma-Walkthrough.md) | Feature Group 模块 Figma 对照讲解 |
| [docs/design/WideTable-Figma-Walkthrough.md](docs/design/WideTable-Figma-Walkthrough.md) | WideTable 模块 Figma 对照讲解 |
| [docs/design/feature-map-figma-vs-spec.md](docs/design/feature-map-figma-vs-spec.md) | Feature Map Figma 与规格对照 |
| [docs/design/feature-source-figma-vs-spec.md](docs/design/feature-source-figma-vs-spec.md) | Feature Source Figma 与规格对照 |
| [docs/design/transformation-figma-vs-spec.md](docs/design/transformation-figma-vs-spec.md) | Transformation Figma 与规格对照 |
| [docs/design/widetable-figma-vs-spec.md](docs/design/widetable-figma-vs-spec.md) | WideTable Figma 与规格对照 |

### 5. API 规格

| 文件 | 说明 |
|------|------|
| [docs/api/feature-source-api.yaml](docs/api/feature-source-api.yaml) | Feature Source：CRUD、Test、Manage、Region Config |
| [docs/api/transformation-api.yaml](docs/api/transformation-api.yaml) | Transformation：CRUD、Version、Test、Manage |
| [docs/api/feature-group-api.yaml](docs/api/feature-group-api.yaml) | Feature Group：CRUD、Publish、Sync、Config Diff、Serving 画布 |
| [docs/api/widetable-api.yaml](docs/api/widetable-api.yaml) | WideTable：CRUD、Canvas Config、Instance Trigger/Kill、Report |
| [docs/api/feature-map-api.yaml](docs/api/feature-map-api.yaml) | Feature Map：检索、Module 树、Feature Cart |

### 6. 竞品调研

| 文件 | 说明 |
|------|------|
| [docs/research/竞品调研_Hopsworks.md](docs/research/竞品调研_Hopsworks.md) | Hopsworks Feature Store 竞品调研（原文摘录 + 链接 + 与架构说明对标） |

### 7. 交互原型

| 文件 | 说明 |
|------|------|
| [docs/prototype/FEATURE_STORE.html](docs/prototype/FEATURE_STORE.html) | 可交互 HTML 原型入口（浏览器直接打开） |
| [docs/prototype/公开演示-GitHub-Pages.html](docs/prototype/公开演示-GitHub-Pages.html) | 公开分享入口（GitHub Pages 自动发布） |
| [docs/prototype/FEATURE_STORE.legacy.html](docs/prototype/FEATURE_STORE.legacy.html) | 旧版单文件原型（历史归档） |
| [docs/prototype/feature-lifecycle-example.html](docs/prototype/feature-lifecycle-example.html) | 特征生命周期示例 |
| [docs/prototype/README.md](docs/prototype/README.md) | 原型与演示说明 |

---

## 原型源码

`prototypes/` 目录下包含 4 个 Figma 导出的前端原型项目，均为 Vite + React + Tailwind CSS + shadcn/ui 技术栈。

### 原型列表

| 项目 | 路径 | 说明 |
|------|------|------|
| **feature-widetable** | [prototypes/feature-widetable/](prototypes/feature-widetable/) | **主原型** — 包含全部五大模块（Feature Source / Transformation / Feature Group / Feature Map / WideTable 画布），是交互演示的唯一真源 |
| **feature-group** | [prototypes/feature-group/](prototypes/feature-group/) | Feature Group 模块 — 列表 / 详情 / Modal 三步表单与校验 |
| **feature-map** | [prototypes/feature-map/](prototypes/feature-map/) | Feature Map 模块 — 检索 / Module 树 / Feature Table / Feature Cart |
| **feature-source** | [prototypes/feature-source/](prototypes/feature-source/) | Feature Source 模块 — 数据源管理（列表 / 编辑 / 数据源映射） |

### 运行原型

```bash
# 进入具体原型目录，例如主原型
cd prototypes/feature-widetable

# 安装依赖（推荐 pnpm）
pnpm install
pnpm dev

# 构建
pnpm run build
```

原型路由使用 **HashRouter**，支持本地 `file://` 打开。构建产物在 `dist/` 目录。

产品行为与字段以 `docs/design/front-design/产品原型图.md` 及各 Figma 对照文档为准。

---

## 平台架构概述

在线特征平台分为四个核心层级和一个消费层：

```
┌──────────────┐   ┌──────────────┐
│ FeatureSource │   │  Transformer  │
│ · 取数逻辑     │   │  · 衍生加工    │
│ · DSL / 实体  │   │  · Groovy/Python│
│ · 出参描述     │   │  · 版本管理    │
└──────┬───────┘   └──────┬───────┘
       └────────┬─────────┘
                ▼
┌────────────────────────────────────┐
│  FeatureGroup (特征包)              │
│  · 1 FS + 1 Transformer           │
│  · 对外服务唯一出口                   │
│  · Train / Serve 双模式             │
└────────────────┬───────────────────┘
                 ▼
┌────────────────────────────────────┐
│  FeatureMap                        │
│  · 检索与文档                        │
│  · Feature Cart → 下游消费           │
└────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│  消费层                             │
│  · Feature WideTable (离线宽表)      │
│  · 下游推荐 / 风控 / 特征包直调       │
└────────────────────────────────────┘
```

详细架构说明见 [docs/architecture/在线特征平台架构说明.md](docs/architecture/在线特征平台架构说明.md)。

---

## CI / CD

- **GitHub Pages 自动部署**：`main` 分支推送后自动构建主原型并发布到 GitHub Pages。
- 工作流配置：[.github/workflows/deploy-feature-store-pages.yml](.github/workflows/deploy-feature-store-pages.yml)

---

*本项目为设计文档与原型项目，不包含后端实现代码。*
