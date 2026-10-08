# 跨上下文通信实验走查

[运行方式](./README.md) · [机制笔记](./crossContextCommunication.md)

公共模块迁移后的知识 / demo 对应复核与实际运行记录见[集中验证](../../demo/validation.md)；下方早期记录保留各自的环境与覆盖边界。

Node 只提供双源页面与脚本，收发和存储事件来自浏览器。终端 GET /assets/worker.js 成功，不能证明 worker 已执行或处理消息。

## 1. 准备与读日志

在仓库根目录运行：

```bash
node docs/browser/communication/index.ts
```

等待启动指引，打开 <http://127.0.0.1:5008/>，用「打开第二标签」创建 B 页。主页面为源 A，可信 iframe 为 <http://127.0.0.1:5009/frame>，源 B；「拒绝路径」折叠区域另含源 A 窗口和源 B 的另一窗口，用于错误 origin / source 对照。它们不是可信接收窗口。

打开 DevTools Console，分别查看发送页、接收页和 iframe 的页面日志。每条含 UTC 时间、执行身份和 request id；跨窗口日志并没有统一的毫秒排序保证。连接状态列出本地监听、worker 最近确认、iframe 就绪、端口握手及 pending 数量；频道「已加入」不代表已发现成员。

每组先等待两页 worker 确认和 iframe 就绪，逐个操作，避免把多个请求混在一起。日志最多 120 行，必要时先从 Console 复制。停止用 `Ctrl+C`；双端口覆盖示例和清理 key 的操作见 README。

## 2. 操作与预期

下表是实验预期，后面的实测表才表示本次已验证。

| 实验              | 操作                                  | 应观察到什么及原因                                                   |
| ----------------- | ------------------------------------- | -------------------------------------------------------------------- |
| 双页广播          | A 点击「广播请求」                    | B 收到 request 并回 ack，A 收到业务确认；A 的发送对象不收 request    |
| 同页第二对象      | A 勾选第二频道，再广播                | A 第二对象看到 request；该对象仅记录，不回 ack                       |
| 克隆失败          | 点击「发送函数」                      | 本地同步抛 DataCloneError，没有对方接收成功的证据                    |
| storage           | A 写入唯一请求                        | B 收到真实 storage 事件并处理，A 收到 B 写入 ack 造成的事件          |
| 无变化 / 删除     | 等 ack 后重复相同值，再删除 key       | 重复值不触发事件；删除在 B 记录 newValue=null；删除不是业务消息      |
| 共享实例          | A、B 依次点击共享计数                 | 两页 instance 相同、count 依次增长；leases 只代表应用端口租约        |
| 合法窗口消息      | 点击合法 window 请求                  | 可信 iframe 先记录接收和处理，A 再记录匹配 ack                       |
| 错误结构          | 点击非法结构                          | 可信 iframe 记录「拒绝 window schema」；A 超时                       |
| 错误 origin       | 点击错误 origin                       | 源 A 的测试窗口回消息，A 的主页因预期源 B 而拒绝；A 超时             |
| 错误 source       | 点击错误 source                       | 源 B 另一窗口回消息，origin 正确但 source 不匹配可信 iframe；A 超时  |
| 错误 targetOrigin | 点击错误 targetOrigin                 | 向源 B iframe 指定源 A，浏览器不派发；iframe 无新增接收日志，A 超时  |
| 端口交付          | 点击建立端口                          | window 消息交付 port2，通过校验后 iframe 启动端口，主页显示握手完成  |
| buffer 转移       | 握手后转移 ArrayBuffer                | A byteLength=0；iframe 收到 8 字节且首字节 42；A 收 ok ack           |
| 业务拒绝          | 点击业务失败                          | iframe 接收后回 error ack；发送返回和业务成功不同                    |
| 不确认            | 点击收到但不处理                      | iframe 记录接收和选择不处理；A 约 1800ms 后超时                      |
| 关闭 / 重建       | 关闭端口，再建立；重载 iframe，再建立 | close 通知在本次成功投递时清理对端端口；新握手后恢复，不复用旧 port2 |
| 失去接收方        | 关闭 B 全部连接，A 广播               | A 可发送，但没有匹配 ack 而超时；本页第二对象只观察，不回应          |
| 恢复              | B 重连，A 再广播                      | B 恢复收发；全部关闭时 pending 清零                                  |

端口 silent 没有用模拟接收日志替代事件：日志写在真实 MessagePort.onmessage 内。1800ms 是超时阈值，不保证后台标签恰好在该时刻运行回调。多个接收方只确认首个 ack，不代表全员确认。

iframe 拒绝消息中的附带端口会被关闭。页面断开连接用 AbortController 清理 window/storage 监听，关闭频道和端口，清除请求超时与 worker heartbeat；worker 收 bye 后移除端口，异常离开依靠租约回收。页面绑定的按钮和生命周期监听保留用于恢复。

## 3. 本次实际验证

以下保留通信模块实现时的浏览器验证记录；后续文档改名和补充片段只做文档与静态检查，没有重新执行这些浏览器场景。

验证日期：2026-10-08（Asia/Shanghai）。环境：macOS，本机 Node v22.23.2，Google Chrome 153.0.8010.48，Playwright 驱动的 headless Chromium 真实浏览器，新建隔离浏览器上下文，使用默认双源地址。自动化脚本、Playwright 依赖和输出位于仓库外 `/tmp/communication-validation`，临时浏览器配置也在仓库外；不作为模块依赖或测试入口维护。

| 验证项               | 实际结果                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| BroadcastChannel     | B 收 request，A 收 ack；A 主频道没有自己的 request；同页第二对象收 request；函数发送抛 DataCloneError                     |
| storage              | B 收 request，A 收 ack 对应变化；A 没有自己的 request；重复相同值后观察 250ms，B 日志未新增；删除后 B 收 newValue=null    |
| SharedWorker         | A、B instance 相同，依次操作得到 count=1、count=2                                                                         |
| postMessage 合法路径 | iframe 处理后 A 收 status=ok、result=请求已处理                                                                           |
| postMessage 拒绝     | iframe 拒绝 schema，A 拒绝错误 origin 和 source；错误 targetOrigin 后观察 2100ms，可信 iframe 日志不变，A 出现超时        |
| MessageChannel       | window 交付与端口握手成功；A buffer.byteLength=0，iframe byteLength=8、first=42，并收到业务 ok ack                        |
| 业务失败 / 不确认    | 分别获得 error ack、iframe 接收日志与发送端超时                                                                           |
| 关闭、重载、重连     | 应用 close 通知在本次抵达并清理 iframe 端口；重建及 iframe 重载后重新握手并成功处理 buffer；B 断开后 A 超时，B 重连后恢复 |
| 关闭另一标签         | B 关闭后 A 广播超时；A 关闭全部连接后 pending=0                                                                           |
| 浏览器脚本           | 核心流程未出现未捕获 pageerror；错误 targetOrigin 可能产生浏览器自身的 Console 诊断，不属于应用脚本异常                   |
| HTTP 与配置          | 两源 HTML、4 个 JS、CSS 的 GET/HEAD、MIME、no-store、HEAD 空响应通过；favicon 204、未知路径 404、POST 405 通过            |
| 启动失败             | 第一个或第二个端口冲突均非零退出，不输出成功引导；第二端口失败后已绑定的第一端口可再次绑定；非法 / 重复端口拒绝启动       |
| CLI 与端口覆盖       | 15180 / 15181 覆盖配置的地址与页面一致；启动、请求、Unicode 路径、错误输出检查均为英文 / ASCII；Ctrl+C 关闭两服务         |
| 静态检查             | 根 tsconfig 的 tsc --noEmit、变更源码 ESLint、变更文件 Prettier、相对链接检查通过                                         |

以下为同一次运行中的摘录，省略 UUID 和时间，仅保留关键字段；不是承诺固定时序：

```text
发送调用返回 window ...；尚未证明接收或处理
业务确认 window status=ok result=请求已处理
拒绝 window origin=http://127.0.0.1:5008
拒绝 window source
转移后发送端 buffer.byteLength=0
业务确认 port status=ok result=已处理 8 字节
业务确认 port status=error result=实验业务拒绝
超时 port ...：未收到业务确认，不能推断对方未接收
```

无事件的短时观察只能支持本次对照；相同值不触发 storage 事件、targetOrigin 不匹配不派发的结论还依据标准，不能只从等待几百毫秒归纳出来。

## 4. 未验证项与手动扩展

- Firefox、Safari、真实隐私窗口、第三方存储禁用、移动设备和后台长时间节流未验证。本次 headless 测试不能覆盖所有真实用户环境。
- 双端口是跨源而非跨站。跨站分区需另配不同站点域名与顶层嵌入关系，比较顶层 B 页与 A 内 B iframe 的 BroadcastChannel / SharedWorker；本服务未提供跨站分区实验，不能将此项标记为实测。
- sessionStorage 的同标签 iframe 通知范围在知识笔记解释，本 demo 只演示 localStorage。worker 末页关闭后的存活时长、浏览器杀进程、租约在后台节流下的误判与恢复没有本次实测结论。
- BFCache、冻结和恢复需手动结合[生命周期实验](../core/lifeCycle/index.md)：先建立端口，导航到其他页后历史后退，观察新握手与 pageshow.persisted；无法命中 BFCache 时记录原因，不把普通重载称为恢复。
- 可手动在 DevTools Sources 的端口转移处暂停，保留转移前引用并尝试误用；接收端反序列化失败的 messageerror 不等于发送端 DataCloneError，本次没有验证 messageerror。
- 没有网络服务端消息协议、自动重试、去重持久化、exactly-once、弹窗 / COOP 或 SharedArrayBuffer 实验。页面离开后的最后一条 bye / close 通知不保证送达。
