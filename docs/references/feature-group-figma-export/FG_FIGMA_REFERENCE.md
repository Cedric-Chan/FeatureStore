# Feature Group Figma 导出 — 仓库引用说明

- **来源**：Figma bundle（见根目录 `README.md` 内 Figma 链接）；归档日期以 zip 为准。
- **用途**：`FEATURE_STORE.html` 中 Feature Group **列表 / 详情 / Modal** 的像素与交互 **唯一对照**（与内部 PRD 冲突时以本导出为准）。
- **核心文件**：
  - `src/app/components/FeatureGroupList.tsx` — 卡片列表、Module Dir、Manage 下拉
  - `src/app/components/FeatureGroupDetail.tsx` — 详情三面板与 Tab
  - `src/app/components/FeatureGroupModal.tsx` — 三步表单与校验
  - `public/feature-group-list.html` — 静态导出参考（可选）
- **WideTable 画布 Feature 节点**：对照仓库内 `docs/references/feature-widetable-figma-export/src/app/components/CanvasPage.tsx` 的 `FeatureGroupPanel`（非本 zip 内文件）。
- **本地运行**：`npm i && npm run dev`，用于与 HTML 原型并排截图 Review。
