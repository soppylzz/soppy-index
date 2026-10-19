# 编程练习目录：先说明契约，再验证实现

这里分为算法与类型练习、JavaScript 机制实现，以及可运行的界面实验。先明确输入、输出和边界，自己推导并尝试，再用已有示例或测试核对；类型检查与示例成功都不能证明任意输入正确。

## 从哪一类开始

- JavaScript 基础：[函数调用与组合](function/README.md) → [对象与原型](object/README.md) → [数组遍历](array/README.md) → [工具函数](utils/README.md)。
- 异步与组织：[Promise](promise/README.md)、[任务调度](schedule/README.md)、[前端设计模式](design-pattern/README.md)。
- 页面实践：[CSS 布局与交互](css/README.md)、[React 状态与清理](react/README.md)、[Vue 响应式与组合](vue/README.md)、[SSE/WS 与打字机](stream/README.md)。
- 类型机制：[类型挑战导航](type-challenges/README.md)、[待解决题目](type-challenges/UNRESOLVED.md)。

## 数据结构：按要支持的操作选择

先读操作语义，再看内部表示；复杂度需要连同输入条件和实现方式说明。

| 需要的操作 | 阅读入口 |
| --- | --- |
| 两端增删、窗口候选 | [双端队列](structure/deque/README.md)、[单调栈](structure/monoStack/README.md) |
| 每次取最优先元素 | [堆](structure/heap/README.md)、[优先队列](structure/priorityQueue/README.md) |
| 动态前缀与区间统计 | [树状数组](structure/fenwickTree/README.md)、[线段树](structure/segTree/README.md) |
| 合并与连通性 | [并查集](structure/unionFind/README.md) |
| 前缀与有序查找 | [字典树](structure/trie/README.md)、[跳表](structure/skipList/README.md) |
| 容量约束下的选择 | [背包问题](structure/knapsack/README.md) |

算法专题：[LIS](algorithm/lis/README.md)、[LCS](algorithm/lcs/README.md)、[回文与 Manacher](algorithm/manacher/README.md)、[拓扑排序](algorithm/topoSort/README.md)。[Hot 100](hot100/)按题练习，输入输出方式见 [ACM 模式](hot100/ACM.md)。

## 运行与验证

在仓库根目录统一安装依赖；进入对应子包运行其脚本。例如在 `coding/algorithm/` 执行 `pnpm lis`，在 `coding/utils/` 执行 `pnpm test`。框架和 CSS 演示的启动地址见各自说明，避免同时占用同一端口。

根目录 `pnpm typecheck` 运行共享配置检查及独立工作区检查。`pnpm test` 运行已注册的 Vitest 项目；算法和数据结构的 Node 演示不自动等同于完整测试，类型挑战中的断言也需要结合题目契约理解。
