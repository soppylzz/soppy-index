# 函数手写：接收者、参数与组合顺序

同一个函数可以换接收者、预存参数，也可以把结果交给另一个函数。先分别说明“怎样调用”和“何时得到结果”，再讨论手写实现能覆盖多少原生语义。

## call、apply 与 bind 改变什么

[call.ts](call.ts) 立即调用函数，参数逐项传入；[apply.ts](apply.ts) 把一组参数展开后复用 call；[bind.ts](bind.ts) 返回新函数，普通调用固定接收者并把预存参数放在后续参数之前。

在本目录可用以下完整调用示例检查三者的关系：

```ts
import { call } from "./call.ts"
import { apply } from "./apply.ts"
import { bind } from "./bind.ts"

function total(this: { base: number }, first: number, second: number) {
  return this.base + first + second
}

const receiver = { base: 10 }
console.log(call(total, receiver, 1, 2))
console.log(apply(total, receiver, [1, 2]))
const addFromReceiver = bind(total, receiver, 1)
console.log(addFromReceiver(2))
```

三个输出都是 13。call 的教学实现把目标函数临时挂到接收者的 Symbol 属性上，再按对象方法调用；finally 删除属性，保证抛错后也能清理。但它会把原始值装箱、把 null/undefined 换成 globalThis，并要求接收者可扩展，不能模拟严格函数的任意 this 值或所有原生 call 行为。apply 也只接收这里的参数数组，不覆盖原生的任意类数组取值规则。

bind 必须另分构造分支：`new bound()` 应忽略绑定的接收者，改用 `Reflect.construct`，并处理构造器显式返回对象的情况。本实现没有复制原生绑定函数的全部 name、length、prototype 和 `Symbol.hasInstance` 语义；普通包装函数在语法上可被 new 调用，若目标不可构造，才在 Reflect.construct 处抛错。

## 柯里化保存参数，不自动推断调用意图

[curry.ts](curry.ts) 每轮把新参数追加到旧参数，达到 arity 时才执行目标函数。默认 arity 来自 `fn.length`；默认参数和 rest 会影响这个值，需要时显式传入 arity。这里没有占位符协议，也不支持根据参数类型自动决定分组。

中间调用的 this 不被保留，最终触发执行的那次调用提供 this。空调用不会增加参数；arity 为 0 时第一次调用即执行。类型接口以 unknown[] 表示收集过程，不承诺完整保留每一轮的参数类型推导。

## compose 从右向左传递一个值

[compose.ts](compose.ts) 让最右侧函数先接收输入，再把返回值依次交给左侧函数。当前签名只组合 `(value: T) => T`；没有函数时返回原值，不实现异构类型推导或 Promise 的自动 await。若需要异步流水线，必须单独定义错误传播与等待契约。

在本目录运行 `pnpm test`，用例检查接收者、参数顺序、异常清理、构造分支及组合顺序。根目录 `pnpm typecheck` 检查类型；原生边界可对照 [ECMAScript 函数方法](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function.prototype.apply)。
