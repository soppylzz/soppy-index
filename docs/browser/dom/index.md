# DOM 浏览器实验走查

[运行与导航](./README.md) · [DOM / CSSOM 笔记](./dom.md) · [事件笔记](./domEvent.md) · [浏览器实现](./assets/lab.js)

公共模块迁移后的知识 / demo 对应复核与实际运行记录见[集中验证](../../demo/validation.md)；下方早期记录保留各自的环境与覆盖边界。

## 1. 准备

Node >= 22.18，在仓库根目录运行：

```bash
node docs/browser/dom/index.ts
```

等待成功监听指引，打开 <http://127.0.0.1:5015/>；可用 `PORT=5016` 覆盖，`Ctrl+C` 停止。所有机制在真实浏览器执行，Node 只提供页面与脚本，HTTP 日志不是 DOM 或事件执行证据。

每路由独立，按下面顺序操作；刷新可恢复初始树与控件。页面连接状态只表示已注册监听，日志最多保留 120 条，含文档身份与 UTC 时间。Console 查看 passive 等浏览器诊断；布局更深入的证据在 Performance 面板。

下列操作表为预期；第 5 节是实际观测。

## 2. `/tree`：查询集合与当前状态

| 顺序 | 操作                                | 预期观察与原因                                                 |
| ---- | ----------------------------------- | -------------------------------------------------------------- |
| 1    | 打开页面后克隆模板                  | 初始 static / live / fresh 均为 1；新增后为 1 / 2 / 2          |
| 2    | 查看 fragment 日志                  | fragment 子节点为 0，插入节点 parent 为 list；插入移动子节点   |
| 3    | 设置 value property                 | 当前 value 改变，attribute / defaultValue 保留                 |
| 4    | 设置 value attribute                | defaultValue 跟随 attribute；dirty 的当前 value 仍保留         |
| 5    | form reset                          | value 恢复为新的默认值                                         |
| 6    | 在输入框手动输入，读取表单值        | 当前 property 改变；input 事件真实发生                         |
| 7    | 在初始内容下比较三种读取            | textContent 含隐藏文本，innerText 为呈现文本，innerHTML 含标记 |
| 8    | 通过 textContent 写入输入框中的标记 | 显示字面量，不产生 b 元素                                      |
| 9    | 写入固定可信 HTML                   | 生成 b 元素；不解析用户输入框内容                              |

集合在本次连接时保存；重连会重新取得当前快照，所以重连后 static 数量不必仍为 1。实验没有做耗时排名，也不把 fragment 组织方式当成必然更快。

## 3. `/layout`：布局盒、视觉矩形与读写

先读取初始指标，再切换 scale(1.2)：offsetWidth 应保持布局值，rectWidth 反映视觉放大。超宽内容使 scrollWidth 大于 clientWidth；占位滚动条与系统策略会影响 clientWidth 的具体数字。

读取 inline / computed style：初始 style.width 为空，computed.width 来自样式表，为 200px。解析后的样式值不是原样 CSS 文本。

分别执行交错读写和批量读写，两者都操作 200 个真实离屏节点，初始宽度 100px，最终宽度 101px。先结算初始布局，计时包含实际读写与最终一次几何读取，结束后移除节点。这个操作可能产生同步布局，不用 busy loop 或定时器伪造延迟。

要观察布局结算，在 DevTools Performance 开始录制，逐次点击两种模式，停止后检查 Recalculate Style / Layout 及调用栈。重复时记录浏览器、设备、热身与 trace 条件；单次 elapsed 不能推算布局次数、固定倍数或生产帧率。

## 4. `/events`：原生输入与脚本分发分开

| 操作                                                 | 预期观察                                                                                                                |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 初始设置直接点击目标                                 | outer capture → inner capture → target capture → target A → target B → inner bubble → outer bubble；目标监听均为 TARGET |
| 选择 stopPropagation，再点目标                       | target B 仍执行，祖先 bubble 不再执行                                                                                   |
| 选择 stopImmediatePropagation，再点目标              | target B 与祖先 bubble 均不再执行                                                                                       |
| 恢复 none、勾 preventDefault，点击同步 dispatchEvent | 开始 → 各监听 → 返回；非可信脚本事件，result=false、defaultPrevented=true                                               |
| 再勾 passive，点击同步派发                           | target A 无法取消，result=true、defaultPrevented=false，Console 可能警告；切换 passive 会重连                           |
| 不勾 preventDefault 点击链接                         | URL hash 改变；链接监听非 passive                                                                                       |
| 勾 preventDefault 后再点击链接                       | 不再执行锚点跳转；如果已有 hash，先用浏览器返回或刷新恢复 URL                                                           |
| 点击 once 对照                                       | 连续派发两个有明确标记的脚本事件，监听只运行一次                                                                        |
| 新增委托按钮，再点其 span                            | 不逐项注册也能命中新增 data-id                                                                                          |
| 点击焦点框或按 Tab 进入                              | 目标 focus 不冒泡；父级非捕获监听收到 focusin                                                                           |
| 断开后点目标，再重连点击                             | 断开时无目标记录，重连恢复，避免累积注册                                                                                |

原生点击与“同步派发”用于两个不同问题。isTrusted=true 在本次自动化输入中被观察到，不表示测试使用了物理鼠标；脚本 MouseEvent 始终明确标记为实验派发，不用它证明受权限控制的行为。

可从 events 页回到目录，再后退验证 BFCache：同一文档身份、pagehide / pageshow persisted=true 和恢复监听才是证据。若身份改变，属于新文档加载。手动断开状态在恢复时应保留，不应自动连接。

## 5. 本次实际验证

2026-10-08（Asia/Shanghai），macOS、Node v22.23.2、Google Chrome 153.0.8010.48，Playwright 驱动 headless 真实浏览器，隔离上下文，1280×1000 视口。BFCache 验证移除自动化默认的 `--disable-back-forward-cache` 参数。脚本、依赖、结果和临时配置在仓库外 `/tmp/api-dom-validation`、`/tmp/communication-validation`。

| 验证项             | 实际结果                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 集合 / fragment    | 新增后 static=1、live=2、fresh=2；插入后 fragment.children=0，节点归属 list                                                                                                                        |
| 表单状态           | 设置 property 后再改 attribute，默认值更新，当前值仍为“当前 property”；reset 后变为“新的默认值”                                                                                                    |
| 文本 / HTML        | 初始 textContent 含隐藏文本、innerText 不含；用户标记通过 textContent 不产生 b；固定可信 HTML 产生 b                                                                                               |
| 盒尺寸             | 初始 offset=226、client=220、scroll=420、rect=226；scale 后 offset=226、rect≈271.2                                                                                                                 |
| 样式来源           | inline.width 为空，computed.width=200px                                                                                                                                                            |
| 布局读写           | 两种模式均真实操作 200 个节点并得到 finalWidth=101；本次单次 interleave=4.00ms、batch=0.20ms，未录制 Layout 次数 trace                                                                             |
| 传播顺序           | 七个监听按操作表顺序；目标捕获 / A / B 均 TARGET，自动化点击为 trusted=true                                                                                                                        |
| 停止传播           | stop 保留 target B 而阻止祖先冒泡；immediate 同时阻止 B                                                                                                                                            |
| 默认取消 / passive | 脚本 dispatchEvent 同步执行；非 passive 的有效取消返回 false，passive 对照返回 true；结束后 currentTarget=null                                                                                     |
| 链接默认行为       | 未阻止时 hash 改变，有效 preventDefault 后 URL hash 不变                                                                                                                                           |
| once / 委托 / 焦点 | 两次派发只回调一次；新增子项的 span 命中 id=2；父级非捕获仅收到 focusin，不收到 focus                                                                                                              |
| 断开重连           | 断开后目标点击没有新增事件日志；重连恢复                                                                                                                                                           |
| BFCache            | events 页后退保留同一文档身份，并记录 pagehide / pageshow persisted=true 后重连；未另外实测断开状态恢复                                                                                            |
| 浏览器异常         | 核心流程无未捕获 pageerror；passive preventDefault 预期可能有浏览器 Console 诊断                                                                                                                   |
| HTTP / CLI         | HTML / JS / CSS GET / HEAD、MIME、no-cache、HEAD 空响应，favicon 204、未知路径 404、POST 405 / Allow 通过；15215 覆盖配置、占用和非法端口、英文 / ASCII 启动与请求 / 错误输出、SIGINT 正常退出通过 |
| 静态检查           | 根 TypeScript、变更源码 ESLint、变更文件 Prettier、相对链接与代码片段语法检查通过                                                                                                                  |

摘录实际事件记录，仅去掉时间、身份与其他字段，非完整追踪：

```text
事件 outer:capture phase=CAPTURE target=target currentTarget=outer trusted=true
事件 target:capture phase=TARGET target=target currentTarget=target trusted=true
事件 target:A phase=TARGET target=target currentTarget=target trusted=true
事件 target:B phase=TARGET target=target currentTarget=target trusted=true
事件 outer:bubble phase=BUBBLE target=target currentTarget=outer trusted=true
```

## 6. 未验证与扩展

未覆盖 Firefox、Safari、移动端、不同滚动条策略、SVG / 多分片 / 复杂 transform、真实触屏与滚轮滚动性能、布局 Performance trace 的逐次事件统计。布局耗时不是跨设备结论；可按第 3 节在目标环境录制并补充记录。

未在该路由验证 Shadow DOM、iframe 与 closed root 的事件路径；分别由 [Web Components](../api/index.md)和 [iframe](../api/iframe.md)讨论，其中 open root 与 iframe 的核心路径在 API demo 本次实际验证。原生文件拖放、表单提交默认行为与框架 synthetic event 不在此实验范围。[事件笔记](./domEvent.md#vue-3一个原生监听如何执行多个处理函数)另有 Vue 3.5.22 源码分析及行为推导；本页实验未加载 Vue，不将它计入上述 demo 实测表。

BFCache 的断开状态恢复、tree / layout 页恢复尚未单独实测。关闭浏览器进程不保证 pagehide 到达，不能用本地清理日志推断所有关闭场景。
