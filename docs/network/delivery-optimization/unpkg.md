# unpkg 与 npm：包怎样变成浏览器可访问的 URL

`npm install` 和 `<script src="https://unpkg.com/...">` 都能拿到库的代码，但发生在不同阶段。npm registry 发布和存储包；npm、pnpm 等包管理器在开发或构建时解析并获取依赖；unpkg 则让浏览器通过 HTTP URL 获取包中的文件。

```text
Author → publish package → npm registry
                             ├─ package manager → build → site assets
                             └─ unpkg → browser fetches package files
```

前一条路径常把依赖打进站点产物，再发布到自己的 CDN；后一条把部分依赖获取留在用户访问页面时。开发机器用了 npm，不代表用户浏览器也在运行 npm。

## 包名、版本和文件路径怎样组成地址

```text
https://unpkg.com/preact@10.26.4/dist/preact.module.js
https://unpkg.com/@scope/package@1.2.3/dist/index.js
```

第二个是 scoped package 的格式示意，不代表该包真实存在。指定完整版本和文件路径，更容易得到稳定、可缓存的资源定位。省略版本、使用 `latest` 或范围时，要先解析到具体版本，增加重定向及随时间变化的可能。[UNPKG 文档](https://unpkg.com/)

npm 的同名同版本不能由作者用另一份包覆盖发布；改内容应发新版本。但 `latest` 是可以移动的 dist-tag，不等于固定版本，也不一定等于数字最大的版本。包卸载和服务可用性又是其他问题，固定版本 URL 不构成永久可用承诺。[npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/)、[dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/)

因此更新 `library@1.2.3` 不应期待旧 URL 变成新内容；发布 `1.2.4` 并更新引用，才符合版本缓存的逻辑。unpkg 也不会自动改写你已部署的 HTML 或项目 lockfile。

## 包中的文件不一定能直接在浏览器运行

npm 包可能包含 CommonJS、ESM、类型声明、CSS、Node 专用模块或未编译源码。HTTP 能下载到文件，只说明分发成功，不说明运行环境匹配。

```js
const fs = require("node:fs")
```

这段 Node 代码即使通过 CDN 成功返回，也不会在普通浏览器里自动获得 `require` 和文件系统。未转换的 TypeScript、JSX 同样不能当作常规 JavaScript 文件直接执行。

普通 unpkg 文件 URL 主要交付包文件，不应假定它会将任意包自动打成浏览器 bundle。包根入口还会受 `exports`、`unpkg` 等元数据影响；入口解析成功也不代表选中的内容适配浏览器。官方另有 `esm.unpkg.com` 模块转换服务，应区分文件分发与编译转换的职责，具体行为以 [UNPKG 文档](https://unpkg.com/)为准。

## 原生 ESM 为什么常需要 import map

浏览器能加载模块 URL，但不按 Node 的 `node_modules` 规则解析 `import "preact"` 这种 bare specifier。可以用 import map 显式映射：

```html
<script type="importmap">
  {
    "imports": {
      "preact": "https://unpkg.com/preact@10.26.4/dist/preact.module.js"
    }
  }
</script>
<script type="module">
  import { h } from "preact"
  console.log(h("span", null, "Ready"))
</script>
```

这里选择已经适合浏览器的 ESM 文件；示例版本仅用于说明固定版本，不代表推荐升级目标。模块内部若继续 import 其他 bare specifier，仍需相应映射、可解析的相对 URL 或构建工具。跨源模块加载也要满足 CORS 与 MIME 类型等要求。

构建工具可以提前处理依赖图、tree shaking、代码拆分和资源 hash；无构建模块则由浏览器逐步发现依赖。深层依赖链可能形成网络瀑布，不能只因用了公共 CDN 就认定页面更快。

## 发布包时，浏览器最后能拿到哪些文件

分发的是发布包内容，不是 Git 仓库的实时目录。仓库有 `dist/`，但若未构建或没有纳入发布包，远端文件 URL 仍可能不存在。

```json
{
  "name": "example-browser-library",
  "version": "1.2.3",
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": "./dist/index.js"
  },
  "unpkg": "./dist/index.global.js"
}
```

这是元数据示意，假设两个产物都已生成：ESM 入口供模块使用，global 构建用于传统 script。`unpkg` 字段不是让未生成的文件凭空存在。发布前可用下面的检查命令查看将被打包的文件，本次无需发布包：

```bash
npm pack --dry-run
```

发布哪些文件受 `files`、忽略规则与 npm 固定规则影响，详见 [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)。

## 生产环境怎样选择

小型示例和无构建页面可以从固定 CDN URL 直接加载；需要统一发布、严格版本控制和可用性管理的项目，则常把依赖在构建时确定，随自身产物分发。lockfile 约束项目安装过程，不会替一个 `@latest` 的浏览器 URL 固定版本；必要时还要审查传递依赖。

加载第三方脚本，也是在给予第三方代码页面执行权限。固定版本、核查产物、适用时配置 SRI 和 CSP，可以降低漂移和意外修改的风险，但不能证明依赖本身没有恶意逻辑。浏览器跨站缓存分区等策略也意味着“用户在别的网站加载过同一个公共 CDN 地址”不保证本站直接复用缓存。

出现旧内容时，先分清使用的是浮动入口还是固定文件，再检查重定向、浏览器缓存、边缘缓存与实际部署引用；排查路径与 CDN 资源更新一致。
