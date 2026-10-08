# DOM 与事件

[仓库首页](../../../README.md) · [浏览器核心](../core/README.md) · [Web API](../api/README.md) · [Observer](../observer/README.md) · [公共样式与工具](../../demo/README.md)

- [DOM 与 CSSOM](./dom.md)：节点、集合、表单状态、内容 API、盒尺寸与布局读写。
- [DOM 事件](./domEvent.md)：捕获 / 目标 / 冒泡、默认行为、委托、监听选项、可信输入与 Vue 3 invoker 源码分析。
- [实验走查](./index.md) · [HTTP 服务](./index.ts) · [浏览器实现](./assets/lab.js)。

## 运行

Node >= 22.18 和现代浏览器，在仓库根目录运行；无新增依赖、无构建步骤：

```bash
node docs/browser/dom/index.ts
```

成功监听后打开 <http://127.0.0.1:5015/>。服务只监听 `127.0.0.1`，按 `Ctrl+C` 停止。默认端口被占用则报错退出，不打印成功指引；覆盖端口需为 1～65535 的整数：

```bash
PORT=5016 node docs/browser/dom/index.ts
```

| 路由      | 实验                                                                       |
| --------- | -------------------------------------------------------------------------- |
| `/tree`   | static / live 集合、template / fragment、attribute / property、文本 / HTML |
| `/layout` | offset / client / scroll / rect、computed style、transform、布局读写对照   |
| `/events` | 原生点击与脚本派发、传播控制、默认取消、passive、once、委托与焦点          |

页面有连接 / 断开控制、上下文身份与 UTC 日志，最多保留 120 条，通过 `textContent` 追加。断开和 pagehide 会移除实验监听；BFCache 恢复按离开前状态重连。页面控件自身的连接与生命周期入口保留以便恢复。
