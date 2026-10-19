# View Transitions：为一次视图更新连接前后画面

关键帧改变一组属性，View Transitions 则围绕一次 DOM 更新捕获前后状态，再通过过渡伪元素连接画面。业务更新本身不应该依赖动效成功。

## 先理解一次同文档更新

1. 捕获旧视图。
2. 执行更新回调，改变实际 DOM。
3. 捕获新视图并创建过渡伪元素。
4. 对前后画面执行视觉过渡，再清理临时结构。

实际 DOM 更新与过渡动画有不同完成点。它不是保留两个完整可交互页面让用户同时操作。

## 不支持时直接完成更新

```html
<button id="toggle" aria-controls="details" aria-expanded="false">Toggle details</button>
<p id="details" hidden>Additional information</p>
```

```js
const button = document.querySelector("#toggle")
const details = document.querySelector("#details")

button.addEventListener("click", () => {
  const update = () => {
    details.hidden = !details.hidden
    button.setAttribute("aria-expanded", String(!details.hidden))
  }
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!document.startViewTransition || reduceMotion) {
    update()
    return
  }
  const transition = document.startViewTransition(update)
  transition.ready.catch((error) => {
    console.warn("View transition was skipped:", error)
  })
  transition.updateCallbackDone.catch((error) => {
    console.error("View update failed:", error)
  })
})
```

示例脚本应在上述 DOM 创建后运行。`update()` 即使没有过渡能力也能切换内容；动画准备失败与 DOM 更新失败分别记录，不重复执行回调来“补救”，以免状态切换两次。

## 名称负责连接前后对应元素

```css
#details {
  view-transition-name: details;
}
::view-transition-old(details),
::view-transition-new(details) {
  animation-duration: 180ms;
}
```

默认根视图可产生整体过渡；指定名称可让相应元素独立连接。参与同次捕获的名称需要满足唯一性等规则，否则过渡可能跳过。没有前态或后态的元素也要按进入/退出处理。

## 三个 Promise 的含义

`updateCallbackDone` 表示更新回调完成；`ready` 表示过渡伪元素已准备好、即将开始动画；`finished` 表示最终状态已可见可交互。跳过动画不必意味着业务更新失败，回调错误则需要真正处理。

这项机制不代替路由、数据加载、焦点恢复或可访问状态。跨文档过渡另有启用条件与导航限制，不能从同文档 API 推断支持情况。

本篇使用 [CSS View Transitions 1](https://www.w3.org/TR/css-view-transitions-1/) 的同文档模型，增强能力应分别检测并保留直接更新路径。
