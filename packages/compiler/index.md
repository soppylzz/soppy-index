# 实验教程：同一段代码经过了什么

[返回 README](README.md) · [语言边界](docs/language.md) · [实现计划](docs/plan.md)

先预测中间结果，再执行。下面的输出结论来自本次验证，具体坐标约定、拒绝条件和版本见对应专题。

## P0：区分两套编译工具

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm --dir packages/compiler build
pnpm --dir internals/play-compiler check
```

前三个命令安装并检查/构建项目本身；`check.ts` 直接调用 compiler 的 `analyze`检查 `internals/play-compiler/examples/hello.ts`。Vite 负责构建包的 JavaScript，tsc 负责类型检查和声明；两者不能替代手写 Checker 的这个检查，`build` 也不会帮我们编译示例源码。以下命令从仓库根目录运行。Node 实验自然退出，无端口；playground 入口直接在终端输出编译信息与生成代码的执行结果，主体只提供编译 API。

## P1：从文本到 Token 和 AST

核心源码：

```ts
const greeting: string = "Hello, ";
const greet = (name: string): string => greeting + name;
console.log(greet("world"));
```

```bash
pnpm --dir internals/play-compiler inspect > /tmp/compiler-inspection.json
pnpm --dir internals/play-compiler errors
```

打开 inspection 中的 tokens：`greeting` 是 identifier，`string` 是 keyword，字符串同时有原始 text 与解码后的 value。注释/空白不产生 token，但推进源码位置。AST 中第一条 Variable 的 annotation 为 string，第二条变量没有变量标注，init 的 Arrow 包含参数标注和返回标注。Binary 持有两个引用；Call 表示内外两层调用。

缺少分号的 fixture 在下一条 `console` 开始的位置报告 `P001`。scanner 负责切分，不证明 parser 接受该 Token 序列；例如有括号不代表支持一般函数声明。完整代码分别在 [lexer](src/lexer.ts) 与 [parser](src/parser.ts)，单行/多行注释和准确范围由 [core 测试](__test__/core.test.ts)断言。

## P2：名字与类型是两个问题

```bash
pnpm --dir internals/play-compiler check
pnpm --dir internals/play-compiler errors
```

符号表含 module scope 中的 greeting/greet，以及 function scope 的 name。函数体 greeting 指向外部声明，name 指向参数；遇到遮蔽时不能只按字符串名查一个全局表。

错误 fixture 同时包含初始化不匹配、实参类型不匹配与未声明引用，实际得到 `T001/T003/B002`。Binder 的任务是确定 `missing` 没有声明；Checker 的任务是确定 `123` 不是所需的 string。真实 tsc 还有结构化关系、上下文类型与控制流，本例没有实现它们。

## P3：观察独立 pass 与运行结果

```bash
pnpm --dir internals/play-compiler hello
pnpm --dir internals/play-compiler hello:js
pnpm --dir internals/play-compiler inspect
```

独立 pass 顺序是 erase-types、lower-arrows、lower-constants；原 AST 仍保留注解和 Arrow。生成的关键片段为：

```js
var greet = function (name) {
  return greeting + name;
};
```

实际两条 hello 命令都输出 `Hello, world`。JS 输入在 JS 模式下检查绑定、已知类型和转换前提，但不推断无标注参数类型；对比它与 TS 原始 AST 的差别。不能把这个例子的正确输出推论为任意箭头或任意 const 都可同样转换；[转换前提](docs/architecture.md#转换的前提)由语言限制与 Binder 拒绝路径共同保证。

## P4：用查询验证映射

```bash
pnpm --dir packages/compiler test maps
```

测试在生成代码中查 greeting 变量名、转换后的函数体和 greet 调用点，得到原 `.ts` 的对应坐标。`function/return` 没有直接来源，查询为空。不要仅看 `.map` 文件存在就认为映射正确。详细片段政策和查询基准见[映射专题](docs/maps.md)。

## P5：比较模块格式与裁剪

```bash
pnpm --dir internals/play-compiler modules
pnpm --dir internals/play-compiler modules:cjs
```

预测：greet 与 greeting 保留，unused 删除，noisy 和 effect 模块保留。实际报告与预测一致，两种格式都依次输出：

```text
library effect
effect module
Hello, world
```

检查输出路径已改为 `.js/.cjs`。测试额外比较裁剪前后输出，并验证多跳导入/闭包引用的固定点传播。报告中的 `<module>` 表示保留静态依赖求值壳，即使最终内容为空，也不伪称模块文件数已优化。算法与 CJS 语义边界见[模块专题](docs/modules.md)。

## P6：声明不来自删除函数体

```bash
cat internals/play-compiler/dist/output/library.d.ts
cat internals/play-compiler/dist/output/library.d.ts.map
pnpm --dir packages/compiler test maps
```

声明中 `greet` 是函数签名，`greeting` 是 string。未使用导出仍在原 API 声明集合中，用于对照应用裁剪。代码从 checked export symbols 读取 Type，再手写打印；映射中的导出名与参数名回到原定义。复杂返回类型和函数别名会明确拒绝，当前不是声明 bundler。

## P7：在真实浏览器与 Vite 中观察

```bash
pnpm --dir internals/play-compiler dev
pnpm --dir internals/play-compiler test vite
pnpm --dir internals/play-compiler build
```

打开 <http://127.0.0.1:5178>；页面从等待状态变为 `Hello, world`。终端 hook 日志证明调用，原始输入证据证明还存在类型标注，生成产物证明箭头确实降级，map 查询证明后续组合保留来源，浏览器 Console 证明执行。停止服务用 `Ctrl+C`。

生产 build 的后续格式化可能移除多余括号或改变空格，不要用固定排版判断是不是同一段代码。浏览器中央行为已经实测；DevTools 手动断点跳转没有自动化点击验证。各环节的实测与限制集中在[验证记录](docs/validation.md)。
