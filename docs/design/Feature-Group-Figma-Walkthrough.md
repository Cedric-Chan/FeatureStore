# Feature Group — Figma 1:1 走查清单

**规范优先级**：与内部 PRD（`docs/design/front-design/产品原型图.md` §3.3、§3.3.A）冲突时，以 **WideTable 原型包** `docs/references/feature-widetable-figma-export/` 中 `FeatureGroupList.tsx` / `FeatureGroupDetail.tsx` / `FeatureGroupModal.tsx` 为准。

## A. 参考包完整性

- [x] `docs/references/feature-widetable-figma-export` 可 `pnpm i && pnpm run build`
- [x] `FGFormData` 与 `FeatureGroupModal.tsx` 中 `EMPTY_FORM` 一致；**创建流**以 **`variant=basic` / `variant=training`** 为主，**不再**以四步 Step 条为默认入口

## B. FG 列表页（vs `FeatureGroupList.tsx`）

- [x] 顶栏：Teal 竖条 + 「Feature Groups」+ 条目计数
- [x] 搜索框、Add、Module Dir、Refresh、Settings、导出 HTML
- [x] **卡片列表**：左边条、标题/状态/Training·Serving 计数 tag、描述、Meta（Region / Module / Owner pills / Updated）
- [x] 行内：**Sync**（`RefreshCw`，英文 tooltip / `aria-label`：**Manually refresh latest Training Config metadata**）、**Copy**、**Manage** 与禁用态（Online Changing / Disabled 时 Sync 置灰）
- [x] **Draft** 可点击标题进入详情
- [x] 分页

## C. FG 详情页（vs `FeatureGroupDetail.tsx`）

- [x] 面包屑、返回、标题 + `StatusTag`、描述、**Sync** + Manage（Sync 规则同列表）
- [x] **Draft 分阶段**：仅 Basic / 占位 Training+Serving+中央加号 / Training 已配置后回显；Basic 与 Training 卡片 **Edit** 打开对应单步 Modal
- [x] Tab：Feature List & Availability、Lineage、Offline DQC、Version History

## D. FG Modal（vs `FeatureGroupModal.tsx`）

- [x] **`variant=basic`**：仅 **Basic Info**（`Step0` 字段）；**无** Step 导航条、**无 Save Draft**；Cancel + Continue
- [x] **`variant=training`**：仅 **Training Config**（`Step1` 字段）；**无** Step 导航条；Cancel + Save
- [x] **Add / Copy** 列表入口仅打开 **`basic`**；**不再**从列表打开四步 Wizard
- [x] **Serving / Feature Mapping** 全步 Wizard：**非**本期默认入口（字段实现可仍存在于代码供后续拆分）

### D.1 无障碍与交互（ui-ux 对齐）

| 项 | 要求 |
|----|------|
| Sync / 加号 / 面板 Edit | `aria-label`；触摸目标 ≥ 44×44px（`min-h-[44px]` 或等价 padding） |
| Tooltip | 英文与 Sync 按钮 `title` 一致，便于 hover 与辅助技术 |
| Esc | 打开 Modal 时 Esc 关闭；多层 Modal 时 **优先关闭最上层**（避免误关底层） |
| Focus | 打开 Modal 后焦点进入表单首字段（可用 `requestAnimationFrame`） |

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
| 2026-03-27 | PRD 评审 | §3.3.A 多 Modal、Sync、Draft 分阶段；走查清单 B/C/D 同步 |
