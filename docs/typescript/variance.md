# 方差与高级推断：从可替换性理解类型关系

先复习 [函数与泛型](generics.md)。方差讨论：若 `Dog` 可以当作 `Animal`，`Container<Dog>` 能否当作 `Container<Animal>`？答案取决于类型参数被读、被写还是两者都有。不要把术语当作纯背诵题，始终用“接收方会如何使用”检验安全性。

## 1. 生产者协变，消费者逆变

```ts
type Animal = { name: string }
type Dog = Animal & { bark(): void }

type Producer<T> = () => T
type Consumer<T> = (value: T) => void
```

能生产 `Dog` 的函数可用于需要生产 `Animal` 的位置，因为结果至少有 `Animal` 的成员，这是协变。能消费所有 `Animal` 的函数可用于只会传 `Dog` 的位置，因为它能处理更广的输入，这是逆变。反方向不安全：只会处理狗的函数碰上猫就可能出错。开启 `strictFunctionTypes` 后，普通函数类型参数按更严格的逆变关系检查；方法参数仍有兼容性折中。

## 2. 可变容器为什么危险

`ReadonlyArray<Dog>` 只读时可视作动物列表；若允许向 `Dog[]` 中写入 `Cat`，之后读取并调用 `bark()` 就会出错。TypeScript 出于 JavaScript 互操作与易用性保留了一些不健全的数组/方法兼容行为。公开 API 尽可能把只读输入写成 `readonly T[]`，只有确需修改时才暴露可变集合。

`in`/`out` 方差标注是 TypeScript 的高级工具，编译器通常可从类型结构自动推断。它们主要用于非常复杂的泛型关系/性能问题，不应拿来强行改变本来不安全的结构关系。

## 3. 条件类型中的推断位置

```ts
type ElementOf<T> = T extends readonly (infer U)[] ? U : never
type Name = ElementOf<readonly ["a", "b"]> // "a" | "b"
```

`infer U` 在条件类型匹配结构时得到候选类型。若一个泛型参数出现在多个候选位置，推断结果受位置的方差影响；这也是 `UnionToIntersection` 类型题的原理之一。但面试先讲清输入/输出关系和分布式条件类型，再谈此技巧。对重载函数使用 `ReturnType` 时，推断通常从最后一个调用签名取得结果，不会按某组参数重新做重载决议。

```ts
declare function parse(value: string): number
declare function parse(value: number): string
declare function parse(value: string | number): string | number
type Parsed = ReturnType<typeof parse> // string | number
```

## 4. 推断不等于验证

泛型函数能保留静态关系，但如果实现里用了 `as T` 或 `any` 伪造结果，调用方仍可能在运行时失败。公共工具类型应该配合运行时边界和适当的 API 测试。类型体操题见 [Type Challenges](../../handwrite/type-challenges/)，业务代码优先可维护的约束表达。

资料：[TypeScript Generics：Variance Annotations](https://www.typescriptlang.org/docs/handbook/2/generics.html#variance-annotations)、[TypeScript 2.6：strictFunctionTypes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html)、[Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)。
