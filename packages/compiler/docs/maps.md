# JS 映射、声明输出与声明跳转

## 三个坐标来源

[emitter.ts](../src/emitter.ts) 的 Writer 维护生成行、列。调用 `write(text, origin, name)` 时记录：生成坐标、原始坐标和可选标识符名，再推进生成位置；编码库只把这些片段变成标准 v3 Source Map。它不知道 Token、AST、箭头转换或类型擦除的意义。

原始节点的 `start/end` 由 Parser 保留；转换节点用 `origin` 指向原范围。打印表达式或标识符时显式传入来源；没有传入来源的文字写入无来源 segment，防止最近的已知映射误延伸到新增代码。

| 输出内容 | 映射政策 |
| --- | --- |
| 变量/参数/引用名称、字面量 | 指向原 token 起点；名称记录到 `names` |
| 二元表达式/括号 | 指向原表达式起点；内部名称有更细映射 |
| 调用点 | 在 callee 名称和关键表达式起点映射；合成包装括号没有映射 |
| `function/return/var`、CJS require/export scaffolding | 合成文本无精确映射；保留的用户名称仍有原来源 |
| 删除的类型标注 | 无生成位置，不产生映射 |
| 路径扩展名重写 | 映射至原路径字面量起点，属于片段级来源，不承诺字符级对应 |
| 重排或裁剪 | 按最终打印顺序记录生成坐标；原坐标始终指向原文件 |

这是名称与关键表达式级映射，不能声称每个生成字符都一一对应。纯合成的 `return` 查询返回无来源，而转换后函数体、调用 callee 查询可精确回到原起点。实验产物的 map 使用相对于产物的源码路径，附带 `sourcesContent`；map 不依赖本机绝对路径恢复源文本。每个 JS 都附 `sourceMappingURL=<basename>.map`。

```bash
pnpm --dir internals/play-compiler hello
cat internals/play-compiler/dist/output/hello.js
cat internals/play-compiler/dist/output/hello.js.map
pnpm --dir packages/compiler test maps
```

[maps.test.ts](../__test__/maps.test.ts) 查变量名、函数体表达式和调用 callee，也检查合成关键字无来源。查询 API 中行从 1 起、列从 0 起；不要直接把 AST 的从 0 起行号传入查询。

## 声明由类型生成

[declarations.ts](../src/declarations.ts) 从 `binding.exports` 中读取检查后的符号类型。导出变量打印基本类型；直接导出的箭头打印参数名称/类型与返回类型。函数 body 不进入声明 printer，返回类型来自 Checker 的标注或推断。

```ts
export declare const greeting: string;
export declare const greet: (name: string) => string;
```

模块实验默认同时生成 `.d.ts` 和 `.d.ts.map`；CJS 用 `.d.cts` 和对应 map。没有导出的单文件生成 `export {};`。当前支持的 primitive 输出还包含内部签名中的 `void`，例如调用 `console.log` 得到的导出值；源语言本身不允许 `void` 标注。

声明 map 同样来自 Writer，但只有导出名称和参数名称拥有直接来源；推断出的类型和 `declare` 等新增文字不伪造原位置。测试分别查询声明导出名/参数，不能把声明映射说成 JS 断点映射：前者用于类型声明到实现的编辑器跳转，后者用于运行时调试。

不支持复杂函数返回类型打印、导出函数别名、声明合并、声明 bundling 或导出类型引用。无法打印的类型/形式报 `D001/D002`。Tree Shaking 后仍输出原始已检查的公开声明集合，用来对照 API 与应用裁剪；裁剪文件集合是应用构建产物，不应把它与未裁剪声明一起当成发布包。库入口应通过 `shake(graph, ["greet"])` 显式保留所需 API。
