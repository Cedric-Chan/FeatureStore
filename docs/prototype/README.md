# 原型与演示（在线特征平台）

## FEATURE_STORE 交互演示

- **入口说明页**：[FEATURE_STORE.html](./FEATURE_STORE.html)。
- **公开分享（推荐，无需本地 npm）**：[公开演示-GitHub-Pages.html](./公开演示-GitHub-Pages.html) — 推送到 GitHub 后由 Actions 自动发布到 **GitHub Pages**，得到固定 HTTPS 链接。
- **唯一真源（实现）**：[`../references/feature-widetable-figma-export/`](../references/feature-widetable-figma-export/)（Vite + React）。
- **旧版单文件归档**：[FEATURE_STORE.legacy.html](./FEATURE_STORE.legacy.html)（历史参考）。

### 本页「打开演示」链接（FEATURE_STORE.html）

`dist/` 默认不提交仓库。在 `docs/references/feature-widetable-figma-export` 执行 **`pnpm run sync-prototype`**，会把构建结果复制到 **`docs/prototype/feature-store-demo/`**，与 `FEATURE_STORE.html` 同级，便于 `file://` 下点击链接或双击 `index.html`（避免跨目录 `../references/.../dist` 被浏览器拦截）。

`feature-store-demo/` 已列入 [`./.gitignore`](./.gitignore)，需在本机生成。

### 分享给他人（无公网 URL 时）

1. 在 `docs/references/feature-widetable-figma-export` 执行 `pnpm install` 与 `pnpm run build`（或 `pnpm run sync-prototype`）。
2. 将生成的 **`dist` 文件夹**（或整个 `feature-store-demo`，与 `dist` 内容相同）打成 zip 发送。
3. 对方解压后，用浏览器打开 **`index.html`**（`base: './'` 与 Hash 路由，一般可直接打开）。
4. 若浏览器策略导致脚本无法运行，在解压目录执行：`python3 -m http.server 8765`，再访问 `http://127.0.0.1:8765`。

### 可选：固定线上链接

将同一 `dist` 部署到公司静态资源或 GitHub Pages 后，把 HTTPS URL 记在团队文档或 `FEATURE_STORE.html` 中，便于「一条链接演示」。
