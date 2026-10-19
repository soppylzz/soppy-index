# 事件循环与任务调度

先理解任务、微任务与渲染机会如何衔接，再讨论怎样安排视觉更新、拆分长任务并让出主线程。

- [事件循环](./event-loop.md)：从页面脚本执行解释 task、microtask、计时器和渲染机会，再补充 Chromium 的等待与唤醒实现。
- [任务调度](./scheduling.md)：比较 requestAnimationFrame、requestIdleCallback 与 Scheduler API，解释优先级、分片和让步边界。

## 面试常考点

微任务不等于高优先级普通任务；不断添加微任务会推迟后续任务与渲染。rAF 不自动拆分耗时计算，计时器延迟也不是精确执行时刻。解释执行顺序时，要同时说明当前任务、微任务检查点和是否存在渲染机会。

## 补充：模拟时间线

[模拟器说明](./supplement/simulator.md)与[实现](./supplement/simulator.ts)用于演示简化模型，不作为真实浏览器调度的证据。需要 Node >= 22.18，在仓库根目录运行：

```bash
node docs/browser/event-loop/supplement/simulator.ts
```

真实页面的渲染流水线见[渲染模块](../rendering/README.md)。
