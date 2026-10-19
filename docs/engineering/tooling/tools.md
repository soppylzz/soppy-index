# Vite 与 Webpack：先比较工作方式

开发服务器冷启动慢与生产产物过大是两个问题。前者关乎何时处理模块，后者关乎最终怎样组织与优化输出，不能用一个速度结论代替工具比较。

## Vite 的开发路径与 HMR

Vite 的常见开发模式基于原生 ESM 按需提供源码：浏览器请求模块，服务器解析并转换，再把裸包名改成可请求 URL。依赖预构建帮助处理 CommonJS 兼容和大量细碎依赖。

模块图记录依赖者与热更新接受边界。文件变化后失效相关节点，更新沿引用关系寻找可接受边界；无法安全接受时回退到整页刷新。框架的 Fast Refresh 等机制还要维护组件边界和状态，并非通用 HMR 自带能力。

版本会改变底层分工：Vite 8 使用 Rolldown 和基于 Oxc 的工具替代此前的 Rollup/esbuild 组合。讨论历史版本时应说清范围，见 [Vite 8 迁移说明](https://vite.dev/guide/migration.html)。

## 插件怎样介入

`resolveId` 决定模块身份，`load` 提供源码，`transform` 改写内容。例如虚拟模块不必有磁盘文件，可以由插件解析特定 ID 后返回代码。

Vite 的开发服务器 hook 与最终产物 hook 作用阶段不同。`generateBundle` 面向构建结果，不应期待开发请求触发它；`apply` 可限定 serve/build，`enforce` 调整部分顺序。修改源码位置应返回 map，读取额外文件应声明 watch 与缓存输入。

`import.meta.env` 的暴露规则用于控制哪些值进入客户端；前缀是筛选机制，进入产物的值都能被读取。Mode 决定环境文件选择，不应直接等同于 `NODE_ENV`。见 [Vite 插件 API](https://vite.dev/guide/api-plugin)、[环境变量](https://vite.dev/guide/env-and-mode)。

对于 Vite 插件，`config/configResolved` 处理配置阶段，`configureServer` 参与开发服务器；`buildStart` 准备构建，`generateBundle` 检查内存产物，`writeBundle` 在写盘后执行。虚拟模块通常使用公开 ID 与带 `\0` 的内部 ID 区分，避免被普通路径解析接管。

热更新处理还要声明额外文件影响了哪些模块；无法保留正确状态时应明确刷新。插件验证至少覆盖 dev、build 和 preview，Rollup 风格 hook 的兼容不表示这些阶段完全同构。

## Webpack 的模块与生命周期

Webpack 由 entry 构建依赖图。Loader 转换资源，正常阶段通常从右向左执行；pitch 从左向右，且可短路。Plugin 通过生命周期 hook 介入构建和产物处理。

Compiler 负责编译器级生命周期，Compilation 表达本轮模块和产物；watch 会产生多轮 Compilation。异步 runtime 加载 chunk，SplitChunks 可抽取共享模块，HMR runtime 配合 accept/dispose 决定替换或刷新。

因此“Vite 不打包、Webpack 只全量刷新”都过于绝对。比较时要区分开发、生产和增量过程。见 [Webpack 概念](https://webpack.js.org/concepts/)。

Webpack 的 output 定义产物位置与加载路径，mode 提供开发或生产优化默认值；两者都不是 Loader 的职责。`runtimeChunk` 可分离经常随映射变化的运行时代码，降低无关业务 chunk 的缓存联动，但实际效果仍受 ID 和分块策略影响。见 [Webpack 缓存指南](https://webpack.js.org/guides/caching/)。

Webpack HMR 会获取更新清单与 hot-update 内容，再由接受/清理逻辑应用变化。持久缓存异常时可先清缓存验证假设，但长期修复应补齐配置、loader/plugin、依赖快照与环境等失效输入。

## 底层工具怎样选

Rollup、Rolldown、esbuild 都提供打包能力；Babel、SWC、Oxc 等提供不同的解析、转换或压缩能力，范围随版本变化。原生实现可能更快，不能据此推断转换语义、插件和 map 完全一致。

工具选择先看应用或库需求，再看框架集成、插件、诊断、目标环境和迁移成本。开发正常但生产失败时，分别检查条件入口、插件生命周期、环境替换及分块结果。
