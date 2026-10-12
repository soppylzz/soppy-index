# Node 原生 TypeScript：执行与类型检查分离

[本组导航](./README.md) · [实验走查](./index.md)

Node22.18默认支持可擦除TS类型语法：类型标注、interface、type与type-only import被去掉，保留JavaScript执行语义。它不调用TypeScript compiler、不做类型检查，也不按tsconfig paths解析或按target降级。

enum、参数属性、需要运行时生成的namespace等不属于单纯擦除。部分版本/选项提供实验性transform，不能拿该能力当本仓库默认运行前提。JSX、装饰器转换和bundle仍需相应工具链。

源码相对import用实际.ts扩展名，纯类型依赖用import type；模块格式仍遵循扩展名和包type。本项目tsconfig允许.ts导入并noEmit，用tsc --noEmit独立检查；这与Node执行是两道检查。

发布给老Node或需.js/.d.ts产物时应选择编译/打包流程。Node不会因为TS写了number就自动验证外部JSON，运行时仍需结构校验，见 [HTTP](../http/httpServer.md)。

## 两道互不替代的检查

`node file.ts` 在这个版本能去掉可擦除类型并执行剩下的 JavaScript；`tsc --noEmit` 则检查类型但不运行程序。把 `value` 写成 `number` 不会在收到 JSON 时自动验证它；输入边界仍需运行时检查。遇到 `enum` 或 JSX 这类需要转换的语法时，也不能期待单纯擦除产生可执行代码。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
interface Sample {
  value: number
}
const sample: Sample = { value: 42 }
console.log(JSON.stringify({ value: sample.value, runtimeType: typeof sample.value }))
```

typed.ts直接运行显示number，只证明类型擦除后值正常执行，不证明所有TS类型断言正确或所有TS语法受支持。根目录tsc另外校验真实源码。

## 依据与版本

以 [Node 22.18 官方 typescript 文档](https://nodejs.org/download/release/v22.18.0/docs/api/typescript.html) 核对 API 合约；实验版本与结果见[验证记录](../validation.md)。
