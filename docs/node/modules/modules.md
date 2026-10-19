# CommonJS 与 ESM：身份和状态

[本组导航](./README.md) · [实验走查](./index.md)

CJS包装函数提供require、module、exports、__filename等。exports初始是module.exports的引用，重赋exports不会替换最终导出。第一次成功加载后通常按解析文件身份缓存；循环依赖可拿到未初始化完整的导出，因此应避免在初始化阶段互相读取完成状态。

ESM有静态依赖结构与live binding，加载/链接/求值分阶段。模块namespace只读不代表导出的状态永不变化；本例通过导出函数更新绑定。ESM身份基于解析URL，query/fragment不同可能重复实例；不能为“刷新缓存”随意加随机查询造成长期泄漏。

.mjs明确ESM，.cjs明确CJS，.js看包type等解析规则。ESM相对导入使用显式扩展名；模块位置用import.meta.url，不用cwd替代。动态import返回Promise，两种格式都可用。

在本项目最低Node22.18，require(ESM)可载入满足约束的同步图，不是“CJS永远不能加载ESM”；含TLA的图必须异步import。CJS的named export互操作常依赖静态分析，动态改module.exports不保证映射为可靠ESM named binding；库要分别验证消费方式。

## 用两次导入看“身份”

第一次加载时，Node 先解析到具体模块，再求值并保存该身份对应的结果。再次用同一身份加载，通常复用它：CJS 观察到同一导出对象；ESM 观察到同一模块实例，导出函数修改的 `count` 可通过 live binding 读到。两种格式都能复用，但导出机制不同。

接着看能否同步完成求值。CJS 的 `require()` 需要同步拿到结果；若整个 ESM 依赖图含顶层 `await`，它不能在这条同步路径中完成。此时改用异步 `import()`，而不是把“CJS 与 ESM 完全不能互通”当成规则。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
const require = createRequire(import.meta.url)
const first = require("./fixtures/state.cjs")
const second = require("./fixtures/state.cjs")
first.count++
const esm = await import("./fixtures/state.mjs")
esm.increment()
```

CJS对象同一性与ESM live binding是两个不同问题。实验同时断言再次import的namespace相同、count更新；require同步ESM和拒绝TLA仅适用于文档固定版本，不外推老Node。

## 依据与版本

以 [Node 22.18 官方 modules 文档](https://nodejs.org/download/release/v22.18.0/docs/api/modules.html) 核对 API 合约；实际输出与运行环境需在执行时核对。
