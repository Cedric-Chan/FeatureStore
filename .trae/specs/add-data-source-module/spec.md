# Add Data Source Module Spec

## Why
目前 FeatureStore 的项目中没有 Data Source 模块，无法管理特征上游的数据源。用户希望在 Feature Source 模块之前新增一个 Data Source 模块，将最新的 Figma 导出代码集成进系统。

## What Changes
- 将附件中的 `DataSourceMappingPage.tsx` 页面组件复制并集成到 FeatureStore 项目中。
- 在左侧导航栏（Sidebar）的 Feature Source 前面新增 "Data Source" 菜单项。
- 在路由配置中新增 `/ds` 路由，指向 Data Source 列表页。

## Impact
- Affected specs: Data Source Mapping capability added.
- Affected code:
  - `docs/references/feature-widetable-figma-export/src/app/App.tsx`
  - `docs/references/feature-widetable-figma-export/src/app/layout/AppShell.tsx`
  - 新增 `docs/references/feature-widetable-figma-export/src/app/pages/DataSourceMappingPage.tsx`

## ADDED Requirements
### Requirement: Data Source 模块展示与路由
系统 SHALL 在侧边栏提供 "Data Source" 入口，点击后路由至 `/ds` 页面，展示 Data Source 的列表与映射管理功能。

#### Scenario: Success case
- **WHEN** 用户点击侧边栏的 "Data Source"
- **THEN** 系统跳转到 `/ds`，并展示 `DataSourceMappingPage` 页面。
