# Promise 手写：核心机制与扩展方法

Promise 保存的是一次操作的结果及对该结果的订阅。耗时工作通常由网络、定时器等机制完成，Promise 本身不会创建线程。[核心实现](./promise.ts) 只负责构造器、then、状态管理和结果解析。

## 三个标记分别约束不同层次

| 标记   | 位置                         | 要回答的问题                                          |
| ------ | ---------------------------- | ----------------------------------------------------- |
| state  | 每个实例的字段               | 结果仍在等待，还是已经成功或失败？                    |
| locked | 构造器闭包                   | executor 得到的 resolve/reject 是否已经作出首次决策？ |
| called | 每次调用外部 thenable 的闭包 | 这个 thenable 是否已经发出首次结果通知？              |

state 初始为 pending，只能进入 fulfilled 或 rejected。进入终态后保存的值或原因不能再被后续通知替换；这不意味着结果对象的内部属性被冻结。

locked 不能仅由 state 是否为 pending 替代。设 A 的 resolve 接收到仍在等待的 B：A 需要跟随 B，状态还可以是 pending，但结果来源已经确定。此后 executor 再 reject A，不能覆盖之前选择的 B。locked 在开始接纳前就设为 true；内部结果解析继续工作，不再经过 executor 的这道入口锁。

called 针对的是外部 thenable。它可能先通知“采用等待中的 C”，随后又通知失败；即使当前 Promise 仍未进入终态，也必须忽略后一次通知。每层 thenable 都有自己的 called，不能用一个全局开关替代整个接纳过程。

## 构造器同步执行，用户处理器稍后执行

executor 在构造时立即执行。它在通知结果之前抛出的同步异常会进入拒绝；已经 resolve 或 reject 后再抛错，则被入口锁挡住。构造器捕获的只是 executor 这次同步执行中的异常，不会自动捕获日后定时器回调抛出的错误。

then 注册一对成功和失败任务。pending 时保存任务；终态时可以立即安排任务，但不能在注册过程中同步运行用户回调。每个任务都通过 queueMicrotask 调度，因此对同一个已完成 Promise 的后续订阅仍是异步的。

fulfill/rejectValue 同步保存终态并通知已有任务；通知任务会安排微任务，而不是直接执行用户处理器。保存状态与执行处理器是两个不同时间点。

Promises/A+ 要求处理器在当前用户执行栈之外运行，并未指定必须使用微任务。本实现选择微任务，并额外把可调用 thenable 的调用也排入微任务；不要把所有这些时序细节都称为 A+ 的强制要求。[Promises/A+ 的 then 要求](https://promisesaplus.com/#the-then-method)

## then 返回新实例，是链式转换的基础

每次 then 都新建一个 MyPromise。当前实例的状态决定选择哪个处理器，但下一实例的状态由处理器的执行结果决定：

| 当前选择的处理器 | 本次执行结果          | 下一实例如何处理 |
| ---------------- | --------------------- | ---------------- |
| 成功或失败处理器 | 返回普通值            | 以该值成功       |
| 成功或失败处理器 | 返回 Promise/thenable | 继续接纳它的结果 |
| 成功或失败处理器 | 抛出异常              | 以该异常失败     |
| 缺省成功处理器   | 当前成功              | 传递当前值       |
| 缺省失败处理器   | 当前失败              | 传递当前拒绝原因 |

因此失败处理器返回普通值可以恢复成功，失败处理器再次抛错才会继续失败。不能因为“运行的是失败回调”就无条件拒绝下一环。

同一实例的多次 then 是多个独立订阅，不是对同一个后续实例重复赋值。一个分支抛错不会阻止另一个分支处理原结果。已注册任务按订阅顺序安排，清理回调数组则释放不再需要的引用。

## resolveValue：区分普通值和外部异步对象

解析首先检查结果是不是当前实例自身。若下一实例的处理器返回的恰好就是该下一实例，会形成直接自引用，需要以 TypeError 拒绝。

普通原始值直接成功；对象或函数则读取一次 then。读取动作本身可能触发 getter 并抛错，也可能每次返回不同结果，所以不能先读取判断，再另读一次调用。读到非函数 then 时，把原对象当普通值成功即可。

可调用 then 需要以原对象作为 this 调用。其成功通知的值再次进入 resolveValue，因为 thenable 可以层层嵌套；失败通知直接保存原因，不展开原因中的 Promise。called 保证只接受第一次通知，也使已经通知结果后抛出的异常被忽略。[A+ 结果解析过程](https://promisesaplus.com/#the-promise-resolution-procedure)

本实现没有判断复杂 thenable 循环图的完整算法。直接解析到自身会失败，但外部 thenable 若不断返回自己，可能持续安排微任务。A+ 没有要求实现通用的循环 thenable 检测，不能把直接自引用检查等同于检测所有环。

## 类型签名和运行时行为要分开解释

PromiseLike<T> 描述可订阅的接口，TResult1、TResult2 描述成功和失败处理器可能产生的结果。它们不会在运行时检查外部对象是否守约；读取异常、重复通知和嵌套接纳仍需要运行时分支。

## 扩展方法与文件

| 文件 | 关注的问题 |
| --- | --- |
| [catch.ts](./catch.ts) | 如何只处理失败分支？为什么返回普通值后可以恢复成功？ |
| [resolve.ts](./resolve.ts) | 如何把普通值或 thenable 统一成 MyPromise？什么时候可以复用原实例？ |
| [reject.ts](./reject.ts) | 为什么拒绝原因即使是 Promise，也不能展开？ |
| [finally.ts](./finally.ts) | 如何等待清理结束，同时保留原来的成功值或拒绝原因？ |
| [all.ts](./all.ts) | 如何等待全部成功，并按输入顺序保存结果？ |
| [race.ts](./race.ts) | 如何让第一个落定的输入决定结果？ |
| [all-settled.ts](./all-settled.ts) | 如何把每项的成功或失败都记录为普通结果？ |
| [any.ts](./any.ts) | 如何忽略单项失败，在全部失败时按输入顺序收集原因？ |
| [index.ts](./index.ts) | 如何将独立实现装配成可用的实例方法和静态方法？ |

## 错误处理与结果转换

`catch` 把失败处理器交给 `then` 的第二个参数。它的恢复能力来自 `then`：失败处理器正常返回时，返回值会成为下一环的成功结果；抛出异常时，下一环继续失败。

`resolve` 只负责入口统一。如果输入已经是当前构造器的实例，就可以返回它；其他输入交给构造器接纳。因此对象的 `then` 属性如何读取、嵌套结果如何展开，仍由核心负责。`reject` 则直接把输入作为拒绝原因保存，不参与接纳。

`finally` 不接收原结果作为参数。它先执行清理，再用 `resolve` 等待清理返回的异步结果。如果清理成功，成功分支重新返回原值，失败分支重新抛出原原因；如果清理抛错或返回失败结果，后续链就接收清理失败。

## 四种组合方法

组合方法接收可迭代对象，通过 `for...of` 消费输入。每项都先经过 `promiseResolve`，所以普通值、MyPromise、原生 Promise 和 thenable 都能走相同的订阅流程。

`all` 和 `allSettled` 在遍历时记录索引，在回调中按这个索引写入结果。回调完成顺序可能变化，结果顺序仍由输入决定。`all` 的失败分支直接拒绝整体；`allSettled` 的失败分支写入一条 rejected 记录，再继续计数。

这些等待计数从 1 开始，多出来的一项代表“遍历尚未结束”。每读到一个输入加一，每收到一个需要计数的结果减一，遍历完成再减一。因此空输入也能自然结束，不需要事先把 iterable 转成数组。

`race` 把每项的成功和失败通知都交给整体 Promise。首次通知之后，核心的锁定机制会忽略后续结果。空输入没有任何通知，因此保持 pending。

`any` 把成功通知直接交给整体 Promise，只在失败时记录原因、减少计数。所有输入都失败后，才用 `AggregateError` 拒绝。错误数组同样按输入索引写入。空输入直接得到包含空 errors 数组的 `AggregateError`。

可迭代对象本身也可能出错。遍历发生在 executor 内，读取 iterator 或迭代时抛出的异常会由构造器捕获，成为整体拒绝。因此 `allSettled` 虽然会收集单项失败，整体仍可能因为输入无法正常遍历而失败。[ECMAScript Promise 规范](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-objects)

## 使用入口

使用完整 API 时，从 `index.ts` 导入：

```ts
import { MyPromise } from "./index.ts"

const result = MyPromise.all([1, MyPromise.resolve(2)])
  .then((values) => values.reduce((sum, value) => sum + value, 0))
  .catch(() => 0)
  .finally(() => console.log("Completed"))
```

`index.ts` 只给自定义构造器和它的原型装配方法，不修改原生 Promise。`catch` 和 `finally` 中的 TypeScript `this` 参数描述调用时的接收者，不是调用时需要手动传入的普通参数。类型声明合并也只补充方法签名，真正的运行时装配由 `Object.defineProperties` 完成。

单独研究组合方法时，也可以直接导入 `promiseAll` 等命名函数。完整链式 API 需要先加载 `index.ts`；直接导入 `promise.ts` 只会加载 A+ 核心。当前练习固定使用 MyPromise 构造器，不覆盖子类、species 或将静态方法借给其他构造器使用的语义。

## 运行测试

在 coding/promise 中选择脚本执行：

| 命令                     | 对象与方式                       |
| ------------------------ | -------------------------------- |
| `pnpm test`              | 手写实现，单次运行               |
| `pnpm test:native`       | 原生 Promise，校验同一批测试预期 |
| `pnpm test:watch`        | 监听手写实现                     |
| `pnpm test:watch:native` | 监听原生 Promise                 |

只检查核心的一个模块，可以运行 `pnpm test __test__/04-resolution.test.ts`。脚本通过 Vitest mode 选择测试对象，不使用 .env 切换。类型检查统一在仓库根目录运行 `pnpm typecheck`。

[测试目录](./__test__/) 的前四个模块覆盖构造、订阅、链式调用与结果解析，其余模块覆盖扩展、可迭代输入和完整链式组合。测试通过 index.ts 加载完整 API；辅助工具里的原生 Promise 用于等待与观测，不会替换未开启参考模式的手写实现。

原生参考模式通过，只能说明这些测试预期能被原生实现满足，不能证明手写实现通过。pending 用例只观察有限窗口，不证明永远不会落定。当前测试不是完整的官方 A+ 一致性认证，实现也不覆盖原生 Promise 的子类、species、宿主未处理拒绝事件等完整语义。
