# Feature Group — Figma 1:1 走查清单

**规范优先级**：与内部 PRD（如 `docs/design/front-design/产品原型图.md`）冲突时，以 **Figma 导出代码**（`docs/references/feature-group-figma-export/` 与 WideTable `CanvasPage.tsx` 中的 `FeatureGroupPanel`）为准。

## A. 参考包完整性

- [x] `docs/references/feature-group-figma-export` 存在且可 `npm i && npm run dev` 对照像素
- [x] `FGFormData` / 四步 Wizard 与 `FeatureGroupModal.tsx` 中 `EMPTY_FORM`、`STEPS` 一致（`FEATURE_STORE.html` FG Modal 对齐）

## B. FG 列表页（vs `FeatureGroupList.tsx`）

- [x] 顶栏：Teal 竖条 + 「Feature Groups」+ 条目计数
- [x] 搜索框、Add、Module Dir、Refresh、Settings、导出 HTML
- [x] **卡片列表**（非简单表格）：左边条、标题/状态/Training·Serving 计数 tag、描述、Meta（Region / Module / Owner pills / Updated）
- [x] 行内：Edit / Copy / Manage（Online、Revoke、Offline 确认、Delete）与禁用态
- [x] 分页

## C. FG 详情页（vs `FeatureGroupDetail.tsx`）

- [x] 面包屑、返回、标题 + `StatusTag`、描述、Edit + Manage
- [x] 三列 **Basic / Training / Serving** 配置面板（字段与导出一致）
- [x] Tab：Feature List & Availability、Lineage、Offline DQC、Version History

## D. FG Modal（vs `FeatureGroupModal.tsx`）

- [x] 四步：Basic Info、Training Config、Serving Config、Feature Mapping
- [x] Basic：`name`、`region`、`module`、`owners`（多选 chips）、`description`
- [x] Training：`dataServer`；`tableSchema` / `tableName`（下拉，仅 **Project Table Access List**）；`datePartition` 与 `partitionType` 同一行；`updateFrequency`（Daily / Weekly / Monthly / ONCE）；`entitiesColumns`（多选必填）；`filter`（界面文案 **Custom Filter**）
- [x] Serving：`servingBlocks[]` — 可增删；每块 **Feature Source** + **Transformation**（mock 默认绑定 Region 下最新 enabled 版本）；**Data Latency** 与 **FS / TF 版本** 为 Feature Source / 解析结果的只读 Tag；Source Type、Input Params 回显；**允许 0 块**（仅 Training）；**跨块 Serving 输出名禁止重复**
- [x] Feature Mapping：Serving 输出并集 → Training 列（可选、Auto Match）；其下 **Compute features**（Name、SQL、DataType），SQL 标识符须属于上述 Serving 输出集合
- [x] Save Draft、Next、Back、Submit；步骤校验

## E. WideTable 画布 C/D/E（vs `FeatureGroupPanel`）

- [x] 右栏 **Config**：FG 组合框（搜索 + 下拉 + Eye 信息卡）、Columns（idle/parsing/ready、全选/半选、类型 badge）、Smart Join（Join Type + PK/ET 三列网格）
- [x] **Last Instance**：Status、Instance ID、FG 摘要（对齐 `WTC_FG_LAST_INST` / `wtcFgLastInstHtml`）
- [x] 底部 hint；禁止用 `wtc-pr-row` 替代可编辑配置控件

## F. 禁令回归

- [x] 配置区无 **只读 `wtc-pr-row` 伪装表单**

## 签认

| 日期 | 角色 | 备注 |
|------|------|------|
| 2026-03-20 | Prototype | HTML：`wtcBuildFeatureGroupPanelHtml`、`wtcFgLastInstHtml`、`wtcSyncRpHeader`；像素以 Figma 导出与 `CanvasPage` `FeatureGroupPanel` 为参照 |
