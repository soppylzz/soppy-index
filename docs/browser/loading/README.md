# HTML 资源与脚本加载

本目录聚焦不同 script 的 HTML 解析、资源准备和执行流程，承接 [Browser Rendering](../rendering/rendering.md) 的 Parse 部分。

- [Script Loading](./script-loading.md)：classic、async、defer、module、TLA、动态脚本与页面事件。
- [Resource Hint](./resource-hints.md)：preload、modulepreload、prefetch、连接提示与优先级。
- [实验走查](./experiment.md)：操作、观察方法和实际日志。
- [实验服务](demo/lib/handler.ts)：Next.js Route Handler 服务，执行逻辑由真实浏览器完成。

## 面试常考点

先分开发现、下载和执行，再比较 async、defer 与 module。下载不阻塞解析不代表执行不占用主线程；DOMContentLoaded 与 load 等待的条件不同。资源提示可以提前准备文件，但不会改变脚本的执行模式。

## 运行

需要 Node >= 22.18。在仓库根目录执行：

```bash
pnpm install
pnpm --filter loading-next-lab dev
```

打开 <http://127.0.0.1:5004/>，按 `Ctrl+C` 停止。独立构建与生产运行：

```bash
pnpm --filter loading-next-lab build
pnpm --filter loading-next-lab start
```

端口由 Next CLI 管理；需要覆盖时执行 `pnpm --filter loading-next-lab exec next dev -H 127.0.0.1 -p 另一个端口`。使用稳定 origin，避免改变浏览器存储与页面身份的实验条件。

页面和接口由 [Next.js Route Handler](./demo/lib/handler.ts) 提供，浏览器机制由原生脚本执行。加载与生命周期页面使用独立 HTML 响应，避免 React hydration、客户端路由和热更新脚本改变被测时序。开发首次编译会影响耗时比较，时序实验优先使用构建后的生产模式。

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

服务日志显示请求和响应，页面日志显示执行与事件。毫秒值、竞争顺序与首帧时间不是固定承诺；实验边界与复现步骤见 [index.md](./experiment.md)。

实验的资源、HTTP 辅助函数与测试均在本 demo 内维护，不依赖仓库级公共 demo 模块。
