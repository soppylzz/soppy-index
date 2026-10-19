# HTTP 服务与输入边界

服务收到请求，为什么还不能说业务成功？将字节、流、取消与错误处理连成一次请求，先读[机制笔记](./server.md)，再按[实验走查](./index.md)比较状态码、业务 ack 与资源清理。

## 运行

在仓库根目录使用 Node >= 22.18：

```bash
pnpm install
pnpm --filter node-http-next-lab dev
```

打开 <http://127.0.0.1:5030/>，按 `Ctrl+C` 停止。构建后运行使用同一 filter 的 `build`、`start`。端口由 Next CLI 管理；需要覆盖时执行 `pnpm --filter node-http-next-lab exec next dev -H 127.0.0.1 -p 5031`。

[完整 Route Handler](./demo/lib/handler.ts)使用 Web Request/Response 与 ReadableStream；它运行在 Node runtime，监听与 socket 生命周期交给 Next.js。页面资源与 HTTP 工具位于本实验内部。

实验的资源、HTTP 辅助函数与测试均在本 demo 内维护，不依赖仓库级公共 demo 模块。
