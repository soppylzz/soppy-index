# DOM、样式读取与事件

先理解节点树和对象状态，再理解事件如何沿路径分发，最后区分布局尺寸与视觉矩形。本模块提供知识说明和 API 片段，不需要启动 demo。

- [DOM 基础](./dom.md)：节点与集合、插入与复制、attribute / property、文本与 HTML。
- [DOM 事件](./dom-events.md)：传播阶段、默认行为、委托、监听清理与脚本派发。
- [样式与几何读取](./geometry.md)：CSSOM、尺寸与坐标、transform 和读写分组。

## 面试常考点

| 问题 | 应解释的机制 |
| --- | --- |
| NodeList 都是静态的吗？ | querySelectorAll 的集合静态，childNodes 动态；静态集合也不冻结节点 |
| attribute 和 property 为什么可能不一致？ | 标记默认值与当前状态不同，反射规则取决于具体属性 |
| fragment 插入后为什么为空？ | 插入的是其子节点，fragment 不成为额外包装元素 |
| 停止冒泡能取消链接跳转吗？ | 传播与默认行为独立，取消默认行为还受 cancelable / passive 限制 |
| 委托为什么要 closest 和容器检查？ | target 可能是内部节点，还要防止命中超出当前业务范围的祖先 |
| 元素变大为什么 offsetWidth 不变？ | 布局尺寸与经过 transform 的视觉矩形不同 |
| rAF 中读取尺寸就不会重排吗？ | 是否同步结算取决于失效状态和读取需求，rAF 不自动解决读写交错 |

[Vue invoker 补充](./supplement/vue-event-invoker.md)讨论固定版本框架如何在一个原生监听中调度多个处理函数，适合掌握原生传播规则后阅读。
