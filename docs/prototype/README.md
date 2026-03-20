# 原型与演示（在线特征平台）

## FEATURE_STORE 交互演示

- **入口说明页**：[FEATURE_STORE.html](./FEATURE_STORE.html)（打开后按说明操作）。
- **唯一真源（实现）**：[`../references/feature-widetable-figma-export/`](../references/feature-widetable-figma-export/)（Vite + React）。
- **旧版单文件归档**：[FEATURE_STORE.legacy.html](./FEATURE_STORE.legacy.html)（历史参考，不再作为主维护对象）。

### 分享给他人（无公网 URL 时）

1. 在 `docs/references/feature-widetable-figma-export` 执行 `npm install` 与 `npm run build`。
2. 将生成的 **`dist` 文件夹** 打成 zip 发送。
3. 对方解压后，用浏览器打开 **`dist/index.html`**（工程使用 `base: './'` 与 Hash 路由，一般可直接打开）。
4. 若浏览器策略导致脚本无法运行，在解压后的 `dist` 目录执行：`python3 -m http.server 8765`，再访问 `http://127.0.0.1:8765`。

### 可选：固定线上链接

将同一 `dist` 部署到公司静态资源或 GitHub Pages 后，把 HTTPS URL 记在团队文档或 `FEATURE_STORE.html` 中，便于「一条链接演示」。
