# WideTable：Figma 导出走查清单

> 2025-03：已在 [`FEATURE_STORE.html`](../prototype/FEATURE_STORE.html) 落地一版与导出稿对齐的 Modals / 列表 / Frame Table 面板与其它节点脚标；后续仍以本表做回归。

**主参考**：[`docs/references/feature-widetable-figma-export/`](../references/feature-widetable-figma-export/)（`AddWideTableModal.tsx`、`WideTableMetaModal.tsx`、`TriggerInstanceModal.tsx`、`WideTableList.tsx`、`CanvasPage.tsx`）。

**冲突规则**：与内部 PRD / 《产品原型图》不一致时，**以导出稿为准**。**例外**：画布节点命名与结构（Data Ingestion / Data Cleaning、Execute Config、移除 Start）以 [`widetable-canvas-nodes-revamp.md`](widetable-canvas-nodes-revamp.md) 与《产品原型图》§3.5.2 为准，导出对齐后再恢复「以导出为准」。

**禁止项**：

- 禁止用 `wtc-pr-row` **只读行**代替节点配置区的**可编辑表单**（只读时间线/实例展示等除外）。
- Frame Table（节点 B）右侧面板字段集合 **不得少于** `CanvasPage.tsx` 中 `FrameTablePanel` 的配置区字段。

---

## 1. 文案与字符串（Modals + 校验）

| 位置 | 原型（HTML） | 导出稿 | 状态 |
|------|----------------|--------|------|
| 新建主按钮 | To Canvas + 箭头 SVG | 同左 | 已对齐 |
| 新建副标题 | Fill in metadata — all fields are required. | 同左 | 已对齐 |
| 字段名 WideTable Name | `WideTable Name` | 同左 | 已对齐 |
| Region 占位 | Select region... | 同左 | 已对齐 |
| Owner 占位 | Select owners… / N owners selected | 同左 | 已对齐 |
| Biz Team | `Biz Team` / Select biz team... | 同左 | 已对齐 |
| 校验文案 | 与 `validate()` 一致 | 同左 | 已对齐 |
| Meta 标题 | WideTable Meta | 同左 | 已对齐 |
| Meta 副标题 | WideTable Name and Region are not editable. | 同左 | 已对齐 |
| Trigger 主按钮 | Zap + Trigger | 同左 | 已对齐 |

## 2. WideTable 列表（WideTableList）

| 项 | 导出稿 | 原型 |
|----|--------|------|
| 表头 WIDETABLE NAME … ACTION | 同左 | 已对齐 |
| 工具栏 Add WideTable、Owned by me | 同左 | 已对齐 |
| 行操作 Edit / Copy / Delete | 同左 | 已对齐 |

## 3. Canvas — Frame Table（FrameTablePanel）

| 区块 | 导出稿 | 状态 |
|------|--------|------|
| Source Type Hive / SQL | 双按钮 + 文案 Hive / SQL | 已对齐 |
| Data Server、Hive 表字段、SQL 编辑器 | 含行号区、全屏编辑 | 已对齐 |
| Columns：idle / parsing / ready / error | 含 Select All、Search columns… | 已对齐 |
| Entity Column 多选、EventTime Column | 同左 | 已对齐 |
| Custom Filter（Hive，Optional） | 同左 | 已对齐 |
| Config / Last Instance 页签 | 同左 | 已对齐 |
| Last Instance 摘要块 | Status、Instance ID、Data Source、Statistics | 已对齐 |
| 底部提示文案 | Node · … | 已对齐 |

## 4. 其他节点面板（CanvasPage 各 Panel）

规格已演进为：**无 Start**；**Data Ingestion**（原 Data Sink）、**Data Cleaning**（原 End）、**Execute Config** 顶栏入口；连线 **FG → Data Ingestion → Data Cleaning**。对照字段与交互以 [`widetable-canvas-nodes-revamp.md`](widetable-canvas-nodes-revamp.md) 为准；当前导出仍可能含旧节点名，对齐前以规格为评审依据。

## 5. 回归 grep（每 PR）

- `wtc-pr-row`：仅应出现在只读展示（实例/时间线等），不应作为唯一配置 UI。
- `#tsModalPrimary`：`add` 模式须为 To Canvas，不得为 Confirm。

---

## 签认（可选）

- [ ] §1 Modals
- [ ] §2 List
- [ ] §3 Frame Table
- [ ] §4 Other nodes
- [ ] §5 Grep / 像素终验
