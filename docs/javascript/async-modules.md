# Promise、迭代与模块

## 1. Promise 状态与“已解决”

Promise 是 pending、fulfilled 或 rejected；resolved 可能意味着已采用另一个仍 pending 的 Promise/thenable 状态，不一定已经 fulfilled。`.then` 总会返回新的 Promise，回调返回普通值使新 Promise fulfilled，抛错使其 rejected，返回 Promise/thenable 则被同化。回调异步排入 Job 队列，不会在当前同步栈内直接调用。

```js
Promise.resolve(1)
  .then((value) => value + 1)
  .then((value) => {
    throw new Error(String(value))
  })
  .catch((error) => console.log(error.message)) // 2
```

`catch` 若成功处理错误，后续链会恢复 fulfilled。`finally` 通常透传原状态与值，除非它自身抛错或返回拒绝的 Promise。

## 2. 并发组合与 await

`Promise.all` 任一拒绝就拒绝，但其他任务不会自动取消；`allSettled` 等全部结算；`race` 取第一个结算；`any` 取第一个 fulfilled，全部拒绝则得到 AggregateError。`async` 函数总返回 Promise，`await` 暂停该函数的后续执行，不阻塞整个线程。把独立请求先启动再 `Promise.all` 等待，才会并发；逐个 `await` 是串行。

```js
const [profile, settings] = await Promise.all([fetch("/api/profile"), fetch("/api/settings")])
```

这里 `fetch` 已并发发起；错误处理需考虑某个请求失败时其他请求仍运行。需要取消时使用 `AbortController`，并让底层 API 真正支持取消。

## 3. 迭代协议与生成器

可迭代对象实现 `Symbol.iterator`，迭代器的 `next()` 返回 `{ value, done }`。`for...of` 消费迭代器；`for...in` 枚举可枚举字符串属性，二者不能混用。生成器 `function*` 用 `yield` 暂停和恢复，可按需产生值；`async function*` 与 `for await...of` 面向异步迭代，适合分块数据与流。

## 4. ESM 的链接与循环

ESM 是静态可分析的导入/导出，导入绑定是实时连接到导出值的绑定，不是拷贝快照。循环依赖可存在，但访问尚未初始化的 `let`/`const` 导出会报错。CommonJS 的 `require`/`module.exports` 执行与缓存模型不同，互操作结果依赖运行时和构建工具；不能把两者循环依赖行为一概而论。Top-level await 会影响依赖模块的求值次序，可能让循环关系更复杂。

浏览器任务/微任务与 Node 事件循环的宿主调度见 [Browser core](../browser/core/README.md)和 [Node async](../node/async/README.md)。

资料：[ECMAScript Promise](https://tc39.es/ecma262/#sec-promise-objects)、[Modules](https://tc39.es/ecma262/#sec-modules)、[Async Iteration](https://tc39.es/ecma262/#sec-asynciterator-objects)。
