# Web Storage

- [知识笔记](./webStorage.md)：机制、边界和对应 demo 的核心代码。
- [实验走查](./index.md)：启动、操作步骤、预期与验证边界。
- [实验页面](demo/lib/page.ts)：Next.js 本地实验服务。

## 运行

需要 Node >= 22.18。在仓库根目录执行：

```bash
pnpm install
pnpm --filter web-storage-next-lab dev
```

打开 <http://127.0.0.1:4000/>，按 `Ctrl+C` 停止。独立构建与生产运行：

```bash
pnpm --filter web-storage-next-lab build
pnpm --filter web-storage-next-lab start
```

端口由 Next CLI 管理；需要覆盖时执行 `pnpm --filter web-storage-next-lab exec next dev -H 127.0.0.1 -p 另一个端口`。使用稳定 origin，避免改变浏览器存储与页面身份的实验条件。

页面和接口由 [Next.js Route Handler](./demo/lib/handler.ts) 提供，浏览器机制由原生脚本执行。加载与生命周期页面使用独立 HTML 响应，避免 React hydration、客户端路由和热更新脚本改变被测时序。开发首次编译会影响耗时比较，时序实验优先使用构建后的生产模式。

实验的资源、HTTP 辅助函数与测试均在本 demo 内维护，不依赖仓库级公共 demo 模块。
