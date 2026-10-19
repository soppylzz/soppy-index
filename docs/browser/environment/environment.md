# 环境信号与权限：接口存在以后，还要检查什么

`navigator.onLine` 为 true，为什么请求仍可能失败？能找到某个 API，为什么调用仍会被拒绝？环境状态、接口支持、安全上下文、用户激活和授权是不同条件，应逐项判断，不能用一个布尔值代替全部能力检查。

## 状态信号描述局部条件

`matchMedia()` 给出媒体条件的当前匹配状态，并在匹配结果变化时分发 change。只有 JavaScript 行为需要媒体条件时才应使用它；纯视觉布局通常交给 CSS。

```js
const query = window.matchMedia("(max-width: 700px)")
const controller = new AbortController()

console.log("Initial media match", query.matches)
query.addEventListener("change", (event) => console.log("Media match", event.matches), {
  signal: controller.signal,
})

// Call during the owning component's cleanup.
function disconnect() {
  controller.abort()
}
```

这里观察的是条件是否从匹配变为不匹配，或反过来，而非每次窗口尺寸变化都通知。组件重连时应重新读取当前状态，并建立新的监听生命周期。接口定义见 [CSSOM View：matchMedia](https://drafts.csswg.org/cssom-view/#dom-window-matchmedia)。

onLine 是浏览器估计的连接信号。局域网连接、代理或操作系统的联网判断，都不能证明某个目标服务当前可达。真实可用性仍要结合[请求结果与超时](../network/fetch.md)判断，不应仅凭信号值认定一次业务已经可执行或永久不可用。

## 支持、上下文、激活和授权分别判断

| 条件       | 回答的问题                           | 不能据此推断        |
| ---------- | ------------------------------------ | ------------------- |
| 特性检测   | 当前环境是否暴露目标接口             | 本次调用一定成功    |
| 安全上下文 | 当前上下文是否满足该类限制           | 用户已经授权        |
| 用户激活   | 是否满足本次调用的交互前提           | 所有 API 都允许调用 |
| 权限与策略 | 用户授权、嵌入策略等是否允许相应能力 | API 自身不会失败    |

安全上下文不等于地址字符串以 https 开头；本地可信地址也可能满足条件，应读取 `isSecureContext` 并结合目标 API 的要求判断。信任条件见 [Secure Contexts](https://w3c.github.io/webappsec-secure-contexts/)。

## 不要用统一权限表替代具体 API 的契约

Clipboard 的读取和写入可能有不同前提；Fullscreen、Web Share 通常涉及短暂用户激活；Geolocation、Notification 还涉及各自权限与运行规则。是否可在 iframe 中使用，也可能受顶层策略和委派条件影响，参见 [iframe 的能力边界](../iframe/iframe.md#2-sandboxpermissions-policy-与用户权限)。

能力检测应放在调用前，调用仍应捕获失败，并为拒绝、取消和不支持提供符合业务语义的处理。具体 API 的规则需分别查阅其官方文档，不能把接口存在当成已经获得授权。

## 实验只观测状态，不触发权限请求

`/files` 读取 secure、onLine 和媒体匹配状态，监听媒体及 online / offline 事件，断开后移除监听。浏览器宽度跨过 700px 时可比较真实 matchMedia change。

本实验不主动请求 Clipboard、Fullscreen、Share、Geolocation 或 Notification。原生文件 input 只提供所选文件的访问入口，不用于证明上述权限已被授予。这些片段说明 API 边界，不代表已完成权限流程或跨浏览器验证。
