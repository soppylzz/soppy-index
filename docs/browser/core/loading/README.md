# HTML 资源加载与 Script 实验

[返回浏览器核心目录](../README.md) · [仓库首页](../../../../README.md)

本目录聚焦不同 script 的 HTML 解析、资源准备和执行流程，承接 [Browser Rendering](../rendering.md) 的 Parse 部分。

- [Script Loading](./index.md)：classic、async、defer、module、TLA、动态脚本与页面事件。
- [Resource Hint](./resourceHints.md)：preload、modulepreload、prefetch、连接提示与优先级。
- [实验走查](./demo.md)：操作、观察方法和实际日志。
- [实验服务](./index.ts)：零依赖 HTTP 服务，执行逻辑由真实浏览器完成。

## 运行

需要 Node >= 22.18 和支持 module / 顶层 await 的现代浏览器。在仓库根目录运行：

```bash
node docs/browser/core/loading/index.ts
```

启动成功后，终端会列出当前地址、13 种 script/CSS 实验、4 个 resource hint 对照入口、操作步骤及日志位置。打开 <http://localhost:5004>，选择实验，打开 DevTools Network 与 Console。按 `Ctrl+C` 停止服务。端口占用时可切换：

```bash
PORT=5005 node docs/browser/core/loading/index.ts
```

实验只监听本机 `127.0.0.1`。不要直接用 `file://` 打开。普通实验禁用 HTTP 缓存以拉开网络就绪时间；hint 对照允许复用匹配资源，观察该组时请取消 DevTools 的 Disable cache。

## 实验参数

`/experiment?mode=defer&a=900&b=100&tail=500&css=1300&work=0`

| 参数      | 含义                                                        | 默认        |
| --------- | ----------------------------------------------------------- | ----------- |
| `mode`    | 页面目录中的实验模式                                        | `classic`   |
| `a` / `b` | classic 文件响应延迟；module 模式下为各自静态依赖的响应延迟 | 900 / 100ms |
| `tail`    | 含后方 DOM 的 HTML 尾部发送延迟，从文档请求开始计           | 500ms       |
| `css`     | CSS 实验的样式表响应延迟                                    | 1300ms      |
| `work`    | 每个外部 classic 中的同步忙循环时间                         | 0ms         |

时间参数限制在 0～5000ms；非法值使用默认值。TLA 模式另有固定 1400ms 异步等待。每个普通实验还有一张响应延迟 1600ms 的非懒加载图片，用来比较 DOMContentLoaded 与 load；该延迟从图片请求开始计。

服务日志显示请求和响应，页面日志显示执行与事件。毫秒值、竞争顺序与首帧时间不是固定承诺；实验边界与复现步骤见 [demo.md](./demo.md)。
