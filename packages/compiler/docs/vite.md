# 固定 Vite 7.3.1 的真实集成

[返回 README](../README.md) · [插件源码](../../../internals/play-compiler/src/vite-plugin.ts)

## 原始输入确实经过手写链路

插件 `enforce: "pre"`，仅处理 `vite/` 下且不在 `node_modules` 的 `.mini.ts`；query 不影响后缀识别。配置额外将 `.mini.ts` 从内置 esbuild transform 排除。该扩展名仍以 `.ts` 结束，但插件先接收原始标注，调用手写 scanner/parser/binder/checker/transform/printer，返回 `{ code, map }`，其中 map 序列化为标准 JSON 字符串供 Vite 接收。

测试记录原始 input 包含 `: string`，插件产物包含 `export var greet = function`，map 带原始 sourcesContent；dev/build 最终映射仍回到 TS 函数体。插件拒绝无效类型输入，普通 `.ts/.js` 与第三方依赖不会被它拦截。配置载入本身由 Vite 工具处理，和编译示例源码是两件事。

本教学插件选择 transform 内预检查，适合自包含的小模块。具名跨文件导入要用compiler 的 `loadGraph` API 预检查；插件没有伪装成全项目 Checker。生产工具通常把完整类型检查作为独立命令/进程，因为每文件按需转译与跨文件类型分析的职责和成本不同；固定版本的说明见 [Vite 7.3.1 features](https://github.com/vitejs/vite/blob/95e8923f35d0252c9f6eb2d5e358c084542706f1/docs/guide/features.md)。

## 开发与生产

| 模式 | 固定版本中的链路 | 本项目观察 |
| --- | --- | --- |
| dev | 原生 ESM 按请求加载、插件容器 transform；依赖预构建采用 esbuild | HTTP 请求 `.mini.ts` 时终端打印 hook 日志，浏览器执行转换后的模块 |
| build | 插件 transform 后进入 Rollup 模块分析/打包；还有目标转换和可选压缩 | 生成带 map 的 bundle，手写编译器输出已被真正使用 |

这里描述 **7.3.1**，不套用其他 Vite 主版本的构建器。依赖预构建与生产 CJS 处理的区别以该版本的 [dep-pre-bundling.md](https://github.com/vitejs/vite/blob/95e8923f35d0252c9f6eb2d5e358c084542706f1/docs/guide/dep-pre-bundling.md) 为准。示例不含第三方运行时依赖，不自行实现 HMR、预构建或代码分割。

Compiler 决定如何理解受限源码、诊断与变换；Bundler 负责解析实际资源依赖、加载、组织 chunk 与构建优化。插件必须返回 ESM，让 Bundler 保留静态模块信息。compiler 的 `legacy` 输出仅保证子集语法降级；Vite 最终 bundle 还含普通 JS 入口及自身运行时代码，不承诺整体 ES5。

## 多阶段映射

手写输出→原 TS 是第一张 map；Vite 的后续变换与 Rollup 输出→上一阶段是后续 map。组合时沿这些坐标关系回溯到最初的 TS。单纯返回原 AST 的行号，或在每一步丢弃上一张 map，都无法给最终 bundle 提供正确位置。[7.3.1 插件容器](https://github.com/vitejs/vite/blob/95e8923f35d0252c9f6eb2d5e358c084542706f1/packages/vite/src/node/server/pluginContainer.ts#L524)实际维护 sourcemapChain 并组合；测试同时查询 dev 最终 transform 和生产 chunk 的函数体位置。

## 操作、预期与实测

```bash
pnpm play:compiler
pnpm test:vite
pnpm play:compiler:build
```

打开 <http://127.0.0.1:5178>，观察页面 `Hello, world`、浏览器 Console 的 `mini compiler module` 和 `Hello, world`，以及终端 hook 日志。DevTools Sources 应能显示 `greeting.mini.ts` 原文；选函数体设置断点可手动核对映射，是否自动展示取决于 DevTools 配置。

自动集成测试启动真实 dev server，请求 HTTP，读取生产 build 结果并查询 map；浏览器实测另见[验证记录](validation.md)。自动测试不把 HTTP 200 当成执行证据；浏览器执行、类型检查、映射查询分别记录。停止服务用 `Ctrl+C`。
