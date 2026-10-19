# 验证记录与已知限制

[返回 README](../README.md) · [迁移清单](infra-migration.md)

初次 monorepo 迁移于 2026-10-14 在 macOS、Node **22.23.2** 上验证。2026-10-15 调整测试布局、移除命令行包后，在 Node **26.5.1** 上重新验证测试、类型检查、构建入口和锁文件。迁移开始时 pnpm 为 **11.18.0**；根清单的当前 devEngines 声明为 `^11.18.0`，当前 frozen install 与脚本使用 **11.28.5**。所有命令从仓库根目录运行。浏览器与 Auth 记录来自初次迁移；结果属于实际观察，不扩大受限语言范围。

## 当前测试与构建入口

2026-10-19 在 Node 22.23.2、pnpm 11.28.5 上迁移至 Vitest 4.1.12 和 Vite 7.3.1。测试继续放在各 workspace 的 `__test__/`；`internals/test` 仅提供 fixture helpers。

- `pnpm test`：compiler / playground 的 48 项和 10 个 Next.js demo 的 21 项，共 69 项通过。
- `node docs/node/testing/index.ts`：原生 `node:test` 教学实验单独运行，3 项通过，不纳入 Vitest projects。
- `pnpm --dir packages/compiler test:built`：Vite 构建 ESM，tsc 仅生成声明；真实 Node 子进程验证默认入口和子路径导出通过。
- cache 与 security 的 `test:ui`：2 项生产 HTML / 样式检查通过，不覆盖真实浏览器交互。
- security 的 `test:http`：启动应用与提供方后，5 项协议集成测试通过；测试后关闭两个进程。
- `pnpm typecheck`、`pnpm lint` 及本次修改文件的 Prettier 检查通过。
- `pnpm test:watch`：监听包括所有 demo 在内的 Vitest projects；demo 也可在自身目录运行 `pnpm exec vitest`。

以下表格保留此前迁移时的验证结果，命令已按当前子包入口标注；测试数量属于历史观察，新增 coding 子包的测试以当前执行输出为准。

## monorepo 迁移后的验证

| 命令 | 实际结果 |
| --- | --- |
| `pnpm import` | 从原根 npm lock 导入，保留根工具版本，再合并 workspace 依赖 |
| `pnpm install --frozen-lockfile` | 5 个 workspace 安装通过，统一根 lockfile；esbuild/sharp 构建许可由根配置声明 |
| `pnpm typecheck` | 根源码以及 compiler/test/playground 各自配置全部通过 |
| `pnpm --dir packages/compiler build` | 编译器主体构建成功，生成 `packages/compiler/dist` |
| `pnpm test` | **48 项全部通过**：保留 47 项语义测试，新增单文件产物与映射路径验证 |
| `pnpm --dir internals/play-compiler test` | 单文件输出、输出目录/manifest 策略与 Vite 集成共 6 项通过 |
| `pnpm --dir packages/compiler test:built` | 先 build，再用无 development 条件的真实 Node 导入默认 dist 入口，验证通过 |
| `pnpm --dir internals/play-compiler check`、`pnpm --dir internals/play-compiler inspect` | 手写 Checker 和阶段 JSON 输出正常；未使用开发 tsc 替代手写链路 |
| `pnpm --dir internals/play-compiler hello`、`pnpm --dir internals/play-compiler hello:js` | 都实际执行生成 JS，输出 `Hello, world` |
| `pnpm --dir internals/play-compiler modules`、`pnpm --dir internals/play-compiler modules:cjs` | 两种产物都执行，纯 unused 删除，副作用与顺序保留 |
| `pnpm --dir packages/compiler test maps` | 3 项通过，JS/声明映射回原源码；合成代码无来源 |
| `pnpm --dir internals/play-compiler dev` | 开发服务在 `127.0.0.1:5178` 启动，原 `.mini.ts` 经 workspace compiler 转换 |
| `pnpm --dir internals/play-compiler build` | 真实 Vite 7.3.1 生产构建通过，生成带 map 的 bundle |
| `pnpm --dir internals/play-compiler preview` | 构建产物在 `127.0.0.1:5179` 预览，真实 Chrome 页面执行通过 |
| `pnpm --dir docs/security/demo typecheck` | 现有 Auth demo 迁移依赖管理后，自身类型检查通过 |
| `pnpm exec eslint packages/compiler/src internals` | 局部源码检查通过；根 ESM 字段补回后无模块类型警告 |
| `pnpm exec prettier --check <本次修改的支持文件>` | 本次迁移涉及的包、内部目录、根配置、共享指导与 Auth 运行说明格式通过；不格式化无关文件 |
| 本地 Markdown 链接检查 | compiler 与 internals 中的相对链接全部存在 |

诊断现在通过 `pnpm --dir internals/play-compiler errors` 的固定实验观察；脚本直接调用 `analyze`，展示缺少分号与组合类型/名称错误。源码测试由 Vitest 的 `resolve.conditions` 选择 `development`，默认 dist 导出单独验证。

## 按包归属的测试布局

测试现在位于各包的 `__test__/`；`internals/test` 只提供临时文件和子进程 helpers，不依赖 compiler 或 playground。

| 归属与入口 | 当前实测 |
| --- | --- |
| `packages/compiler/__test__/`；`pnpm --dir packages/compiler test` | 核心、映射和模块分析共 42 项通过；fixtures 由本包维护 |
| `internals/play-compiler/__test__/`；`pnpm --dir internals/play-compiler test` | 文件输出与真实 Vite 集成共 6 项通过；`pnpm --dir internals/play-compiler test vite` 单独选择 3 项 Vite 测试 |
| `pnpm --dir packages/compiler test maps` | 按包选择 maps 文件，3 项通过 |
| `pnpm test` | Vitest 通过 projects 统一运行 compiler、playground 和各 demo 的单元测试；生产 HTML 与 HTTP 集成测试单独运行 |
| `pnpm --dir packages/compiler test:built` | 构建后运行 compiler 自己的 `__test__/built.test.ts`，默认 dist 入口通过；测试与 fixtures 不进入 dist |

各包可直接运行 `pnpm --filter @soppy-index/<包名> test`；compiler 可追加 `maps` 或 `modules`。文件过滤、watch 等参数由 Vitest 处理；无匹配的测试选择会失败。包的类型检查包含测试，声明产物的构建仅包含 `src`。

安装期间 npm registry 出现短暂 ECONNRESET；pnpm 的自动重试与锁文件策略验证最终通过。没有因此关闭策略检查。当前 lockfile 还记录了 devEngines 所选择的包管理器，这是同一根锁文件中的工具管理信息。

## 语义证据

核心断言包括：CRLF 与 UTF-16 范围、分号和非法语法位置、同名不同作用域的符号身份、闭包引用、初始化/调用/返回类型错误、前向引用与递归拒绝、原 AST 不被 pass 改写。

模块测试在临时目录生成并用真实 Node 执行 ESM/CJS，比较裁剪前后 stdout，并验证多跳导入/闭包引用传播、缺模块/缺导出/环/类型错误、输出重名、特殊 CJS 导出名称、语义失败前不落盘、manifest 保留与源码目录隔离。execa 保留生成程序的 stdout 末尾换行，timeout/maxBuffer 与原验证约束保持一致。

通用参数解析与对应 5 项测试已删除。固定实验直接调用 compiler API，`run.ts` 使用函数返回的真实产物路径执行 Node；单文件输出只打印一次，调整 map 的源码路径元数据时保留原映射片段。

## 先前的浏览器实测

此前 monorepo 迁移后使用仓库外已有的 Playwright Core 与本机 **Google Chrome 155.0.8059.79** 访问实际开发服务，并另行访问生产预览：

- 开发与生产预览页面 `#result` 都实际显示 `Hello, world`。
- Console 包含 `mini compiler module` 和 `Hello, world`。
- `pageerror` 数组为空，没有失败资源日志。
- 终端记录迁移后路径 `internals/play-compiler/vite/greeting.mini.ts` 的手写 hook。

测试还查询真实 dev transform 与生产 chunk 的组合 map，确认函数体仍回到原 TS 第 2 行第 47 列（查询 API 行从 1 起、列从 0 起）。浏览器自动化依赖未加入 monorepo。DevTools 中手动点击断点/声明跳转没有自动化验证。

## 当前边界

P0–P7 的语义链路保持可运行。未完成的完整工具能力仍明确排除：

- 没有完整 TS/JS、上下文类型、结构化对象、控制流收窄、泛型或错误恢复；JS 参数不做调用点推断。
- 拒绝前向引用、递归、循环依赖、默认导出、alias/re-export、动态模块和 npm 解析；CJS 只覆盖不可变 const、无环示例，无可变 live binding。
- Tree Shaking 保守保留未知调用与空模块求值壳，输出文件集合，不生成单文件 bundle。
- 声明只打印基本类型和直接导出的简单箭头；复杂返回类型、函数别名、声明合并/bundling 明确拒绝。声明仍表示原公开 API，不是裁剪后的发布集合。
- Vite 插件只预检查自包含 `.mini.ts`；跨文件手写检查用 `loadGraph` API，最终 bundle 不承诺整体 ES5。
- 没有实现未来的 bundler、React 或 JSX 包，Vitest 支持 watch；尚未配置覆盖率 provider、跨平台 CI、性能基准或包发布流程。
- Auth demo 此次只验证迁移安装与类型检查，没有重复其完整浏览器登录/生产部署测试。
