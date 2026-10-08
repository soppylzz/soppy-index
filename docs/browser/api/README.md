# 浏览器 API

[仓库首页](../../../README.md) · [DOM](../dom/README.md) · [Observer](../observer/README.md) · [跨上下文通信](../communication/README.md)

- [常用 Web API](./webApi.md)：URL、克隆、取消、FormData、文件与环境能力。
- [Web Components](./webComponents.md)：自定义元素、模板、Shadow DOM、slot 与事件边界。
- [iframe](./iframe.md)：独立文档、同源限制、sandbox 与显式通信。
- [实验走查](./index.md) · [服务入口](./index.ts) · [浏览器代码](./assets/lab.js) · [iframe 接收代码](./assets/frame.js)。

## 运行

Node >= 22.18，现代浏览器。在仓库根目录运行，无新增依赖或构建步骤：

```bash
node docs/browser/api/index.ts
```

等待成功启动指引，打开 <http://127.0.0.1:5013/>，跨源 iframe 使用 <http://127.0.0.1:5014/frame>。两个服务只监听 `127.0.0.1`，按 `Ctrl+C` 同时停止。不要混用 `localhost`、`127.0.0.1` 或 `file://`。

```bash
PORT=5017 PEER_PORT=5018 node docs/browser/api/index.ts
```

端口必须为 1～65535 的不同整数；任一占用即启动失败，并关闭已启动的另一个服务。

| 路由          | 实验                                                             |
| ------------- | ---------------------------------------------------------------- |
| `/tools`      | URL 编码、结构化克隆 / 转移、真实延迟 fetch、取消、404、FormData |
| `/files`      | Blob、选择本地文件、FileReader、Object URL 释放、matchMedia      |
| `/components` | 生命周期、属性、slot、composed 与 target 重定向                  |
| `/iframe`     | 同源 / 跨源 / sandbox DOM 读取、合法消息与拒绝对照               |

文件实验最多读取 64 KiB，不上传用户选取的文件；FormData 单独发送固定实验内容。所有实验不触发摄像头、定位、通知等权限请求。页面日志有界且使用 `textContent`；实际验证与限制见走查。
