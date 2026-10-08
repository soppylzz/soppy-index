# Web Components 与 Shadow DOM

[模块导航](./README.md) · [实验走查](./index.md) · [DOM 事件](../dom/domEvent.md)

## 1. 三种机制承担不同职责

| 机制            | 责任                   | 不能替代什么             |
| --------------- | ---------------------- | ------------------------ |
| Custom Elements | 注册标签与元素生命周期 | 应用级状态、路由与数据流 |
| Shadow DOM      | 建立封装子树与样式边界 | 页面脚本之间的安全隔离   |
| template / slot | 惰性模板与外部节点分发 | 数据绑定和自动业务更新   |

自定义元素名要满足规范，通常采用包含连字符的自主自定义标签，如 lab-counter。注册名在当前 registry 中不能重复定义，初始化前可 get 检查。本实验使用自主元素，未采用支持范围不同的 customized built-in elements。[自定义元素官方文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)

## 2. 生命周期与幂等连接

constructor 用于基础初始化、super 与建立内部结构；不要依赖此时已经拥有外部属性、子节点或文档连接。connectedCallback 可能运行多次，disconnectedCallback 也可能只是暂时移除，而非永久销毁。observedAttributes 声明要监听的属性，attributeChangedCallback 接收名称、旧值与新值；相关回调还可能在既有元素升级时发生。

`/components` 实验保持同一实例，挂载 / 移除、属性修改和重连可观察真实回调。下面摘取生命周期骨架；template 为固定可信模板，render / log 为教学辅助函数，省略 slot、自定义事件和实验控制。完整实现见 [lab.js](./assets/lab.js)。

```js
class Counter extends HTMLElement {
  static observedAttributes = ["value"]
  constructor() {
    super()
    this.attachShadow({ mode: "open" }).append(template.content.cloneNode(true))
  }
  connectedCallback() {
    this.connection?.abort()
    this.connection = new AbortController()
    this.shadowRoot
      .querySelector("button")
      .addEventListener(
        "click",
        () => this.setAttribute("value", String(Number(this.getAttribute("value") ?? 0) + 1)),
        { signal: this.connection.signal }
      )
  }
  disconnectedCallback() {
    this.connection?.abort()
  }
  attributeChangedCallback() {
    this.render()
  }
  render() {
    this.shadowRoot.querySelector("#value").textContent = this.getAttribute("value") ?? "0"
  }
}
customElements.define("lab-counter", Counter)
```

每次连接先清理旧监听，避免同一按钮一次点击执行多次。只用 property 赋值并不会自动触发 observedAttributes，除非组件自行实现反射 setter。复杂状态通常用 property，attribute 适合可序列化配置；转换、默认值和同步方向应由组件契约明确。

本组件在构造函数只克隆内部模板，外部 slot 节点在创建后追加。实际组件还要考虑升级前 property、异步操作取消、adoptedCallback、可访问性与表单关联，本实验未宣称覆盖这些完整能力。

## 3. 样式边界、open 与 closed

普通外部选择器不会穿透影子树；open 允许宿主的 shadowRoot 返回根，closed 让常规 getter 返回 null，持有引用的代码仍可操作。两者都不构成安全边界。继承属性与 CSS custom properties 可进入影子树；:host 匹配宿主，::part 暴露明确的内部样式入口。[Shadow DOM 官方说明](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)

实验将 `--counter-color` 传入组件，内部按钮标记 part="button"，外部用 ::part 设置圆角。读取封装按钮会看到 host.querySelector("button") 找不到内部按钮，但 host.shadowRoot.querySelector 可以找到。没有用 closed root 隐藏不可信代码。

## 4. slot 分发不搬迁节点

template.content 是 DocumentFragment，初始不直接渲染，克隆后再插入。slot 在组合后的呈现中接纳 light DOM 节点，节点的 parentNode 仍是宿主，组件可通过 assignedElements 读取分发结果。slotchange 反映分配变化，不能当作对所有内部文本变化的通用监听。

实验替换宿主的外部 span，记录实际 slotchange，同时验证 child.parentNode === host。DOM 移动与 fragment 插入细节见 [DOM 笔记](../dom/dom.md)。

## 5. 事件边界与组件契约

bubbles 控制沿路径冒泡，composed 控制跨 Shadow 边界，两者含义不同。要让内部自定义事件在普通外部祖先的冒泡监听器中可见，通常同时设置 true；不能将这句话扩展为“只有 bubbles=true 才能跨边界”，捕获和宿主目标阶段还有各自规则。[composed 官方说明](https://developer.mozilla.org/en-US/docs/Web/API/Event/composed)

```js
internalButton.dispatchEvent(
  new CustomEvent("demo-change", {
    detail: { value: 1 },
    bubbles: true,
    composed: true,
  })
)
```

这是实验内部事件的核心。外部看到 event.target 重定向为 lab-counter，currentTarget 是当前外部监听容器；open root 的 composedPath 可显示内部按钮和 ShadowRoot。closed root 对外路径可隐藏内部节点，不能据此认为传播路径始终完全可见。

原生 click 与上述自定义 demo-change 是两个事件。取消 composed 时，内部自定义事件仍被影子树监听器收到，外部 demo-change 监听器不会收到；原生点击自身的跨界行为不因此被修改。detail 不是自动深拷贝的消息，应约定只读数据和字段校验。

框架可以消费自定义元素，也可以用模板和事件系统实现普通组件。选型应根据表单、可访问性、SSR、水合、主题和框架互操作需求；本 demo 只验证浏览器基础机制。
