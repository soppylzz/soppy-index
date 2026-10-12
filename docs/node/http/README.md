# Node HTTP 服务

[Node 导航](../README.md) · [HTTP 机制](./httpServer.md) · [实验走查](./index.md) · [服务源码](./index.ts)

先读请求体如何形成字节流，再区分 HTTP 响应、业务确认与客户端取消。浏览器脚本见 [lab.js](./assets/lab.js)。

在仓库根目录使用 Node >= 22.18 运行：

```bash
node docs/node/http/index.ts
```

成功监听后按终端地址访问；默认是 <http://127.0.0.1:5030/>，`PORT=0` 可自动分配端口。服务只监听本机，按 `Ctrl+C` 停止。页面复用[公共 Demo](../../demo/README.md)；先预测请求结果，再对照浏览器日志与服务终端，不能仅凭服务收到请求认定业务完成。
