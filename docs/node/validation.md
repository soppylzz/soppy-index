# Node 实验验证记录

[Node 导航](./README.md) · [Browser 验证](../demo/validation.md)

## 实际环境

2026-10-08，macOS darwin/arm64，Node v22.23.2，V8 12.4.254.21-node.56、libuv1.51.0。另从nodejs.org下载官方Node v22.18.0到仓库外，实际执行全部8个CLI入口和HTTP服务，核对最低版本兼容性。没有只凭本机新版本通过就声称最低版本可运行。

HTTP页面用真实Google Chrome 153.0.8010.48 Headless操作，自动化依赖、脚本、Node二进制与浏览器配置在仓库外。CLI输出完整检查英文/ASCII，Unicode样本数据用JSON转义；没有新增运行时依赖或构建步骤。

## 覆盖与观测

| 分组与知识                                             | 实际实验与断言                                                                 | 实测结果                                                                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [runtime / eventLoop / process](./runtime/README.md)   | 原生CJS和ESM子进程、真实readFile、退出事件与返回码                             | CJS顶层nextTick先于Promise；ESM顶层Promise/queueMicrotask先于nextTick；I/O回调内immediate先timer；body→beforeExit→exit；子退出7由父识别               |
| [modules / packages / typescript](./modules/README.md) | require缓存、import live binding、同步ESM与TLA图、包自引用/#映射/条件、直接.ts | 同一对象/namespace且count=1；同步ESM可require，TLA拒绝ERR_REQUIRE_ASYNC_MODULE；两条件入口分别命中；未公开路径拒绝；类型擦除输出42/number             |
| [async / events / asyncContext](./async/README.md)     | 两消费者处理六任务、真实可取消timer、同步emit、异步拒绝捕获、并发store         | peak=2；AbortError且finally执行；监听按注册同步调用；error接住拒绝后订阅清零；两请求ID隔离，run外无store                                              |
| [buffer / fsPathUrl](./data/README.md)                 | UTF-8、视图/副本、分块解码、特殊字符file URL、handle与目录清理                 | 3个code unit/7字节；视图改父而副本不变；逐块乱码，decoder还原；URL往返正确，../拒绝，目录最终删除                                                     |
| [stream](./streams/README.md)                          | HWM=4，每块4字节，drain等待、finish、Transform错误和pipeline取消               | 三次write(false)/drain，消费12字节；失败源/转换/目标都destroyed；取消AbortError且两端销毁                                                             |
| [httpServer](./http/README.md)                         | HTTP协议及真实页面解析ack、拒绝、取消和读取流                                  | 合法200+匹配id/accepted；400/415/422/413分别验证；512字节接受、513拒绝；多字节与chunked也按累计字节限制；浏览器AbortError对应服务取消下游；流共24字节 |
| [parallelism](./parallelism/README.md)                 | Worker求和、transfer、Atomics、非法消息、silent超时与terminate；独立进程       | 求和1250025000；发送端buffer脱离，worker读42并ack；共享值1；非法mode/缺payload拒绝；超时监听清零，主动terminate；子PID不同且计算42                    |
| [memory / observability](./diagnostics/README.md)      | 有界Buffer缓存、清引用前后采样、有界忙循环与delay/ELU                          | 保留缓存4MiB且最多2项；clear后不要求external/RSS立即回落；实际采样延迟/ELU，结束histogram停用且marks=0                                                |
| [testing / native](./tooling/README.md)                | 真实Node Test Runner三个用例；V8 WASM实例化                                    | 配置边界、文件清理、HTTP状态/body/关闭全部通过；测试3通过0失败；已知WASM add返回42；没有编译native addon                                              |

上表在两个Node版本均运行成功，CLI每次以lab-complete和退出0结束。故意失败的对照被有针对性地断言接住；超时/取消不被包装成业务成功。Worker主动terminate可返回1，此值不等同于总入口失败。

当前版本的一次诊断观测约25.14ms忙循环、最大delay约29.34ms、ELU约0.339；只是该次采样，复测数值不同，不作为最低阈值或性能承诺。顶层timer/immediate跨多次运行也不固定排序，没有为其写固定顺序断言。

## HTTP、语言与静态检查

目录、本地JS、公共资源、health/slow/stream验证GET/HEAD、空HEAD body和MIME。未知404、方法错误405/Allow；echo验证Content-Type、无效JSON、非法结构、精确字节边界、多字节和chunked body。真实页面分别观察匹配ack、422/413拒绝、取消以及24字节响应流，无pageerror；不是用curl成功冒充浏览器处理成功。

默认5030与PORT=0实际启动，地址由监听结果生成。端口冲突、非法PORT及中文/换行非法值非0退出、无成功指南、CLI英文/ASCII。仅监听127.0.0.1。SIGINT停止服务后测试进程清理；不把这等同于生产编排器下全量优雅退出测试。

根tsconfig `tsc --noEmit`、新增源码ESLint、变更文件Prettier与相对链接/标题锚点检查；JS/TS fenced代码另作语法检查，不声称摘录含完整可执行上下文。

## 限制与复测

- 未覆盖Linux/Windows、其他Node大版本、生产压力、线程池饱和、cluster共享端口和第三方原生模块；Node22.18/22.23通过不等于所有后续版本永久保证。
- 未验证SIGKILL恢复、进程管理器摘流、真实数据库提交/取消和幂等重试；取消本地等待不证明远端业务未执行。
- 未抓heap snapshot、CPU profile或process report，未强制GC；RSS变化不独立证明泄漏，诊断实验不是性能基准。
- 路径检查只做词法边界，不防symlink/TOCTOU；未测试watch、断电持久性或Windows UNC。
- HTTP未覆盖TLS、HTTP/2、代理、安全认证和慢连接压力；自定义有界流只演示背压语义。
- WASM实际运行，但Node-API、node-gyp、prebuild与平台发布只作选型讲解，没有伪造编译结果。

手动复测可依各组README逐个运行，记录Node版本、事件、退出状态；HTTP按index.md依次点击五类实验。看到lab-failed应检查真实错误，不把任何失败都归为实验预期。字体、渲染和浏览器策略的相应验证应查阅 Browser 实验记录；CSS 笔记只提供规则与条件推导。
