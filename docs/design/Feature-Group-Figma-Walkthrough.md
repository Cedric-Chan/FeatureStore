# Feature Group — Figma 1:1 走查清单

**规范优先级**：与内部 PRD（`docs/design/front-design/产品原型图.md` §3.3、§3.3.A）冲突时，以 **WideTable 原型包** `docs/references/feature-widetable-figma-export/` 中 `FeatureGroupList.tsx` / `FeatureGroupDetail.tsx` / `FeatureGroupModal.tsx` 为准。

## A. 参考包完整性

- [x] `docs/references/feature-widetable-figma-export` 可 `pnpm i && pnpm run build`
- [x] `FGFormData` 与 `FeatureGroupModal.tsx` 中 `EMPTY_FORM` 一致；**创建流**以 **`variant=basic` / `variant=training`** 为主，**不再**以四步 Step 条为默认入口

## B. FG 列表页（vs `FeatureGroupList.tsx`）

- [x] 顶栏：Teal 竖条 + 「Feature Groups」+ 条目计数
- [x] 搜索框、Add、Module Dir、Refresh、Settings、导出 HTML
- [x] **卡片列表**：左边条、标题/状态/Training·Serving 计数 tag、描述、Meta（Region / Module / Owner pills / Updated）
- [x] 行内：**Sync**（`RefreshCw`，英文 tooltip / `aria-label`：**Manually refresh latest Training Config metadata**）、**Copy**、**Manage**（**Online / Draft / Delete**；**Online Changing** 时 Sync 置灰）
- [x] **Draft** 可点击标题进入详情；**软删** Draft 后卡片从列表消失
- [x] 分页

## C. FG 详情页（vs `FeatureGroupDetail.tsx`）

- [x] 面包屑、返回、标题 + `StatusTag`、描述、**Sync** + Manage（规则同列表）
- [x] **三卡横栏**：Basic / Training / Serving **同一行三等分**（`lg+`）；Basic **Owner** 每邮箱一行；Training/Serving **未配置**时各自面板 **内联居中 Plus**（无独立中间加号列）
- [x] Training **Weekly / Monthly**：Modal 内英文频率说明（`aria-live` / `role="status"`）
- [x] Serving **Plus / Edit** → 路由 **`/fg/:fgId/serving`**
- [x] Tab：**Versions**（表头 **Created At** / **Published At** 英文 `title` tooltip；无 Rollback）

## D. FG Modal & Serving（vs 参考包）

- [x] **`variant=basic`**：仅 **Basic Info**（`Step0` 字段）；**无** Step 导航条、**无 Save Draft**；Cancel + Continue
- [x] **`variant=training`**：仅 **Training Config**（`Step1` 字段）；**无** Step 导航条；Cancel + Save
- [x] **Add / Copy** 列表入口仅打开 **`basic`**；**不再**从列表打开四步 Wizard
- [x] **Serving 画布**（`FgServingCanvasPage.tsx`）：平移/缩放/节点拖拽；**Publish History**；只读历史视图 + **Back to Current**；**Test Run** 抽屉（**Esc**、焦点、`aria-label`、主按钮 **44px**）；**Publish** 回详情并更新状态（Online → Online Changing）
- [x] **Manage > Online**（Online Changing）→ **Config Diff** 弹窗 → 确认后 **Online**
- [x] **Feature Mapping** 全步 Wizard：**非**本期默认入口

### D.1 无障碍与交互（ui-ux 对齐）

| 项 | 要求 |
|----|------|
| Sync / 加号 / 面板 Edit | `aria-label`；触摸目标 ≥ 44×44px（`min-h-[44px]` 或等价 padding） |
| Tooltip | 英文与 Sync 按钮 `title` 一致，便于 hover 与辅助技术 |
| Esc | Modal / 抽屉 / Diff 弹窗 **Esc** 关闭；多层时优先关闭最上层 |
| Focus | 打开 Modal / 抽屉后焦点进入首可交互控件（可用 `requestAnimationFrame`） |

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
| 2026-03-27 | PRD 评审 | Serving 路由、画布、Test Run 抽屉、Manage 三项、Versions、Config Diff |
