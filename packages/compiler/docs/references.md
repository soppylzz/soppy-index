# 真实源码参考索引

以下索引在 2026-10-14 对照相应 tag 的 checkout 整理，链接固定到 commit，避免随默认分支移动。先在本项目解释一个阶段，再沿对应入口查看真实实现；表中行号属于该快照，不表示最新版本位置。源码可自行克隆到任意目录，不依赖作者机器路径。

| 仓库 URL | 固定 tag | checkout commit | 建议 checkout 目录名 |
| --- | --- | --- | --- |
| https://github.com/microsoft/TypeScript | v6.0.3 | `050880ce59e30b356b686bd3144efe24f875ebc8` | `typescript-v6.0.3` |
| https://github.com/babel/babel | v7.28.5 | `61647ae2397c82c3c71f077b5ab109106a5cac0f` | `babel-v7.28.5` |
| https://github.com/vitejs/vite | v7.3.1 | `95e8923f35d0252c9f6eb2d5e358c084542706f1` | `vite-v7.3.1` |
| https://github.com/rollup/rollup | v4.64.5 | `05a293809848a3d772e7ff2ba44adcbd23bd84b8` | `rollup-v4.64.5` |

Babel/Vite tag 是 annotated tag，`ls-remote` 的 tag object SHA 与 checkout commit 不同；上表记录实际 commit。TypeScript 参考的是 6.x 的 TS 源码，未用默认分支或 Go 实现代替。Vite 直接版本固定为 7.3.1；其 Rollup 传递依赖由本项目 lockfile 固定为 4.64.5，因此额外对照这个确切版本。

## TypeScript 的阶段入口

| 阶段与本 demo 目的 | 已验证文件与关键符号 | 简化及真实工程复杂度 |
| --- | --- | --- |
| Scanner：观察 raw token、值和位置 | [src/compiler/scanner.ts / createScanner](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/scanner.ts#L1022) | demo 只扫描有限字面量；真实扫描器还有 Unicode、模板、正则重扫和上下文 |
| Parser：表达优先级与注解归属 | [parser.ts / createSourceFile](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/parser.ts#L1344) | demo 首错停止；真实解析器处理完整语法、恢复、节点标记与增量解析 |
| Binder：声明与引用分离 | [binder.ts / bindSourceFile、createBinder](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/binder.ts#L502) | demo 用显式顺序激活拒绝未来引用；真实 binder 还处理声明合并、控制流与多类符号空间；TDZ 等诊断职责不能机械一一对应 |
| Checker：验证基本类型与签名 | [checker.ts / createTypeChecker](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/checker.ts#L1486) | demo 精确 primitive/函数比较；真实实现有上下文类型、结构化关系、推断、缓存、泛型和收窄 |
| 类型擦除：与检查分离 | [transformers/ts.ts / transformTypeScript](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/transformers/ts.ts#L235) | demo 只去标注；真实转换还有枚举、namespace、装饰器及其他运行时生成 |
| 语法降级：保留子集行为 | [transformers/es2015.ts / transformES2015](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/transformers/es2015.ts#L488) | demo 禁止 this/arguments/块/循环；真实工程需捕获词法环境、处理逐次绑定和 helper |
| 模块转换：独立于语法目标 | [transformers/module/module.ts / transformModule、transformCommonJSModule](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/transformers/module/module.ts#L174) | demo 仅 const 快照与无环依赖；真实转换需 live binding、互操作和多格式 |
| Emitter：树到稳定 JS | [emitter.ts / createPrinter](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/emitter.ts#L1211) | demo 保守加括号、不保留 trivia；真实 printer 还需语法上下文、注释与 emit flags |
| Source Map：记录两端坐标 | [sourcemap.ts / createSourceMapGenerator](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/sourcemap.ts#L36) | demo 在 write 时记 segment；真实实现还需 bundle、多文件、嵌套范围和映射策略 |
| Declaration Emit：从符号与类型出发 | [transformers/declarations.ts / transformDeclarations](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/transformers/declarations.ts#L259) | demo primitive 与直接箭头；真实实现要处理名称可见性、复杂类型、合并和声明诊断 |

## Babel 的可组合树处理

| 已验证文件与符号 | 对应观察 |
| --- | --- |
| [babel-parser/src/index.ts / parse](https://github.com/babel/babel/blob/61647ae2397c82c3c71f077b5ab109106a5cac0f/packages/babel-parser/src/index.ts#L43) | parser 产生 AST，不意味着已经转换或完成 TS 类型检查 |
| [babel-traverse/src/index.ts / traverse](https://github.com/babel/babel/blob/61647ae2397c82c3c71f077b5ab109106a5cac0f/packages/babel-traverse/src/index.ts#L95) | visitor 作为插件扩展接口；demo 没有 NodePath 的替换、作用域维护与重访队列 |
| [babel-plugin-transform-arrow-functions/src/index.ts / ArrowFunctionExpression visitor](https://github.com/babel/babel/blob/61647ae2397c82c3c71f077b5ab109106a5cac0f/packages/babel-plugin-transform-arrow-functions/src/index.ts#L15) | 真正转换调用 arrowFunctionToExpression 并考虑 noNewArrows 等语义假设，不能只替换关键字 |
| [babel-generator/src/printer.ts / Printer](https://github.com/babel/babel/blob/61647ae2397c82c3c71f077b5ab109106a5cac0f/packages/babel-generator/src/printer.ts#L123) | generator 与 parser 分层；稳定合法输出需要语法上下文 |
| [babel-generator/src/source-map.ts / SourceMap、mark](https://github.com/babel/babel/blob/61647ae2397c82c3c71f077b5ab109106a5cac0f/packages/babel-generator/src/source-map.ts#L27) | 同样借助 gen-mapping/trace-mapping；位置采集仍由 generator 自己完成 |

## Vite 与 Rollup 的模块优化

| 已验证文件与符号 | 本 demo 的简化 |
| --- | --- |
| [Vite server/pluginContainer.ts / transform](https://github.com/vitejs/vite/blob/95e8923f35d0252c9f6eb2d5e358c084542706f1/packages/vite/src/node/server/pluginContainer.ts#L524) | demo 只提供一个 pre hook；真实容器安排多插件并采集/组合映射 |
| [Vite plugins/esbuild.ts / esbuildPlugin](https://github.com/vitejs/vite/blob/95e8923f35d0252c9f6eb2d5e358c084542706f1/packages/vite/src/node/plugins/esbuild.ts#L242) | 集成配置排除 .mini.ts，避免把内置转译误当作手写编译 |
| [Vite build.ts / buildEnvironment](https://github.com/vitejs/vite/blob/95e8923f35d0252c9f6eb2d5e358c084542706f1/packages/vite/src/node/build.ts#L713) | 真实生产构建调用 Rollup，并处理 chunk/资源/目标；demo 不实现这些服务 |
| [Rollup Graph.ts / includeStatements](https://github.com/rollup/rollup/blob/05a293809848a3d772e7ff2ba44adcbd23bd84b8/src/Graph.ts#L171) | demo 用显式 worklist 固定点；真实工程结合执行模块和实体引用反复求解 |
| [Rollup Module.ts / hasEffects、include、includeAllExports](https://github.com/rollup/rollup/blob/05a293809848a3d772e7ff2ba44adcbd23bd84b8/src/Module.ts#L763) | demo 保留求值边/空模块壳；真实实现还考虑入口签名、外部模块与导出策略 |
| [Rollup VariableDeclarator.ts / hasEffects、include](https://github.com/rollup/rollup/blob/05a293809848a3d772e7ff2ba44adcbd23bd84b8/src/ast/nodes/VariableDeclarator.ts#L47) | demo 对未知调用保守保留；真实工程追踪表达式、路径和更丰富的副作用 |

SWC 只使用[官方配置文档](https://swc.rs/docs/configuration/compilation)和 [Compiler API 文档](https://rustdoc.swc.rs/swc/struct.Compiler.html)作必要对照，没有克隆完整 Rust 仓库。性能没有在此项目做基准，不给出未经验证的速度倍率。不要把 demo 的规则数量当成真实 compiler 的覆盖率。
