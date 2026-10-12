# 内存、错误与常见面试误区

## 1. 可达性比“栈/堆”口诀更有用

规范描述值与引用的语义，不要求引擎按面试口诀把所有原始值放栈、对象放堆。垃圾回收通常依据可达性：从全局、活跃栈、宿主保留的回调等根出发，仍可访问的对象不会被回收。循环引用本身不等于泄漏；长期可达的监听器、定时器、缓存和 DOM 引用才是常见原因。`WeakMap` 的键不会像普通 Map 那样强保留对象，但值、其他引用与具体实现仍需考虑。

## 2. 错误传播

同步 `try/catch` 只能捕获其执行栈内抛出的错误；异步 Promise 拒绝要 `await` 后在同一 async 函数中捕获，或给 Promise 链加 `.catch`。回调式 API 可能把错误交给回调或事件，不能只在调用外层放一个 `try/catch`。

```js
try {
  await Promise.reject(new Error("failed"))
} catch (error) {
  if (error instanceof Error) console.log(error.message)
}
```

错误对象也可能是字符串、数字或第三方对象，不能无条件读取 `.message`。资源清理放在 `finally`、AbortSignal 或 API 提供的关闭方法中；Promise 拒绝本身不会自动关闭 socket、文件或定时器。

## 3. 面试中值得讲清的边界

- 微任务不是“下一帧”：Promise reaction 的调度由语言定义为 Job，具体何时与渲染、计时器交替由宿主环境决定。
- `async/await` 是 Promise 组合的语法，不自动让 CPU 密集代码并行；计算并行需要 Worker/线程/进程或外部服务。
- 防抖、节流是应用层时间策略；它们不改变浏览器事件派发和网络协议本身。使用时说明前沿/后沿、取消和最终调用行为。
- 正则表达式可能发生灾难性回溯；处理不可信长文本要限制输入和复杂度，必要时换解析器或线性时间方案。

资料：[ECMAScript Jobs](https://tc39.es/ecma262/#sec-jobs-and-job-queues)、[MDN Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)。
