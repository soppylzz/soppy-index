# 教程目录：从页面机制到工程决策

第一次学习时，先建立“输入怎样变成结果”的主线，再用实验核对。复习时可以直接选择专题；同一机制的完整说明放在对应专题，实验说明只负责运行、观察与证据边界。

建议顺序是 CSS 的值与布局 → DOM、渲染与事件循环 → 请求、存储和导航 → 网络与安全 → 工程交付。Node.js 可以在理解 JavaScript 异步之后独立学习；Chromium 实现文档放在 Web 平台机制之后阅读。面试推演用于检验理解，不能代替基础章节。

<a id="css"></a>

## CSS：先求值，再布局，最后处理视觉变化

先解释声明为什么生效，再解释盒子如何获得尺寸。Flex/Grid、定位和动画分别改变不同约束，不必一开始记住所有属性。

1. 声明与取值：[属性和值](css/properties/type.md) → [值处理阶段](css/properties/processing.md) → [层叠](css/properties/cascade.md) → [继承与回退](css/properties/defaulting.md) → [自定义属性](css/properties/custom-properties.md)。
2. 匹配目标：[选择器](css/selector/matching.md)、[伪类](css/selector/pseudo-classes.md)、[伪元素](css/selector/pseudo-elements.md)。
3. 盒子与空间：[盒模型](css/box/box-model.md)、[display](css/box/display.md)、[包含块](css/box/containing-block.md)、[自动尺寸](css/box/sizing.md)、[溢出](css/box/overflow.md)、[单位](css/values/units.md)、[逻辑方向](css/values/logical-directions.md)。
4. 普通流：[排列](css/flow/normal-flow.md)、[浮动](css/flow/float.md)、[BFC](css/flow/bfc.md)、[外边距折叠](css/flow/margin-collapse.md)。
5. 布局模型：[Flex 模型](css/flex/model.md)、[弹性尺寸](css/flex/sizing.md)、[对齐](css/flex/alignment.md)；[Grid 模型](css/grid/model.md)、[轨道尺寸](css/grid/tracks.md)、[放置](css/grid/placement.md)；[表格](css/layout/tables.md)、[多列与分页](css/layout/fragmentation.md)。
6. 定位与滚动：[定位模型](css/position/model.md)、[absolute/fixed](css/position/absolute-fixed.md)、[sticky](css/position/sticky.md)、[滚动行为](css/scroll/behavior.md)、[滚动吸附](css/scroll/snap.md)。
7. 文本与内容：[行内格式化](css/text/inline-formatting.md)、[字体](css/text/fonts.md)、[换行](css/text/wrapping.md)、[替换元素](css/text/replaced-elements.md)、[列表与计数器](css/generated/lists-counters.md)。
8. 视觉效果：[颜色](css/effects/colors.md)、[背景](css/effects/backgrounds.md)、[堆叠](css/effects/stacking.md)、[transform](css/effects/transforms.md)、[transition](css/effects/transitions.md)、[animation](css/effects/animations.md)、[合成条件](css/effects/compositing.md)。
9. 响应与工程：[响应式](css/responsive/layout.md)、[容器查询](css/responsive/container-queries.md)、[用户偏好](css/responsive/preferences.md)、[组织方式](css/engineering/organization.md)、[作用域与嵌套](css/engineering/scope-nesting.md)、[containment](css/engineering/containment.md)、[性能](css/engineering/performance.md)、[可访问性](css/engineering/accessibility.md)、[兼容性](css/engineering/compatibility.md)。

基础读通后，用[综合布局题](css/patterns/layout-problems.md)和[属性推演](css/properties/ask.md)复习。进阶增强包括[锚点定位](css/advanced/anchor-positioning.md)、[滚动驱动动画](css/advanced/scroll-animations.md)、[视图过渡](css/advanced/view-transitions.md)，使用前分别检测能力。

<a id="browser"></a>

## 浏览器：把 DOM、任务和资源连接起来

| 主线 | 专题 | 实验或补充 |
| --- | --- | --- |
| 修改文档 | [DOM](browser/dom/dom.md)、[几何读取](browser/dom/geometry.md)、[事件传播](browser/dom/dom-events.md) | [Vue 事件 invoker](browser/dom/supplement/vue-event-invoker.md) |
| 显示与执行 | [渲染](browser/rendering/rendering.md)、[事件循环](browser/event-loop/event-loop.md)、[调度与让步](browser/event-loop/scheduling.md) | [调度模型模拟器](browser/event-loop/supplement/simulator.md) |
| 发现与加载 | [script 模式](browser/loading/script-loading.md)、[资源提示](browser/loading/resource-hints.md) | [加载实验](browser/loading/experiment.md) |
| 页面与历史 | [生命周期](browser/lifecycle/page-lifecycle.md)、[BFCache](browser/lifecycle/bfcache.md)、[History](browser/navigation/history.md) | [生命周期实验](browser/lifecycle/experiment.md)、[导航实验](browser/navigation/experiment.md) |
| 请求与数据 | [URL](browser/network/url.md)、[Fetch](browser/network/fetch.md)、[FormData](browser/network/form-data.md)、[文件](browser/files/files.md) | [HTTP 缓存](browser/cache/http-cache.md)、[缓存实验](browser/cache/experiment.md) |
| 跨上下文 | [通信协议](browser/communication/cross-context-communication.md)、[结构化克隆](browser/communication/structured-clone.md)、[iframe](browser/iframe/iframe.md) | [Web Components](browser/web-components/web-components.md)、[环境能力](browser/environment/environment.md) |
| 变化通知 | [Observer 机制](browser/observer/observer.md) | [Observer 实验](browser/observer/index.md) |

存储按共享范围、数据模型与提交边界选择：[Cookie](browser/storage/cookie/cookie.md)与[实验](browser/storage/cookie/index.md)；[Web Storage](browser/storage/webStorage/webStorage.md)与[双标签实验](browser/storage/webStorage/index.md)；[IndexedDB](browser/storage/indexedDB/indexedDB.md)与[事务实验](browser/storage/indexedDB/index.md)；[配额、持久化与 OPFS](browser/storage/storageManagement/storageManagement.md)与[实验](browser/storage/storageManagement/index.md)。

PWA 将请求拦截、脚本缓存与安装描述分开：[Service Worker](browser/pwa/serviceWorker.md)、[Cache Storage](browser/pwa/cacheStorage.md)、[Web App Manifest](browser/pwa/webAppManifest.md)。它们与 HTTP 缓存、BFCache 的对象和生命周期不同。

<a id="node"></a>

## Node.js：异步资源与进程边界

各组 `index.md` 提供运行与观察步骤，专题解释机制。按以下顺序阅读；CLI 总入口为 [run.ts](node/run.ts)，HTTP 实验使用单独的 Next.js 工作区。

1. [运行时与进程](node/runtime/index.md)：V8、libuv、系统资源和退出。
2. [模块与包](node/modules/index.md)：CJS/ESM 身份、条件入口和 TypeScript 擦除。
3. [事件循环](node/event-loop/index.md)：先固定入口格式与回调注册位置，再推导顺序。
4. [异步组合与上下文](node/async/index.md)、[事件通知](node/events/index.md)：容量、取消、关联信息和退订。
5. [字节与文件](node/files/index.md)、[流与背压](node/streams/index.md)：从编码到资源清理。
6. [HTTP 请求与确认](node/http/index.md)：请求体限制、响应流与取消。
7. [Worker 与进程](node/parallelism/index.md)、[内存与性能](node/diagnostics/index.md)：隔离、共享与诊断。
8. [内置测试](node/testing/index.md)、[WASM 与原生扩展](node/extensions/index.md)：验证边界与进阶取舍。

<a id="security"></a>

## 安全：先建立信任边界，再讨论攻击与协议

先问输入来自谁、凭据由谁附带、服务端在哪校验。协议和 demo 不能代替完整安全设计。

- 基础：[信任边界](security/foundations/trust-boundaries.md)、[同源与 CORS](security/foundations/origin-cors.md)。
- 浏览器攻击：[XSS](security/attacks/xss.md)、[CSRF](security/attacks/csrf.md)、[点击劫持](security/attacks/clickjacking.md)、[DOM Clobbering](security/attacks/dom-clobbering.md)。
- 身份：[会话](security/identity/session.md)、[密码](security/identity/passwords.md)、[JWT](security/identity/jwt.md)、[授权](security/identity/authorization.md)。
- OAuth/OIDC 主线：[协议角色](security/oauth/protocols.md)、[生命周期](security/oauth/architecture-lifecycle.md)、[Web 登录](security/oauth/web-oidc.md)、[SPA 与 PKCE](security/oauth/spa-pkce.md)、[Token 状态](security/oauth/token-state.md)、[发现与密钥](security/oauth/discovery-keys.md)。
- 协议进阶：[设备授权](security/oauth/device-authorization.md)、[客户端凭据](security/oauth/client-credentials.md)、[增强保护](security/oauth/advanced-protection.md)、[错误诊断](security/oauth/errors.md)。
- 工程边界：[安全响应头](security/engineering/headers.md)、[URL 与 SSRF](security/engineering/urls-ssrf.md)、[上传](security/engineering/uploads.md)、[实时通信](security/engineering/realtime.md)、[供应链](security/engineering/supply-chain.md)、[验证与响应](security/engineering/testing-response.md)。

操作入口见[安全实验运行说明](security/demo/README.md)，逐步观察见[实验走查](security/demo/index.md)，历史验证条件单列在[验证记录](security/demo/validation.md)。

## 协议、工程与实现选读

[网络目录](network/README.md)按地址、传输、HTTP、交付与实时通信建立链路；[工程目录](engineering/README.md)把构建、架构、性能和监控连到交付决策。已有 Web 平台模型后，再读 [Chromium 索引](chromium/README.md)与[学习路线](chromium/learning-path.md)，区分规范保证、固定版本实现和本机观测。
