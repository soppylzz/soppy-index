# 基础设施迁移清单

目标是把注意力留给编译机制，同时通过真实调用理解常见工具包。迁移只覆盖机械的文件、进程与测试发现工作，没有把核心算法交给第三方 compiler。主体与 playground 分开；测试归属各子包的 `__test__/`。

## 已迁移和保留的部分

| 部分 | 原实现 | 现在使用 | 位置 / 可观察效果 | 本地仍负责什么 |
| --- | --- | --- | --- | --- |
| 产物文件输出 | mkdir + writeFile、JSON.parse | [fs-extra 11.4.1](https://github.com/jprichardson/node-fs-extra) | [output.ts](../../../internals/play-compiler/src/output.ts)：readJson/outputFile，自动创建父目录 | 输出目录边界、manifest 保留、先完整生成再落盘；不替代模块解析 |
| 子进程执行 | execFile + promisify、shell `&&` | [execa 10.1.1](https://github.com/sindresorhus/execa) | [测试 helpers](../../../internals/test/src/helpers.ts)、[实验 runner](../../../internals/play-compiler/src/run.ts) | argv、cwd、timeout/maxBuffer、退出码断言；生成代码 stdout 保留末尾换行 |
| 测试发现与执行 | 自定义 Node runner | [Vitest 4.1.12](https://vitest.dev/guide/) | [根配置](../../../vitest.config.ts) 与各 workspace 的 `vitest.config.ts` | 按包或文件选择测试；默认单元测试与需启动服务的集成测试分开 |
| 包安装与连接 | 根 npm + 编译器独立 pnpm | [pnpm workspace](https://pnpm.io/workspaces)、[catalog](https://pnpm.io/catalogs) | 根 workspace + 单一 lockfile，包依赖 `workspace:*`，第三方版本 `catalog:` | 依赖方向、脚本职责、哪些目录属于 workspace；不实现运行时模块加载 |
| Source Map 编码与查询 | 已使用标准库 | 保留 @jridgewell/gen-mapping 0.3.13 / trace-mapping 0.3.31 | emitter 采集坐标，库编码/序列化与查询 | 原节点范围、转换 origin、生成位置、合成代码无映射策略 |
| 真正的 bundler 集成 | Vite 7.3.1 的本地示例 | 保留固定 Vite，移到 playground | [Vite 插件](../../../internals/play-compiler/src/vite-plugin.ts)：调用 compiler workspace 返回 ESM/map | 示例过滤、手写预检查、原始 TS 输入和组合映射的验证 |
| 测试 engine 与断言 | node:test + node:assert | Vitest + node:assert/strict | [compiler 测试](../__test__/) | 保留语言、模块、映射、文件输出和 Vite 语义测试；移除命令参数解析测试 |
| 路径与输入读取 | node:path、readFile、realpath | 保留原生 | compiler 模块图和实验脚本 | 后缀规则、目录边界、循环诊断属于本 demo 的显式契约；不引入一般 npm resolver |
| 包构建 | tsc 生成 JS 和声明 | [Vite 7.3.1 library mode](https://v7.vite.dev/guide/build#library-mode) + tsc 声明生成 | [Vite 配置](../vite.config.ts)、`pnpm --dir packages/compiler build` / `pnpm typecheck` | 保留 ESM 模块和子路径导出，依赖保持外置；实验源码仍由手写 compiler 编译 |

`execa` 收到命令与参数数组，默认不经过 shell；不会把源码文件名拼到 shell 字符串里。测试文件发现只匹配文件名，不参与 import/export 关系分析。这些边界有助于辨别工具职责。

Husky、commitlint、lint-staged 和 Changesets 负责提交与版本管理；Vitest 负责测试运行，Vite 负责包的 JavaScript 构建。它们不参与手写编译器的语义实现。

## 没有迁移的核心

Scanner、Parser、AST、visitor、Binder、Checker、类型擦除、箭头/const 降级、ESM→CJS、JS printer、映射点采集、声明输出、模块图、符号可达性与副作用决策全部保持手写。尤其不使用 Babel/SWC/Acorn/TypeScript Compiler API 或 MagicString 替代这些环节。

把 `writeGraph` 拆成两步：主体的 `emitGraph` 返回 artifacts、JS 文件列表与实际入口 `entryOutput`；playground 的 `writeGraph` 执行输出目录策略和磁盘写入。因此 compiler 不依赖 playground，未来 bundler 可直接消费语义生成结果。`loadGraph` 仍保留文件输入和明确的相对后缀解析，读取文件不等于把模块解析交给通用 resolver。

## 目录迁移

| 原路径 | 新路径 |
| --- | --- |
| `handwrite/compiler/src/` 的语言与模块主体 | `packages/compiler/src/` |
| 通用命令行入口 | 已移除；实验脚本直接使用 compiler API |
| 产物写入与模块落盘 | `internals/play-compiler/src/output.ts`、`writer.ts` |
| `tests/` | 各子包的 `__test__/`，共用 helpers 在 `internals/test/src/`，运行配置位于各 workspace |
| `examples/`、`fixtures/`、`vite/`、`src/vite-plugin.ts` | `internals/play-compiler/` |
| `README.md`、`index.md`、`docs/` | `packages/compiler/` |
| 根 `package-lock.json`、局部 compiler lock/workspace | 根 `pnpm-lock.yaml`、`pnpm-workspace.yaml` |
| Auth demo 的 npm lock | 同一根 pnpm lock；源码仍在原目录 |

根 npm lock 先通过 `pnpm import` 迁移，再合并各 workspace 安装并验证；根工具保留原锁定版本，不顺带升级工具链。包本身的私有学习版本没有发布流程。目录迁移不处理已存在的算法/type-challenges 迁移，也不改动 `compiler-legacy/`。

所有 `node_modules`、实现 `dist` 与实验产物都属于可重建内容，没有放进版本管理。安装入口现在是根 `pnpm install --frozen-lockfile`，不再在各包维护独立锁文件。

## 扩展与验证

构建在对应子包执行：compiler 构建自身产物，内部 playground 构建真实 bundle；根目录不再提供项目专用的构建别名。源码开发导出条件与默认 dist 导出分别验证。新增包统一使用 Vitest 测试和 Vite 构建；测试保留在包内的 `__test__/`，新增浏览器学习主题时再按实际环境配置测试。

```bash
pnpm typecheck
pnpm test
pnpm --dir internals/play-compiler test
pnpm --dir packages/compiler test:built
pnpm --dir internals/play-compiler hello
pnpm --dir internals/play-compiler modules:cjs
pnpm --dir internals/play-compiler build
```

单文件产物执行、JS/声明 map 的相对路径、输出目录保护和 manifest 保留都有验证；副作用顺序与 map 查询继续执行。独立命令行包及其参数解析依赖已移除，实验使用源码中的显式选项。完整结果见[验证记录](validation.md)。
