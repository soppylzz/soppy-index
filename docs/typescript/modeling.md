# 对象建模与类型系统的边界

## 1. interface 与 type 怎么选

`interface` 适合可扩展的对象契约，支持声明合并；`type` 可命名联合、元组、条件类型和任意类型表达式。两者都可描述普通对象，大多时候选团队更易读的写法即可。扩展时 `interface extends` 会检查冲突，交叉类型的冲突属性可能变成 `never`；不要机械地把两者视为完全等价。

```ts
interface Entity {
  readonly id: string
}

type User = Entity & { name?: string }
```

`readonly` 是静态写入限制，不能冻结运行时对象；浅层 `Readonly<T>` 不递归冻结。可选属性意味着可能缺席，读取时要考虑 `undefined`。索引签名会放宽可接受的键，开启 `noUncheckedIndexedAccess` 可使未知键读取包含 `undefined`。

## 2. 类与可见性

TS 的 `public`、`protected`、`private` 控制静态访问检查；JavaScript `#field` 是运行时私有字段，不能混为一谈。类有实例侧与静态侧，`implements` 检查实例满足接口，但不自动验证构造函数签名。抽象类可提供实现与构造逻辑，接口只描述形状。

## 3. 枚举、联合与模块

字符串字面量联合通常适合纯类型状态，运行时没有额外对象；普通 `enum` 会产生运行时代码，可在需要双向映射或运行时对象时使用。`const enum` 有编译/隔离模块互操作注意事项，不宜无条件用于发布声明包。`namespace` 在现代模块代码中少用，但可能在旧代码和声明合并里出现。

## 4. TypeScript 并非完全可靠的证明器

结构化兼容、类型断言、`any`、数组可变性、函数参数的兼容性折中等都可能让静态类型与运行时值不一致。尤其是网络返回值：

```ts
type Profile = { id: string }
const profile = (await response.json()) as Profile
```

这只是“告诉编译器相信我”。若服务器返回 `{ id: 1 }`，运行时不会自动报类型错。需要在边界校验后再把值视为 `Profile`。类型安全的目标是减少错误并表达约束，不是无需测试或无需数据验证。

资料：[TypeScript Handbook：Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)、[Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)、[Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)。
