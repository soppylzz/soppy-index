# Browser Scheduling

Event Loop 和调度解决的是相邻但不同的问题：Event Loop 描述 task、microtask checkpoint 与渲染机会如何衔接；调度关注浏览器如何在多类工作之间选择，以及开发者如何表达工作的时机、优先级和让步边界。

| 层次                | 主要问题                                         | 本文关注点                                        |
| ------------------- | ------------------------------------------------ | ------------------------------------------------- |
| Event Loop 规范模型 | callback 在 task、microtask 还是渲染步骤中运行？ | 见 [Browser Event Loop](./eventLoop/eventLoop.md) |
| 浏览器内部调度      | 多个可运行 task queue 中先选择哪一个？           | Blink 队列属性和动态优先级                        |
| Web 调度 API        | 页面应把工作安排到什么时候，以什么紧急程度执行？ | rAF、rIC、`postTask()`、`yield()`                 |
| 应用层分片          | 长工作如何切分、让步并恢复？                     | 时间预算、continuation 与 fallback                |

本文中的 Chromium 源码摘录最后核对于 2026-09-19，对应 commit `39cea72b3a158dda6cd7c951611b3da13bef600b`。固定版本用于保证摘录与链接一致，`main` 链接用于观察后续变化；浏览器兼容性最后核对于 2026-09-20。

## 1. 调度不等于抢占

页面 JavaScript task 一旦开始执行，浏览器通常不会在任意一行代码中间将它抢占。提高输入队列优先级，只能让输入工作在当前 task 结束后更早被选择，不能中断正在运行的长循环。

microtask 也不是“优先级最高的普通 task”。它在 microtask checkpoint 中持续执行；如果 microtask 不断添加新的 microtask，浏览器仍然无法进入下一个 task 或渲染机会。真正让出主线程，需要结束当前 task，并把后续工作安排到新的 task 或其他调度阶段。

因此，调度优化通常同时包含两步：

1. 把长工作拆成可以独立完成的小片段；
2. 在片段之间结束当前 task，让浏览器有机会处理输入、渲染和其他任务。

## 2. Chromium/Blink 如何选择普通 task

HTML Standard 允许事件循环从多个 task queue 中选择可运行任务，但网页不能依赖不同 task source 之间存在固定全局顺序。Blink 的调度实现需要区分四层概念：

| 层次                 | 作用                                 | 示例                              |
| -------------------- | ------------------------------------ | --------------------------------- |
| `TaskType`           | 标记工作的来源或用途                 | `kUserInteraction`、`kNetworking` |
| `QueueTraits`        | 决定队列能否暂停、冻结、延后或节流   | pausable、loading、input-blocking |
| `PrioritisationType` | 告诉 scheduler 应采用哪类优先级策略  | `kRegular`、`kLoading`、`kInput`  |
| `TaskPriority`       | scheduler 最终计算出的当前队列优先级 | normal、highest、extremely high   |

这是一条“任务分类 → 队列属性 → 调度策略 → 当前优先级”的转换关系，不能把其中任意一层直接等同于 HTML Standard 的 task source。

当前 [`FrameSchedulerImpl::CreateQueueTraitsForTaskType`](https://chromium.googlesource.com/chromium/src/+/39cea72b3a158dda6cd7c951611b3da13bef600b/third_party/blink/renderer/platform/scheduler/main_thread/frame_scheduler_impl.cc) 中，普通 networking task 使用 loading queue，普通 user interaction task 使用 pausable queue，而内部 input-blocking task 使用专门的 input queue；后续变化可查看[最新 main](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/platform/scheduler/main_thread/frame_scheduler_impl.cc)。以下摘录省略了其他 `TaskType`：

```cpp
case TaskType::kInternalLoading:
case TaskType::kNetworking:
  return LoadingTaskQueueTraits();

case TaskType::kUserInteraction:
  return PausableTaskQueueTraits();

case TaskType::kInternalInputBlocking:
  return InputBlockingQueueTraits();
```

队列随后由 [`FrameSchedulerImpl::ComputePriority`](https://chromium.googlesource.com/chromium/src/+/39cea72b3a158dda6cd7c951611b3da13bef600b/third_party/blink/renderer/platform/scheduler/main_thread/frame_scheduler_impl.cc) 动态计算优先级。当前源码中，普通队列最后回落到 `kNormalPriority`；内部 input queue 是 `kHighestPriority`；可见页面中确实阻塞渲染的网络加载可以是 `kExtremelyHighPriority`：

```cpp
if (task_queue->GetPrioritisationType() ==
    MainThreadTaskQueue::QueueTraits::PrioritisationType::kInput) {
  return TaskPriority::kHighestPriority;
}

if (task_queue->GetPrioritisationType() ==
    MainThreadTaskQueue::QueueTraits::PrioritisationType::kRenderBlocking) {
  return parent_page_scheduler_->IsPageVisible()
             ? TaskPriority::kExtremelyHighPriority
             : TaskPriority::kNormalPriority;
}

return TaskPriority::kNormalPriority;
```

所以 Blink 的实现也不是固定的 `Promise > user interaction > fetch/XHR`：

- Promise reaction 是 microtask，在 checkpoint 中处理，不参与普通 task queue 的优先级比较；
- 普通用户事件与普通网络工作可能同为 normal priority；
- input-blocking 工作会被提升，但 render-blocking 网络工作也可能获得更高优先级；
- 页面可见性、加载阶段、节流策略和功能开关都可能改变调度结果。

这些实现解释了 Chromium 为什么通常倾向于保证交互响应，但网页不能把实现策略当成稳定的执行顺序保证。

## 3. Web 调度 API 如何选

下面的表格按“用途”选 API，而不是重复它们在 Event Loop 中所属的队列类型：

| 需求                         | 优先选择                                           | 原因与限制                                            |
| ---------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| 当前操作必须原子完成         | 同步执行                                           | 不产生调度边界；工作过长会阻塞主线程                  |
| 当前 task 结束前完成少量收尾 | `queueMicrotask()`                                 | checkpoint 中执行；不能用来让出主线程                 |
| 下一次预计绘制前更新视觉状态 | `requestAnimationFrame()`                          | 与 rendering opportunity 协调，不保证固定帧率         |
| 安排一个普通的后续 task      | `scheduler.postTask()` 或 timer fallback           | `postTask()` 可表达优先级；timer 只表达最早可运行时间 |
| 长任务分片后主动让步         | `scheduler.yield()` 或 task fallback               | 后续代码进入新的 task，浏览器可先处理其他工作         |
| 可无限期延后的后台工作       | `requestIdleCallback()` 或 background `postTask()` | idle period 可能长期不出现；必须考虑超时和兼容性      |
| 大量 CPU 计算                | Web Worker                                         | 转移到其他线程；分片只能减少单次阻塞，不能创造并行    |

所有这些 API 都不承诺某个墙上时刻立即执行。后台页面、省电策略、页面可见性和主线程负载都可能改变 timer、rAF、idle period 和任务预算。使用新调度 API 前应做特性检测，并准备语义可接受的降级路径。

## 4. requestAnimationFrame

### 介绍

`requestAnimationFrame(callback)` 把 callback 放到浏览器的渲染更新步骤，在预计绘制前调用。它适合根据时间更新动画或批量提交视觉变化，不是普通 task，也不是 microtask。

rAF 与 `setTimeout(fn, 16)` 的核心区别不是数字 `16`：timer 只在 delay 到期后获得运行资格，不理解显示刷新节奏；rAF 由浏览器结合 rendering opportunity 安排，而且后台页面通常会暂停或显著降低调用频率。

如果一次 rAF callback 自身执行过久，仍然会占用主线程并错过帧。rAF 解决“何时提交视觉更新”，不负责自动切分计算工作。渲染阶段的详细关系见 [Browser Event Loop：渲染时机](./eventLoop/eventLoop.md#5-渲染时机)和 [Browser Rendering](./rendering.md)。

### 怎么用

rAF 是一次性的；连续动画需要在 callback 中再次注册。动画进度应根据 callback 的时间戳计算，不能假设显示器固定为 60Hz：

```js
const duration = 300
let startedAt

function animate(timestamp) {
  startedAt ??= timestamp

  const progress = Math.min((timestamp - startedAt) / duration, 1)
  element.style.transform = `translateX(${progress * 200}px)`

  if (progress < 1) {
    requestAnimationFrame(animate)
  }
}

requestAnimationFrame(animate)
```

需要取消尚未执行的 callback 时，保存返回的 ID 并传给 `cancelAnimationFrame()`。

### 兼容性与 shims

rAF 已在现代主流浏览器中广泛支持；当前兼容性数据记录 Chrome 24、Firefox 23、Safari 7 起支持无前缀版本，通常不需要 shim，详见 [MDN：requestAnimationFrame compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame#browser_compatibility)。

若项目确实需要兼容更旧环境，可以用 timer 提供近似 fallback，但它无法获得浏览器的真实 rendering opportunity：

```js
const requestFrame =
  globalThis.requestAnimationFrame?.bind(globalThis) ??
  ((callback) => setTimeout(() => callback(performance.now()), 16))

const cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis) ?? clearTimeout
```

## 5. requestIdleCallback

### 介绍

[`requestIdleCallback(callback, options)`](https://w3c.github.io/requestidlecallback/) 用于表达：“这项后台工作不紧急，可以在主线程空闲时执行。”浏览器会根据输入、预计帧截止时间和待处理任务判断是否存在 idle period；这个判断属于用户代理策略，不保证每帧发生。

callback 收到一个 `IdleDeadline`：

- `deadline.timeRemaining()` 返回浏览器估计的当前空闲期剩余时间，最小为 `0`；它只是预算提示，不会自动中断代码。
- `deadline.didTimeout` 表示 callback 是否因为 `options.timeout` 到期而运行；此时 `timeRemaining()` 为 `0`。

在 Blink 中，主线程 scheduler 创建的 idle queue 使用 `kBestEffort`，相关实现见 [`MainThreadSchedulerImpl`](https://chromium.googlesource.com/chromium/src/+/39cea72b3a158dda6cd7c951611b3da13bef600b/third_party/blink/renderer/platform/scheduler/main_thread/main_thread_scheduler_impl.cc)（[最新 main](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/platform/scheduler/main_thread/main_thread_scheduler_impl.cc)）。不过 `timeout` 到期后的 idle callback 会获得执行 task，不能概括成“rIC 永远拥有最低优先级”。

### 怎么用

一次调用只安排一次 callback。工作没有完成时，需要主动再次注册，并在每次 callback 中按预算处理一部分：

```js
const pendingJobs = Array.from({ length: 3 }, (_, index) => () => console.log(`job ${index + 1}`))

function runWhenIdle(deadline) {
  while (pendingJobs.length > 0 && deadline.timeRemaining() > 1) {
    const job = pendingJobs.shift()
    job()
  }

  // Make at least one step after a timeout to avoid starvation.
  if (deadline.didTimeout && pendingJobs.length > 0) {
    const job = pendingJobs.shift()
    job()
  }

  if (pendingJobs.length > 0) {
    requestIdleCallback(runWhenIdle, { timeout: 1000 })
  }
}

requestIdleCallback(runWhenIdle, { timeout: 1000 })
```

使用时需要注意：

1. callback 开始后不会被 deadline 强制终止，开发者仍需主动控制每片工作量。
2. 没有 `timeout` 时，繁忙或后台页面可能长期不产生 idle period。
3. `timeout` 能限制等待时间，但超时后 callback 会作为 task 竞争主线程，工作过重仍会造成卡顿。
4. rIC 适合分析、预计算等可推迟工作；视觉更新使用 rAF，必须及时完成的任务不能只依赖 idle period。
5. 真正耗 CPU 的大量计算优先考虑 Web Worker，而不是把完整长任务塞进 idle callback。

### 兼容性与 shims

rIC 不是 Baseline 功能。当前兼容性数据记录 Chrome 47、Firefox 55 起支持，而 Safari 稳定版尚未启用；Safari Technology Preview 仅能通过偏好设置开启，详见 [MDN：requestIdleCallback compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback#browser_compatibility)。

timer shim 无法知道浏览器是否真的空闲，也不能生成可信的时间预算。下面的 fallback 只保证工作最终推进，并通过 `didTimeout: true` 明确表示它不是真实 idle period：

```js
function scheduleIdle(callback, options = {}) {
  if (globalThis.requestIdleCallback) {
    return requestIdleCallback(callback, options)
  }

  return setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 0)
}

function cancelScheduledIdle(id) {
  if (globalThis.cancelIdleCallback) {
    cancelIdleCallback(id)
  } else {
    clearTimeout(id)
  }
}
```

## 6. Scheduler API

### 介绍

[Prioritized Task Scheduling](https://wicg.github.io/scheduling-apis/) 定义了 `scheduler.postTask()` 和 `scheduler.yield()`。它目前是 WICG Draft Community Group Report，而不是所有浏览器都必须实现的 Web 标准。

`scheduler.postTask(callback, options)` 将 callback 安排到独立的 event loop task，并返回一个 Promise。它支持三种意图优先级：

| priority        | 适用工作                                 |
| --------------- | ---------------------------------------- |
| `user-blocking` | 直接响应用户输入、需要尽快完成的分片工作 |
| `user-visible`  | 用户可感知但不紧迫的工作，也是默认值     |
| `background`    | 日志、预计算和非关键初始化等后台工作     |

同一个 scheduler 控制的任务会按照这些优先级选择；scheduler task 与其他 task source 如何交错，仍由浏览器实现决定。因此，`user-blocking` 不是同步执行，也不保证越过所有浏览器内部工作。

`await scheduler.yield()` 会结束当前 task，并把函数剩余部分作为 continuation 安排到新的 task。continuation 默认使用 `user-visible` 优先级；在 `postTask()` callback 等已有调度上下文中调用时，会继承该上下文的优先级。相同优先级下，continuation 比尚未开始的新 task 更优先。

### 怎么用

`postTask()` 用于表达任务的紧急程度：

```js
await scheduler.postTask(() => updateVisibleResults(), {
  priority: "user-blocking",
})
```

`yield()` 用于在长循环的时间片之间主动交还主线程：

```js
async function processItems(items) {
  let sliceStart = performance.now()

  for (const item of items) {
    process(item)

    if (performance.now() - sliceStart >= 8) {
      await scheduler.yield()
      sliceStart = performance.now()
    }
  }
}
```

microtask 不能替代 `yield()`：递归添加 microtask 会让 checkpoint 持续执行，浏览器仍无法进入渲染或处理下一个 task。

### 兼容性与 shims

当前兼容性数据记录 `postTask()` 从 Chrome 94、Firefox 142 起支持，`yield()` 从 Chrome 129、Firefox 142 起支持；Safari 尚未实现二者。分别参见 [MDN：postTask compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/postTask#browser_compatibility)和 [MDN：yield compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield#browser_compatibility)。生产代码必须分别检测两个方法，不能只检测 `globalThis.scheduler`。

timer 或 `MessageChannel` fallback 可以保留“进入新 task”的让步边界，但无法完整模拟任务优先级、动态改优先级、取消信号和 continuation 排序：

```js
function yieldToMain() {
  if (globalThis.scheduler?.yield) {
    return scheduler.yield()
  }

  return new Promise((resolve) => setTimeout(resolve, 0))
}

function postTask(callback, options = {}) {
  if (globalThis.scheduler?.postTask) {
    return scheduler.postTask(callback, options)
  }

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(callback())
      } catch (error) {
        reject(error)
      }
    }, options.delay ?? 0)
  })
}
```

如果应用依赖 priority、`TaskController` 或 continuation 的完整语义，应使用经过验证的 polyfill，或为不支持环境设计不依赖优先级的降级路径，而不是把上述 fallback 当成等价实现。

## 7. 面试回答框架

| 问题                                      | 30 秒回答                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Event Loop 与调度有什么区别？             | Event Loop 描述 task、microtask 和渲染步骤的执行模型；调度决定多个可运行工作如何选择，并让开发者表达时机或优先级 |
| microtask 能用来切分长任务吗？            | 不能；microtask checkpoint 会持续清空队列，递归 microtask 仍会阻止下一个 task 和渲染                             |
| rAF 与 timer 有什么区别？                 | rAF 与预计绘制协调；timer 只保证经过至少 delay 后获得运行资格，不理解刷新节奏                                    |
| rIC 的 deadline 会中断代码吗？            | 不会；`timeRemaining()` 只是预算提示，callback 必须自行分片并及时返回                                            |
| `postTask()` 的高优先级能抢占当前任务吗？ | 不能；优先级影响后续任务选择，不会在任意 JavaScript 语句中间抢占当前 task                                        |
| `scheduler.yield()` 做了什么？            | 结束当前 task，把剩余代码作为继承优先级的 continuation 安排到新 task，从而给输入和渲染机会                       |

常见误区：

- 把 Blink 内部 `TaskPriority`、Scheduler API 的 `TaskPriority` 与 HTML task source 当成同一层概念；
- 认为提高 task 优先级可以中断正在执行的 JavaScript；
- 用递归 microtask 模拟 yield；
- 认为 rAF、rIC、timer 或 `postTask()` 能保证精确执行时刻。
