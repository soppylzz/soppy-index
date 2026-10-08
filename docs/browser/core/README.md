# 渲染、调度、资源加载与生命周期

[返回仓库首页](../../../README.md) · [存储实验](../storage/README.md) · [缓存实验](../cache/README.md)

- [Browser Rendering](./rendering.md)：解析、样式、布局、绘制与合成，图示在同目录 `assets/`。
- [Browser Scheduling](./scheduling.md)：浏览器任务调度。
- [Browser Event Loop](./eventLoop/index.md)：事件循环笔记。
- [Page Lifecycle](./lifeCycle/README.md)：页面可见性、BFCache、冻结恢复与离页保存实验。
- [Script Loading](./loading/README.md)：不同 script 的解析与执行流程，以及 resource hint 对照实验。

## Event Loop 模拟器

使用 Node >= 22.18，在仓库根目录运行；模拟器打印时间线后退出。

[`eventLoop/simulator.ts`](./eventLoop/simulator.ts) 使用虚拟时钟展示 task、microtask checkpoint、渲染更新与空闲期，纯 Node 模拟，不需要浏览器：

```bash
node docs/browser/core/eventLoop/simulator.ts
```

逐段走查见 [`eventLoop/simulator.md`](./eventLoop/simulator.md)。模拟器的简化条件以该说明为准。

## Script Loading 浏览器实验

使用相同 Node 环境运行服务，按 `Ctrl+C` 停止；实验逻辑在浏览器中执行。

```bash
node docs/browser/core/loading/index.ts
```

打开 <http://localhost:5004>，在真实浏览器中观察 classic、async、defer、module、动态插入、CSS 等待和资源提示。运行条件与实验入口见 [loading/README.md](./loading/README.md)。

## 页面生命周期浏览器实验

```bash
node docs/browser/core/lifeCycle/index.ts
```

打开 <http://localhost:5006/>，观察加载事件、前后台切换、历史记录恢复、条件离开提醒与本地上报。按 `Ctrl+C` 停止；完整条件见 [lifeCycle/README.md](./lifeCycle/README.md)。
