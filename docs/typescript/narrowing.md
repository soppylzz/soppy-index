# 缩小与控制流：让每条分支有依据

## 1. 编译器如何知道类型变窄

从 `string | number` 开始，`typeof value === "string"` 成立时能调用字符串方法，另一分支是数字。编译器结合 `if`、`return`、赋值和可达性分析类型；缩小可能在重新赋值后失效。

```ts
function normalize(value: string | number) {
  if (typeof value === "string") return value.trim()
  return value.toFixed(2)
}
```

真值检查会把 `0`、`""`、`false` 一并排除；当这些是合法值时应写明确的 `value === null` / `value === undefined` 判断。

## 2. 判别联合建模状态

```ts
type Result = { kind: "ok"; data: { id: string } } | { kind: "error"; message: string }

function display(result: Result): string {
  switch (result.kind) {
    case "ok":
      return result.data.id
    case "error":
      return result.message
    default: {
      const exhaustive: never = result
      return exhaustive
    }
  }
}
```

共同的字面量字段 `kind` 让字段与分支关联。新增一个分支时，`never` 检查提醒处理遗漏，比 `data?` 和 `message?` 全放在同一对象中更稳。可选链只避免访问异常，不证明业务状态有效。

## 3. 类型谓词与断言函数

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readId(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.id !== "string") return undefined
  return value.id
}
```

谓词告诉编译器“true 分支是什么类型”，实现必须真的检查；写 `return true` 也能骗过编译器。`asserts value is T` 可在不满足条件时抛错并让后续代码缩小，但同样由作者保证正确。`as T` 是断言，不做任何运行时检查。

## 4. 不可信边界

`fetch().json()` 的数据、localStorage 和第三方回调不受 TS 编译器控制。先作为 `unknown` 接收，再用手写验证或 schema 库解析。类型定义是与外部系统的契约草图，不能代替 API 版本管理与错误处理。

资料：[TypeScript Handbook：Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)。
