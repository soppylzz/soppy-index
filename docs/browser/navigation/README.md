# 页面导航与会话历史

先区分“创建新文档”和“在同一文档内切换历史条目”，再理解浏览器前进后退为何可能更新视图、恢复旧文档或重新加载。

[History 与 Location](./history.md)按导航操作、历史条目、事件和服务端 fallback 展开。页面冻结、离开和恢复见[生命周期](../lifecycle/README.md)，不在本模块重复解释。

## 面试常考点

重点说明 pushState / replaceState 不会直接触发 popstate，修改 URL 不等于应用自动渲染；hash 导航与路径路由的服务端要求不同；后退也不等于必定命中 BFCache。history.length 无法表示当前历史游标。

## 运行导航实验

导航需要观察文档加载与恢复，因此复用[生命周期实验服务](../lifecycle/demo/lib/handler.ts)，不另外复制服务器。在仓库根目录运行：

```bash
pnpm --filter lifecycle-next-lab dev
```

打开 <http://127.0.0.1:5006/history> 或 <http://127.0.0.1:5006/navigation>，按[实验走查](./experiment.md)操作。需要 Node >= 22.18；端口占用时用 `pnpm --filter lifecycle-next-lab exec next dev -H 127.0.0.1 -p 5007` 指定新端口，按 `Ctrl+C` 停止。

服务仅对 `/history/view/a` 和 `/history/view/b` 提供 History fallback，未知子路径、脚本和 API 不回退为 HTML。保持 host 与端口一致，避免把 origin 变化混入导航实验。
