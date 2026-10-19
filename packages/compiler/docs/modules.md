# 模块图、格式转换与 Tree Shaking

[返回 README](../README.md)

## 静态模块与路径

[modules.ts](../src/modules.ts) 从入口递归解析静态导入，依赖先于引用它的模块检查。导出的 BindingSymbol 持有 Type；导入方绑定为 import symbol 并获得同一签名，因此 `greet(123)` 的跨文件错误仍由 Checker 定位。

路径只允许 `./`、`../`，经 realpath 后必须位于入口目录内。显式 `.ts/.js` 读取对应文件，无后缀固定补 `.ts`，不尝试目录 index、npm、条件 exports 或多后缀回退。不支持环、alias、re-export 或动态模块语法。输出保留相对目录结构，把源码后缀改为 `.js` 或 `.cjs`；同目录同 basename 的 TS/JS 会造成产物碰撞，明确拒绝。

输出目录写入 `package.json` 的 `type: module`，ESM 用 `.js`、CJS 用 `.cjs`，Node 可直接运行。入口目录作为工程边界，所以兄弟源码应放在这个目录下或从共同根目录入口组织。输出目录不能与图中源码目录相同；已有 package.json 若是 ESM 会保留原内容，否则拒绝该目录。已存在的非目标产物不会自动清理；调用输出函数时为两种格式设置不同目录有利于比较。

CJS pass 把具名导入转换成 `var name = require("./dep.cjs")["name"];`，副作用导入转换成 `require(...)`。导出用 `Object.defineProperty` 的 value 属性写入，避免 `__proto__` 名称污染 exports 原型。保留 ESM 与降级语法是两个独立选项。

这里所有导出都来自不可重新赋值的 `const`，所有导入都在执行语句前，没有循环和更新；CJS 快照在这些前提下与示例 ESM 行为一致。它不实现可变 live binding、循环初始化、默认导出互操作、`__esModule`、动态 require 或任意 ESM/CJS 混用规则。

## 固定点裁剪

[shake.ts](../src/shake.ts) 在 ESM 结构仍完整时分析：

1. 所有可达模块的执行语句，以及可能有副作用的初始化声明进入队列；显式要求的入口导出也作为根。
2. 保留语句中每个引用通过 Binder 的节点→符号表找到声明；局部声明进入保留队列，导入引用跨越模块边追踪对应导出。
3. 遍历新增保留语句，直到队列耗尽。函数体里的引用只有函数值被保留时才传播，体现延迟求值。
4. 删除未使用且确认纯的声明。未使用的 import binding 可移除，导入边仍保留为副作用 import，保证求值顺序。

TS 已检查的原始值、引用、箭头创建与两侧纯的 `+` 视为纯；函数调用和成员读取保守视为可能有副作用。JS 模式的 `+` 也保守保留，因为无静态原始类型证明。纯度结论依赖语言子集：未来加入 getter、对象、赋值、异常或可变 live binding 后必须重新审查。

```bash
pnpm --dir internals/play-compiler modules
cat internals/play-compiler/dist/output/shake-report.json
pnpm --dir internals/play-compiler modules:cjs
```

示例中 `greet` 被入口调用，闭包引用使 `greeting` 保留；`unused = 42` 删除；`noisy = console.log(...)` 整条保留；`effect.ts` 的执行语句保留。实际顺序是 `library effect`、`effect module`、`Hello, world`。每个声明和模块有英文 keep/drop 原因，方便与输出对应。

所有静态依赖模块都保留求值壳，即使最后变空；本项目不优化模块文件数量。这是保守且可观察的策略，可达模块均已被 DFS 发现；没有从目录里把无关文件加入图。通过 `shake(graph, ["greet"])` 显式保留入口 API，否则默认入口导出并非自动保留根。

## 与工程优化的关系

ESM 的静态具名边可在执行前建立名称对应关系，更利于引用可达性分析。CJS 的运行时 require、条件加载与动态 exports 常使依赖/导出不可预先确定；可静态识别的 CJS 模式仍可分析，所以不是“CJS 完全不能优化”。ESM 也不保证未使用声明可删除：初始化副作用、未知调用与可观察求值顺序仍是关键。

| 概念           | 处理对象                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| Tree Shaking   | 模块/导出/声明的使用可达性与副作用                                           |
| 局部死代码删除 | 某个函数/控制流内不可执行或无用的代码；本项目无 CFG，未实现                  |
| 压缩           | 缩短表示、名称及其他保持行为的优化；本项目保留可读排版                       |
| 代码分割       | 根据入口/加载边界把代码组织成不同 chunk；本项目输出文件集合，没有 chunk 规划 |

真实 Rollup 在 Vite 生产打包内部继续分析模块和表达式；我们的 `shake(graph)` 先在教学模块图里发生，两者不是同一次优化。真实模块分析还需追踪属性、调用副作用、重新赋值、外部模块与用户配置，见[固定源码索引](references.md)。
