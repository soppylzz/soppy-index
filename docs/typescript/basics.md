# 类型系统基础：描述值的形状

## 1. 类型检查发生在运行前

```ts
let title = "network" // Inferred as string.
title = "security"
// title = 42; // Type error.
```

这里 `let` 的字符串字面量通常扩宽为 `string`；`const` 声明的原始值更容易保留字面量类型。类型标注、推断和断言只影响检查，不会让运行时多出一个“类型对象”。API 返回 JSON、表单输入、环境变量都必须在运行时验证。

## 2. 结构化类型与额外属性

```ts
type Point = { x: number; y: number }
const point3D = { x: 1, y: 2, z: 3 }
const point: Point = point3D
```

TypeScript 主要按结构兼容：源对象有目标要求的成员就可赋值。直接写新鲜对象字面量时还有额外属性检查，能抓拼写错误；先存入变量后这类检查可能不触发。不要误以为所有对象赋值都要求字段“完全相同”。需要精确建模时，明确校验边界和业务约束。

## 3. 联合、交叉和字面量

`A | B` 表示值满足其中一种；只有两者共有的操作可直接用。`A & B` 表示同时满足两边约束，但冲突属性可能得到 `never`。字面量联合适合状态：

```ts
type Status = "idle" | "loading" | "success" | "error"
const state: Status = "loading"
```

`as const` 可让对象/数组的字面量推断更窄并带 readonly；`satisfies` 检查表达式满足目标类型，同时尽量保留表达式本身更具体的推断。两者用途不同：前者影响推断，后者检查兼容性。

## 4. 几个特殊类型

- `unknown`：任何值都能赋给它，但使用前必须缩小；适合 JSON、异常、外部接口入口。
- `any`：跳过检查且会传播，应只用于受控迁移边界。
- `never`：不可能出现的值，常用于穷尽检查和条件类型过滤。
- `void`：通常描述忽略返回值的函数；不等同于 `undefined` 在所有赋值场景中的语义。
- `object`、`{}`、`Object` 范围不同；需要表达字段时写具体对象类型。`{}` 在严格非空检查下可包含原始非空值，别当“空对象”。

```ts
const value: unknown = JSON.parse('{"x":1}')
if (typeof value === "object" && value !== null && "x" in value) {
  console.log(value.x)
}
```

这只证明存在 `x` 属性，还没证明它是 `number`。继续检查 `typeof value.x === "number"`，或使用运行时 schema 验证器。下一篇看 [控制流缩小](narrowing.md)。

资料：[TypeScript Handbook：Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)、[Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)。
