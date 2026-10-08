# HTTP 缓存实验

[返回仓库首页](../../../README.md) · [客户端存储](../storage/README.md) · [浏览器核心](../core/README.md) · [PWA 与 Cache Storage](../pwa/README.md) · [公共样式与工具](../../demo/README.md)

本目录聚焦 HTTP response 的存储、新鲜度判断与条件验证。

- [HTTP Cache 笔记](./httpCache.md)：freshness、validator、Vary、请求 cache mode 与部署策略。
- [实验走查](./index.md)：五种策略、服务端改版、过期验证与证据判读。
- [实验服务](./index.ts)：零依赖 HTTP 服务，真实浏览器执行请求。

## 运行

需要 Node >= 22.18 和现代浏览器，在仓库根目录执行：

```bash
node docs/browser/cache/index.ts
```

打开 <http://localhost:5003/>；CLI 成功监听后打印实验步骤、观察位置和条件，按 `Ctrl+C` 停止。服务只监听本机 `127.0.0.1`。端口占用时：

```bash
PORT=5007 node docs/browser/cache/index.ts
```

不要通过 `file://` 打开。保持同一主机和端口，取消 DevTools 的 Disable cache，排除该源下已有的 Service Worker。版本信息只在服务进程内保存，停止服务后重置；浏览器 HTTP 缓存不会因此清除。

## 实验入口

页面 `/` 同时展示五张资源图片、最近一次 Resource Timing 和服务端版本。选择资源后串行运行 fetch 对照，避免把普通刷新策略当成固定行为。

| 资源              | 响应策略                         | 推荐操作                                     |
| ----------------- | -------------------------------- | -------------------------------------------- |
| fresh.svg         | public, max-age=60 + ETag        | 改版后比较 default / force-cache 与 no-cache |
| short-fresh.svg   | max-age=1 + ETag + Last-Modified | 等超过一秒，用 default 观察验证              |
| no-cache.svg      | no-cache + ETag                  | 重复请求，再改版请求，比较终端 304 与 200    |
| last-modified.svg | no-cache + Last-Modified         | 检查 If-Modified-Since                       |
| no-store.svg      | no-store，无验证器               | default 重复请求，观察每次完整响应           |

CLI 的 HTTP 日志表示真正到达本地服务器的请求。页面和浏览器 Console 输出带时间戳的探测结果；fetch 可能把网络 304 合并为可读的 200，Resource Timing 的 bodySize 也不是“本次在线传输的 body 大小”。详细判断方法见 [index.md](./index.md)。

本实验覆盖浏览器私有 HTTP 缓存，不模拟 CDN、共享缓存、Vary 分区、断网回退或生产部署。
