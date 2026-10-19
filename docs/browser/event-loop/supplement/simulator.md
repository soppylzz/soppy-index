# Event Loop 综合示例（模拟）

> 本文是 Browser Event Loop 的配套示例，用一个可运行的 TypeScript 模拟器把 task、microtask、渲染更新和空闲期串成一条完整时间线，回答三个常见追问。渲染流水线对应 [Browser Rendering](../../rendering/rendering.md) 的简化模型。

运行方式（Node >= 22.18 原生执行 `.ts`，纯模拟，不需要浏览器）：

```bash
node docs/browser/event-loop/supplement/simulator.ts
```

## 1. 三个常见追问

### microtask 是不是只有 Promise、queueMicrotask、MutationObserver？

首先纠正一个常见混淆：**“网络”不是 microtask 来源**。XHR、图片 `load` 等事件在普通 task 中分发；`fetch()` 的网络完成由宿主在页面之外推进，只有当它让 Promise 兑现后，`.then/catch/finally` 才作为 microtask 在 checkpoint 中执行。

日常 JS 能直接遇到的 microtask 来源确实基本就是三类：

| 来源 | 说明 |
| --- | --- |
| promise reaction | `then/catch/finally`；`async/await` 中 `await` 之后的续体、`Promise.all/race` 等内部机制最终都走 promise reaction job |
| `queueMicrotask()` | 直接入队一个 microtask |
| `MutationObserver` | 以 通知 microtask 合并投递，不会为每次 mutation 单独排队 |

注意 `Promise.resolve()` 本身不入队，必须有 `.then()` 注册 reaction；已入队的 reaction 才参与下一轮 checkpoint。

### user interaction 和 timer 都是普通 task 吗？

- `setTimeout` / `setInterval` 回调：是，属于 timer task source 的普通 task。
- 点击、键盘等用户事件：是，属于 user interaction task source 的普通 task。但不同 task source 之间没有规范保证的全局顺序，浏览器可以偏向及时处理输入，这属于实现策略。
- IntersectionObserver 要区分观察与通知：交叉状态在渲染更新中计算，回调通过单独的 IntersectionObserver task source 异步投递，既不是 microtask，也不是 rAF 回调。见 [IntersectionObserver：Queue a Task](https://w3c.github.io/IntersectionObserver/#queue-an-intersection-observer-task)。
- 另外两类：`requestAnimationFrame` 属于渲染更新步骤；`requestIdleCallback` 属于空闲期，设置 `timeout` 且到期时降级为普通 task。

### 这些 task 相对“main JS 执行 + microtask”什么时候执行？

1. 正在执行的 JS 本身就运行在某个 task 里：初始脚本、事件监听器、timer 回调都是 task。当前 task 不可被抢占。
2. 当前 task 的调用栈清空后，立即执行 microtask checkpoint，把整个 microtask 队列清空（包括执行期间新入队的）。实际上每个回调返回、栈清空时都会触发 checkpoint——包括同一事件的多个监听器之间、每个 rAF 回调之间。
3. 然后，已到期的 timer、已发生的输入、已完成的网络结果才作为下一个 task 有机会运行。它们永远不会插进当前 JS 中间，也不会插在已入队的 microtask 前面。
4. 渲染机会出现在 checkpoint 之后的合适时机，渲染不是每轮必然发生；rAF 在渲染更新中调用，交叉状态也在相应阶段更新，IntersectionObserver 回调由后续 task 投递。rIC 则由空闲期或超时路径调度，不保证每帧固定执行。
5. checkpoint 中不断新增 microtask 会持续推迟渲染和下一个 task（microtask starvation）。

## 2. 模拟器覆盖了什么

| 真实机制 | 模拟方式 |
| --- | --- |
| 初始脚本 / 事件监听器 / timer 回调 | `taskQueue` 中带 task source 与 `dueTime` 的条目 |
| microtask checkpoint | `performMicrotaskCheckpoint()` 排空队列，含新增 |
| `setTimeout` | `scheduleTimer()`；到期仅代表获得资格 |
| fetch 网络完成 | `simulateNetworkResponse()`：networking task 让 promise 兑现，reaction 进 checkpoint |
| MutationObserver | 多次 mutation 合并为一个 通知 microtask |
| rAF | 渲染更新开始时快照 `rafQueue`；期间注册的回调进下一帧 |
| IntersectionObserver | 渲染更新中计算交叉状态，随后排入独立的 notification task |
| `requestIdleCallback` | 无 timeout 走空闲期；timeout 到期降级为普通 task |
| 渲染流水线 | `style → layout → pre-paint → paint → layerize → tile/raster/composite/display`，最后一段标注为合成侧 |
| 强制同步布局 | `readLayoutAfterWrite()`：写后读，style + layout 在当前 task 内提前结算 |
| 长任务 | `blockMainThread()` 直接推进虚拟时钟 |

简化声明：

- 只有一条 FIFO task 队列，并采用“输入优先”的演示策略。真实浏览器是多个 task queue 与动态优先级（见 Browser Scheduling），跨 source 顺序是浏览器策略，不是规范保证。
- 渲染机会固定为每 16.7ms 一次，且只在页面 dirty 或有 rAF 回调时才真正渲染。当前驱动器先处理就绪 task，再进入到期渲染；这是确定性演示策略，不能推导成真实浏览器一定排空所有 task 后才渲染。
- 最多执行 500 个驱动步骤；超出时明确报错，避免把未完成的模拟误当作成功输出。
- 不模拟 4ms 嵌套钳制、后台节流、Worker、ResizeObserver 循环、`scheduler.postTask()` 等。

## 3. demo 剧本

- `t=0` 初始脚本 task：写 DOM、写后同步读布局、`setTimeout(fn, 0)`、两个 microtask、一次 DOM mutation、注册 rAF、两个 rIC（一个无 timeout，一个 20ms timeout）、一个 40ms 后返回的 fetch，最后同步阻塞 50ms。
- `t=20` 一次点击到达——此时脚本还在阻塞主线程。

## 4. 实际运行输出

启动时先打印模型、剧本、日志缩写与简化条件，再输出以下虚拟时间线；这里省略启动引导。

```text
[t=...] is virtual time, not elapsed wall time
  TASK/MICRO: task execution and microtask checkpoints
  DOM/RENDER/RAF: invalidation, rendering work, and animation callbacks
  IO/RIC: observer notification and idle callbacks, including timeout delivery

limits:
  - ready-task priority and frame timing are demo policies, not browser guarantees
  - no real DOM, fetch, timers, painting, or browser processes are created
  - walkthrough: docs/browser/event-loop/supplement/simulator.md

trace:
[t=   0.0ms] TASK    [script] initial page script
[t=   0.0ms] RUN     script: sync start
[t=   0.0ms] DOM     #box text changed (marks rendering dirty)
[t=   0.0ms] DOM     read offsetWidth -> forced synchronous style + layout inside this task
[t=   0.0ms] RUN     long task (heavy computation): main thread blocked 50ms
[t=  50.0ms] RUN     script: sync end
[t=  50.0ms] MICRO   Promise.then
[t=  50.0ms] RUN     promise .then runs inside the checkpoint
[t=  50.0ms] MICRO   queueMicrotask()
[t=  50.0ms] MICRO   MutationObserver (notification microtask)
[t=  50.0ms] RUN     MutationObserver delivers 1 record(s)
[t=  50.0ms] TASK    [user-interaction] click on #save
[t=  50.0ms] RUN     click listener runs (input waited for the current task + microtasks)
[t=  50.0ms] TASK    [timer] setTimeout(fn, 0)
[t=  50.0ms] RUN     timer callback runs (delay only makes it eligible, not punctual)
[t=  50.0ms] TASK    [networking] fetch /api/data
[t=  50.0ms] RUN     networking task: response arrived, fetch promise fulfills
[t=  50.0ms] MICRO   Promise.then of fetch()
[t=  50.0ms] RUN     .then reaction runs in the checkpoint after that task
[t=  50.0ms] TASK    [idle-timeout] rIC timeout: rIC with timeout 20ms
[t=  50.0ms] RIC     rIC with timeout 20ms (timeout expired -> normal task path, didTimeout = true)
[t=  50.0ms] RUN     background chunk via timeout path
[t=  50.0ms] RIC     rIC without timeout (idle period, timeRemaining 17ms)
[t=  50.0ms] RUN     background chunk during idle period (17ms left)
[t=  66.7ms] RENDER  frame update (3 frame deadline(s) missed during long tasks)
[t=  66.7ms] RAF     rAF #1
[t=  66.7ms] RUN     rAF #1: writes visual state before paint
[t=  66.7ms] RENDER  style
[t=  66.7ms] RENDER  layout
[t=  66.7ms] RENDER  intersection observations updated; notification task queued
[t=  66.7ms] RENDER  pre-paint
[t=  66.7ms] RENDER  paint
[t=  66.7ms] RENDER  layerize
[t=  66.7ms] RENDER  tile -> raster -> composite -> display (compositor side, off main thread)
[t=  66.7ms] TASK    [intersection-observer] notify intersection observers
[t=  66.7ms] IO      IntersectionObserver callback: #box enters viewport
[t=  83.3ms] RENDER  frame update
[t=  83.3ms] RAF     rAF #2 (registered inside #1)
[t=  83.3ms] RENDER  style
[t=  83.3ms] RENDER  layout
[t=  83.3ms] RENDER  pre-paint
[t=  83.3ms] RENDER  paint
[t=  83.3ms] RENDER  layerize
[t=  83.3ms] RENDER  tile -> raster -> composite -> display (compositor side, off main thread)
```

## 5. 输出解读

1. **长任务期间什么都不能运行**：`t=0` 起阻塞 50ms，`setTimeout(fn, 0)` 和 `t=20` 到达的点击都只能等；当前 task 不可被抢占。
2. **栈清空后先排空 microtask**：`Promise.then`、`queueMicrotask()`、MutationObserver（合并投递）依次执行；此刻 fetch 还没回来，所以没有它的 reaction。
3. **下一个才是普通 task**：点击、timer、networking 依次运行。timer 的 0ms 在 `t=50` 才兑现——delay 只给执行资格。
4. **fetch 的两个阶段**：networking task 让 promise 兑现，`.then` reaction 在它之后的 checkpoint 里执行。“网络”属于 task 侧，Promise reaction 才是 microtask。
5. **rIC 的 timeout 路径**：20ms deadline 在 `t=20` 就已过期，但当前 task 不可抢占；脚本结束后它以普通 task（`didTimeout = true`）运行。
6. **rIC 的空闲期路径**：无 timeout 的 rIC 在 task 队列清空后、下一帧 deadline（`t=66.7`）之前进入空闲期运行——它可能早于下一次渲染。
7. **渲染更新在 `t=66.7` 才发生**：错过了 3 个帧 deadline。顺序为 rAF → checkpoint → style → layout → 交叉状态更新并排队通知 → pre-paint → paint → layerize → 合成侧，之后再执行 IO 通知 task。渲染不是每轮必然发生，长任务吃掉的是帧。
8. **rAF 链式注册进下一帧**：`rAF #2` 在 `#1` 内注册，`t=83.3` 才运行。
9. **checkpoint 与日志不是一一对应**：模拟器在 task 和 rAF 回调后排空 microtask；只有队列非空时才出现 `MICRO` 行，空 checkpoint 不额外打印。IO 回调运行在独立 task 中，其后也走同样的 checkpoint。

## 6. 模拟器没有覆盖的内容

- 多个 task queue 与 Blink 的动态优先级，见 Browser Scheduling。
- 计时器 4ms 钳制、后台节流与系统调度，见 Browser Event Loop 第 6 节。
- raster / composite 的线程与进程分工，见[渲染中的光栅化与合成](../../rendering/rendering.md#5-tilingrastercomposite-与-display)。
- Worker 拥有独立 event loop；这里只模拟一个 Window event loop。
