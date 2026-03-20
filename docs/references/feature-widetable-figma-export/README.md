# Feature Store 原型 — Vite + React（唯一真源）

本目录为在线特征平台 **交互演示与原型** 的维护入口（原 Figma/Make 导出基础上演进）。产品行为与字段仍以 [`../../design/front-design/产品原型图.md`](../../design/front-design/产品原型图.md) 及对照文档为准。

- 旧版单文件 HTML 已归档为 [`../../prototype/FEATURE_STORE.legacy.html`](../../prototype/FEATURE_STORE.legacy.html)，请勿在其上继续迭代功能。
- 入口说明（分享演示、打开方式）：[`../../prototype/README.md`](../../prototype/README.md) 与 [`../../prototype/FEATURE_STORE.html`](../../prototype/FEATURE_STORE.html)。

## 开发

```bash
npm install
npm run dev
```

在浏览器打开终端提示的本地地址（默认 `http://127.0.0.1:5173`）。

## 构建与分享

```bash
npm run build
# 或
npm run build:demo
```

产物在 **`dist/`**（已配置 `base: './'`，便于静态托管或解压后直接打开 `index.html`）。路由使用 **HashRouter**，无需服务器即可在 `file://` 下切换页面。

将 **`dist` 文件夹** zip 给他人，解压后双击 `index.html`；若浏览器限制本地脚本，可在 `dist` 目录执行：

```bash
python3 -m http.server 8765
```

然后访问 `http://127.0.0.1:8765`。

## 代码结构（摘要）

| 区域 | 路径 |
|------|------|
| 路由与壳 | `src/app/App.tsx`, `src/app/layout/AppShell.tsx` |
| WideTable 列表 | `src/app/pages/WideTableListPage.tsx` |
| 画布（实例/编辑/新建） | `src/app/pages/CanvasPageRoutes.tsx`, `src/app/components/CanvasPage.tsx` |
| Mock 数据 | `src/data/mockWideTables.ts` |
| 其他导航页（占位，待与 spec 对齐迁移） | `MigratedPlaceholderPage`, `FeatureGroupDetailPage` 等 |

## 原始说明（导出自带）

`package.json` 中定义了 `build`、`dev`、`build:demo` 脚本。
