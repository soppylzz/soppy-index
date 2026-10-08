# Web API 浏览器实验走查

[运行与导航](./README.md) · [常用 API](./webApi.md) · [Web Components](./webComponents.md) · [iframe](./iframe.md)

## 1. 启动与观察

需要 Node >= 22.18、现代浏览器，在仓库根目录执行：

```bash
node docs/browser/api/index.ts
```

等待成功指引，打开 <http://127.0.0.1:5013/>；对端 iframe 来自 <http://127.0.0.1:5014/frame>。可用 `PORT=5017 PEER_PORT=5018` 覆盖，端口必须不同；按 `Ctrl+C` 关闭两服务。只绑定本机，不需要额外依赖、构建或外部网络。

每个路由有独立的文档身份、连接状态与按时间追加的日志。页面日志最多 120 条，iframe 子页最多 40 条；查看子页时可滚动其日志。终端 HTTP 请求不能作为 API 已执行或消息已处理的证据，Console 用于查看浏览器诊断。

断开会取消实验监听、当前 fetch、计时器、文件读取、Object URL 或组件连接等本路由资源。pagehide 走相同清理入口；命中 BFCache 时按离开前状态重连。连接和生命周期按钮入口保留以便恢复，不用无界定时器维持“连接”。

以下操作表是实验预期，实测表才表示本次验证。

## 2. `/tools`：数据工具与真实网络

| 操作                   | 预期与原因                                        | 证据                                 |
| ---------------------- | ------------------------------------------------- | ------------------------------------ |
| URL 与查询参数         | 中文、空格、& 正确编码，重复 tag 保留             | href 与解码后的参数                  |
| 克隆与转移             | 循环引用和 Date / Map 保留，原 buffer 长度 0      | 克隆后字段、targetBytes=8、首字节 42 |
| 克隆函数               | 同步 DataCloneError                               | 捕获的异常名                         |
| 请求延迟响应           | 等服务响应后先有 status，再读取 JSON              | 浏览器 fetch 与响应体日志            |
| 请求后立即取消         | 通常得到 AbortError；极快已完成请求不保证仍可取消 | 对应 request id 的结束记录           |
| 请求 404               | fetch 得到 Response，再由应用判 status 失败       | status=404、ok=false、应用 Error     |
| 提交 FormData          | 浏览器生成 boundary，服务报告已收到的字节数       | 返回 JSON 的 contentType / bytes     |
| 请求后断开，再重连请求 | 旧任务取消，新请求可成功                          | 状态与新 request id 的响应体         |

当前请求超时策略为 2500ms；服务固定实验延迟为 1200ms，接口只接受 0～3000ms 的整数。计时器不是准时调度保证。FormData 接口只检查大小并回显元数据，没有 multipart 解析或业务保存；请勿把 bytes > 0 视为业务字段校验成功。

## 3. `/files`：字节、引用与环境事件

| 操作                   | 预期与原因                                                  |
| ---------------------- | ----------------------------------------------------------- |
| 生成 Blob 并读取       | 本地 Blob.text 返回内容、类型与字节数                       |
| 选择 UTF-8 文本文件    | FileReader load 记录真实文件名、大小及前 120 个字符；不上传 |
| 选择超过 64 KiB 的文件 | 应用拒绝读取，不将其装入内存日志                            |
| 创建 Object URL        | 显示下载入口，通过真实 fetch(blob URL) 读取内容             |
| 释放 Object URL        | revoke 并移除下载 href，避免继续使用失效入口                |
| 浏览器宽度跨过 700px   | 真实 matchMedia change 输出匹配状态                         |
| 读取环境信号           | 显示 secure / onLine / media；不代表某服务连通              |

下载是否保存由用户与浏览器决定；不要在点击下载后立刻释放仍需使用的引用。本实验保留 URL，直到显式释放、创建新 URL 或清理。断开后媒体 / 网络状态监听移除，重连读取当前状态。

## 4. `/components`：实例与事件边界

先刷新，保持 composed 勾选。点击组件的内部按钮，外部日志应显示 target=lab-counter，内部自定义事件由按钮发起；composedPath 在 open root 中能看到 BUTTON / ShadowRoot / 宿主。

取消勾选再点内部按钮：计数仍更新，内部收到 demo-change，外部不收到该自定义事件。原生 click 是另一个事件，不受该开关修改。

更新 value attribute 会执行 attributeChangedCallback 并渲染；更新 slot 内容会产生实际 slotchange，子节点 parentNode 仍是宿主。读取封装边界会对照外部 querySelector 与 open shadowRoot。

挂载 / 移除使用同一个实例，观察 connectedCallback / disconnectedCallback；重新挂载后一次点击只增加一次。断开实验会移除组件并清理内部与外部监听；重连重新挂载已有实例，计数保持。

## 5. `/iframe`：访问、拒绝与处理确认

等同源和跨源的“脚本就绪”日志，点击读取 DOM。同源可读，跨源与不透明 sandbox 应捕获 SecurityError。sandbox 允许脚本但不允许同源身份；其 ready 消息 origin 为 "null"，父页有意拒绝。

合法跨源请求：父页先记录发送调用返回，cross 子页记录接收 / 处理 probe，父页再记录相同 id 的业务 ack。非法结构：子页记录拒绝 probe 结构，父页约 1500ms 后超时。超时不能推断对方没有接收。

点击跨源 iframe 内部按钮，只出现子文档 click 日志，不新增父 document click。重载三个 iframe 后，旧请求定时器被清理，等待新 ready，再发送合法消息恢复。重载期间不保证已有请求能交付。

本实验校验精确 targetOrigin、origin、source、kind / role / id 等结构；更多伪造来源与端口转移对照见 [通信实验](../communication/index.md)。双端口是跨源实验，没有构造跨站存储分区。

## 6. 本次实际验证

2026-10-08（Asia/Shanghai），macOS、Node v22.23.2、Google Chrome 153.0.8010.48，Playwright 驱动 headless 真实浏览器，隔离上下文，初始视口 1280×1000，使用默认双源。自动化、输出、临时配置与 Playwright 位于仓库外 `/tmp/api-dom-validation`、`/tmp/communication-validation`，不是本模块运行依赖。

| 项目                 | 实际结果                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL / 克隆           | 参数往返与重复 tag 正确；循环引用、Date、Map 保留；buffer 0 → 8 字节且首字节 42；函数抛 DataCloneError                                                                          |
| fetch                | 延迟请求读取真实 JSON；手动取消 AbortError；404 先得到 status，再由应用报告 Error HTTP 404                                                                                      |
| FormData             | 浏览器生成 multipart boundary，服务回显 293 字节；未解析字段                                                                                                                    |
| 网络清理             | 请求中断开后观察 1300ms，未新增该响应体成功日志；重连后新请求读取成功                                                                                                           |
| 本地文件             | FileReader 读取 local.txt 的 18 个 UTF-8 字节；超过 64 KiB 拒绝；用户文件没有网络上传                                                                                           |
| Object URL           | 创建后实际读取所选文本；释放后入口隐藏且 href 移除；自动化再次 fetch 旧 URL 失败                                                                                                |
| 文件补查             | 使用 15313 / 15314 覆盖端口，连续读取 a.txt / b.txt 的内容与大小一致；断开时释放旧 Object URL，重连后生成与读取新 URL 成功                                                      |
| 环境                 | 视口切到 650px，再恢复 1280px，分别收到 media=true / false 的 change                                                                                                            |
| 组件                 | 属性、slotchange、同一实例移除 / 重挂回调真实发生；重新挂载点击只加 1，计数从 12 到 13，实验重连后到 14                                                                         |
| 自定义事件           | composed=true 外部收到重定向 target 和包含内部按钮的路径；false 仍在内部交付，外部记录数未增加                                                                                  |
| iframe DOM / sandbox | 同源读取成功，cross / opaque 抛 SecurityError；opaque 的 origin=null 消息被父页拒绝                                                                                             |
| iframe 请求与拒绝    | 合法请求子页处理后获得匹配 ack；非法 id 在子页拒绝并使父页超时；重载后新请求成功                                                                                                |
| iframe 事件          | 子文档点击后，父文档 click 计数不变                                                                                                                                             |
| 日志与异常           | 多次 URL 操作后只保留 120 条；核心流程无未捕获 pageerror；释放后故意读取失效 URL 可能产生浏览器资源诊断                                                                         |
| HTTP / 配置          | 两源 HTML / JS / CSS 的 GET / HEAD、MIME、no-cache、HEAD 空响应通过；204 / 404 / 405 与 Allow、延迟参数 400、请求体 413 通过                                                    |
| 启动与 CLI           | 15213 / 15214 覆盖配置一致；首 / 次端口冲突均非零退出且无成功指引，次端口失败释放首端口；非法 / 重复端口拒绝；启动、请求、Unicode 路径与错误输出为英文 / ASCII；SIGINT 退出正常 |
| 静态检查             | 根 TypeScript、变更源码 ESLint、Prettier、相对链接和代码片段语法检查通过                                                                                                        |

日志摘录，去除时间、随机 id 与动态 boundary；是本次观测，不是固定时序承诺：

```text
克隆拒绝 DataCloneError
响应到达 ... status=404 ok=false
请求结束 ... Error HTTP 404
内部 demo-change composed=false value=2
DOM 读取拒绝 cross：SecurityError
拒绝 iframe origin/source：origin=null source=opaque
业务 ack ... ok=true；接收方已校验并处理 probe
```

## 7. 未验证项

未测试 Firefox、Safari、移动设备、权限授予 / 拒绝、Clipboard / Fullscreen / Share / Geolocation / Notification、真实 online / offline 切换、下载文件保存、跨站存储分区、CSP 嵌入限制、closed root、表单关联元素和复杂组件升级。

API 路由的 BFCache 恢复代码已实现，未逐一实测；共同清理模式只在 [DOM events 路由](../dom/index.md)实测了恢复。可连接后进入目录再后退，比较文档身份与 persisted 日志；新文档加载不能记作恢复成功。文件快速切换、超时与服务端副作用需要在具体业务中进一步验证。
