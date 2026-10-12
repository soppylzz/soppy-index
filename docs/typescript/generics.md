# 函数、泛型与推断

## 1. 泛型表达关系，不是“任意类型”

```ts
function first<T>(items: readonly T[]): T | undefined {
  return items[0]
}

const value = first(["a", "b"]) // string | undefined
```

输入元素类型与输出保持关联。若只写 `unknown[]`，返回值会失去具体类型；若写 `any[]`，会失去检查。空数组可能推断出 `never` 等不理想结果，必要时显式传类型实参或标注数据源。

约束只保证能做某些操作：

```ts
function get<T, K extends keyof T>(source: T, key: K): T[K] {
  return source[key]
}
```

`K` 必须是 `T` 的键，返回类型随着键变化；`keyof T` 单独作为参数会把多个键的值合成联合类型。泛型参数越多不一定越好，只有表示实际关系时才引入。

## 2. 函数签名、重载与回调

可选参数表示调用方可以省略；`number | undefined` 参数则仍占一个参数位。重载适合调用形式和返回类型有关的公共 API；实现签名要覆盖所有重载，却不作为外部可直接调用的签名。优先先试联合与泛型，避免过量重载。

函数参数的兼容性涉及逆变：一个需要更窄输入的回调不能安全代替期望接收更广输入的回调。`strictFunctionTypes` 会加强普通函数参数检查，但方法等位置仍有兼容性折中。返回值方向通常是协变。不要靠记术语做题，问“调用方会给什么值、实现能否处理”。

## 3. 推断从哪里来

TypeScript 会从实参、返回语境和上下文类型推断。对象属性常会扩宽，数组会合并元素类型；回调参数往往由 API 签名给出上下文类型。`satisfies` 在校验配置形状时能保留具体值；`as` 会直接覆盖编译器判断，应少用。

```ts
const routes = {
  home: "/",
  settings: "/settings",
} as const satisfies Record<string, `/${string}`>

type RouteName = keyof typeof routes
```

这里 `RouteName` 是 `"home" | "settings"`。`satisfies` 检查每个路径以 `/` 开头，`as const` 保留键和值的字面量信息。它们均不会在运行时阻止对象被其他未受类型检查的代码篡改。

资料：[TypeScript Handbook：Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)、[Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)、[Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)。
