# 依赖、Monorepo 与库发布

本地能引用同仓源码，不代表发布后的包能被用户使用。安装图、任务图和公开入口需要分开理解。

## 清单与锁文件各管什么

`dependencies` 声明被消费或运行所需依赖；`devDependencies` 用于本仓开发构建；`peerDependencies` 表达与消费方宿主的兼容约束；`optionalDependencies` 表达可选安装能力。Peer 不是简单地“不安装”，自动安装行为取决于包管理器与配置。

SemVer 的 major/minor/patch 表达不兼容变更、兼容功能和兼容修复。`^1.2.3` 通常接受小于 2.0.0 的兼容版本，`~1.2.3` 接受小于 1.3.0 的修复版本，0.x 和预发布版本应按实际范围规则判断。

清单表达范围，锁文件记录具体解析图与完整性信息。CI 使用冻结锁文件安装，让不一致直接失败；锁文件固定版本，不证明包本身可信。

运行 npm script 时，包管理器会将相关 `node_modules/.bin` 加入 PATH，因此脚本能找到项目工具，不必依赖开发机全局安装。可复现构建还要固定 Node 与包管理器版本。

例如 `^0.2.3` 通常限制在 `<0.3.0`，`^0.0.3` 通常限制在 `<0.0.4`；预发布版本另有匹配规则，不能把 1.x 的直觉直接套到 0.x。

## 依赖布局与幽灵依赖

Hoist 可能让包意外读到自己没声明的依赖，换安装布局后便失败。pnpm 通过内容寻址存储和链接复用内容，但实际布局还受版本与配置影响，不能把某种磁盘路径当成程序契约。

依赖冲突先检查 peer 约束与真实消费关系。Overrides 可以临时强制传递版本，但需要兼容验证。安装脚本会执行代码，升级评审也应关注来源、脚本与锁文件变化。见 [pnpm 符号链接布局](https://pnpm.io/symlinked-node-modules-structure)。

## Monorepo 的两张图

包图描述谁依赖谁；任务图描述哪些任务必须先完成。业务包依赖组件库时，组件库构建通常要先于依赖其产物的任务。Affected 从变更映射到包，再沿反向依赖寻找受影响方。

Workspace 负责本地包组织与链接，任务调度器负责拓扑顺序、并行和缓存。缓存输入需包括源码、配置、上游输出和工具环境。直接消费源码反馈快，消费构建入口更接近用户；两者不能互相替代验证。

先有独立职责与公开 API，再决定拆包。Monorepo 改善原子变更和复用，也增加任务调度与发布治理，并不天然要求统一版本。统一版本便于协调，独立版本减少无关发布。参见 [pnpm workspace](https://pnpm.io/workspaces)。

`workspace:` 要求解析为同仓包，避免本地包缺失时悄悄使用注册表同名版本。TypeScript project references 划分类型项目并支持构建模式的增量顺序，但不负责打包或部署。见 [Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)。

远程缓存除了命令和输入，还要区分平台与工具环境；受信发布任务不能无条件复用不可信任务写入的结果，缓存产物本身也不应夹带凭据。Multirepo 的权限与独立发布边界较自然，但跨仓原子变更和版本协调成本更高。

## 库发布验证消费契约

库一般 external 掉宿主框架，并让 JS、声明文件、CSS、`exports` 的子路径保持一致。ESM-only 简单；双格式兼容面广，但同时加载两套实现可能产生双单例，应验证真实组合。

发布前检查 tarball 内容，再在临时消费项目中安装 tarball，验证公开入口、类型解析和资源引用。仅通过 workspace 链接测试，可能掩盖漏发文件或错误入口。`files` 和发布配置决定包内容，不能把 Git 忽略规则当作发布清单。

类型声明应与每个公开 JavaScript 入口对应：`types` 或导出条件提供声明，declaration map 帮助跳回源码；`typesVersions` 可服务特定 TypeScript 版本，但不能假定它会覆盖所有 exports 解析模式。

图片或 WASM 要约定由库内联、导出 URL，还是交给消费方处理。发布验证还应覆盖目标支持的 Node ESM/CJS、浏览器 bundler 和 TypeScript 解析，而非只运行源码测试。

排查供应链异常时核对包名、来源、解析版本、integrity 与 tarball 内容；单看顶层版本号发现不了传递依赖替换。

详细入口规则见 [Node 包](../../node/modules/packages.md)，发布内容见 [npm package.json](https://docs.npmjs.com/cli/configuring-npm/package-json)。
