# 类型运算：从已有类型推导新类型

## 1. 先掌握三种取值

```ts
type User = { id: string; role: "reader" | "admin" }
type Keys = keyof User // "id" | "role"
type Role = User["role"] // "reader" | "admin"
const current = { id: "u1", role: "reader" } as const
type Current = typeof current
```

`typeof` 在类型位置读取表达式的静态类型；`keyof` 取得键联合；索引访问类型取得属性类型。它们是复杂工具类型的积木，不会读取运行时对象的实际当前状态。

## 2. 映射类型遍历键

```ts
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type Optional<T> = { [K in keyof T]?: T[K] }
type EventHandlers<T> = {
  [K in keyof T as `on${Capitalize<K & string>}`]: (value: T[K]) => void
}
```

`+/-readonly`、`+/-?` 可以增删修饰符；`as` 能重映射键。`Pick`、`Partial`、`Readonly` 等标准工具类型由相同思路构成。可选属性与 `T | undefined` 不完全相同：前者允许属性不存在，后者要求属性存在但值可以是 `undefined`，配置 `exactOptionalPropertyTypes` 会强化写入检查。

## 3. 条件类型和分配律

```ts
type ToArray<T> = T extends unknown ? T[] : never
type A = ToArray<string | number> // string[] | number[]
type Together<T> = [T] extends [unknown] ? T[] : never
type B = Together<string | number> // (string | number)[]
```

裸类型参数 `T` 出现在条件左侧时，联合类型会逐成员分配；用元组包住可阻止。`never` 是空联合，常用于过滤成员：`Extract`、`Exclude` 基于此。`any` 在条件类型中有特殊行为，可能让结果出乎意料，设计泛型工具时要单独考虑。

`infer` 可在匹配结构时引入待推断部分：

```ts
type AwaitedValue<T> = T extends PromiseLike<infer U> ? U : T
```

这个简化版只解一层；标准库的 `Awaited<T>` 还处理嵌套 thenable 等细节。模板字面量类型能组合字符串模式，但无限组合会增加编译成本和错误信息复杂度。让类型服务于清晰的 API，避免为类型谜题牺牲维护性。

资料：[TypeScript Handbook：Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)、[Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)、[Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)。
