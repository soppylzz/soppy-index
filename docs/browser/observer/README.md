# Observer API

[仓库首页](../../../README.md) · [浏览器核心](../core/README.md) · [页面生命周期](../core/lifeCycle/README.md)

根据变化信号选择观察器：DOM 结构与属性用 MutationObserver，几何交叉用 IntersectionObserver，布局盒尺寸用 ResizeObserver。

- [机制笔记与核心代码](./observer.md)：观察范围、交付时机、记录、阈值、盒模型和反馈边界。
- [实验走查](./index.md)：独立路由、操作与预期、实测结果和未验证项。
- [HTTP 入口](./index.ts) · [浏览器实验脚本](./assets/lab.js) · [页面样式](./assets/style.css)。

## 运行

需要 Node >= 22.18 和支持三类 Observer 的现代浏览器。仓库根目录执行，无新增依赖、无构建步骤：

```bash
node docs/browser/observer/index.ts
```

成功监听后，打开 <http://127.0.0.1:5010/>。默认端口 5010，只监听 `127.0.0.1`；用 `Ctrl+C` 停止。端口被占用时服务报错退出，不输出成功引导。可覆盖为 1～65535 的整数：

```bash
PORT=5012 node docs/browser/observer/index.ts
```

| 路由            | 研究内容                                      | 观察位置                       |
| --------------- | --------------------------------------------- | ------------------------------ |
| `/mutation`     | 同步修改后的批量通知、takeRecords、disconnect | 页面中的真实记录与操作日志     |
| `/intersection` | 初始状态、滚动阈值、rootMargin、视觉遮挡      | 两个观察器的交叉比例与采样时间 |
| `/resize`       | content / border box、transform、有限反馈     | 尺寸回调及真实浏览器错误事件   |

每条日志包含 UTC 时间和文档身份，最多保留 100 条，通过 `textContent` 追加。连接状态表示本页注册情况，不证明回调已执行。页面离开时断开观察器、移除观察期间的 error 监听并取消待执行帧；从 BFCache 恢复时按离开前连接状态重连。没有后台轮询或持久化存储。
