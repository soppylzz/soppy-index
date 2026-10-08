# DOM 与 CSSOM：结构、状态和几何

[模块导航](./README.md) · [实验走查](./index.md) · [事件机制](./domEvent.md)

## 1. 节点树与查询结果

DOM 将文档表示为 Node 树；Document、Element、Text、Comment 等承担不同职责。Element 是 Node 的一种，childNodes 包括文本与注释，children 只含元素。HTML 的空白也可能成为文本节点，不能把 firstChild 永远当作首个元素。attribute 表示元素的命名属性，不属于该元素的普通子节点列表。[DOM 官方介绍](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)

CSSOM 表示样式表、声明及相关接口；DOM 节点存在并不代表一定产生布局盒。样式、布局、绘制如何衔接见 [渲染流程](../core/rendering.md)。

| 查询                             | 返回 / 特性               | 注意                                   |
| -------------------------------- | ------------------------- | -------------------------------------- |
| getElementById                   | 单个元素或 null           | ID 按字符串匹配                        |
| querySelector                    | CSS 选择器首个匹配或 null | 无效选择器会抛 SyntaxError             |
| querySelectorAll                 | static NodeList           | 集合成员是查询时的快照，不冻结节点自身 |
| getElementsByClassName / TagName | live HTMLCollection       | 随树变化更新，修改时按索引遍历易漏项   |

NodeList 并不天然是静态的，例如 childNodes 是 live；HTMLCollection 与 Array 也不能直接等同。需要边遍历边删除时，可先 Array.from 转为稳定成员数组。[querySelectorAll 文档](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll)、[HTMLCollection 文档](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection)

`/tree` 进入时保留两个集合；如下是核心对照，省略日志函数、按钮和清理，完整实现见 [lab.js](./assets/lab.js)。

```js
const fixed = list.querySelectorAll(".item")
const live = list.getElementsByClassName("item")
const item = document.createElement("li")
item.className = "item"
list.append(item)
log(`static=${fixed.length} live=${live.length}`)
```

static 只表示成员集合不随后续查询条件变化而自动重算；其中旧元素的 textContent、属性仍可改变。

## 2. attribute 与 property：默认值和当前值

attribute 是标记 / 序列化层的名称和值，property 是对象接口上的状态，二者是否反射取决于具体属性，不能用一句“完全同步”概括。布尔 attribute 按存在与否表示真，disabled="false" 仍表示存在。

输入框 value attribute 对应默认值，defaultValue 反射它；value property 表示当前输入值。初始时两者可能一致，用户输入或 property 赋值使当前值进入 dirty 状态后，再更新 attribute 不必改写当前 value；form.reset 会恢复默认值。[defaultValue 文档](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/defaultValue)

实验按顺序设置 property、attribute，再 reset，片段如下：

```js
input.value = "当前 property"
input.setAttribute("value", "新的默认值")
log(`${input.getAttribute("value")} / ${input.defaultValue} / ${input.value}`)
input.form.reset()
```

这段依赖 input 已在 form 中。checked / defaultChecked 也有当前状态与默认状态之别，但不能将所有 property 都归纳成相同 dirty 规则。

## 3. 文本、HTML 与批量组织

| API         | 读写含义                 | 边界                                         |
| ----------- | ------------------------ | -------------------------------------------- |
| textContent | 节点文本；赋值替换子内容 | 不把字符串解析成 HTML                        |
| innerHTML   | 解析 / 序列化 HTML       | 不可信输入需要可信的清洗与策略，不能直接插入 |
| innerText   | 近似呈现出来的文本       | 受样式、换行影响，读取可能需要更新布局       |

innerText 不是对所有节点和显示状态都等价的“去掉 hidden 版 textContent”；未渲染节点还有特定读取行为。实验使用正在渲染的容器，并明确加入 hidden 子节点进行对照。[innerText 文档](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/innerText)

`/tree` 让用户字符串走 textContent，仅让固定可信标记走 innerHTML，便于比较解析结果而不制造输入注入入口。主日志始终采用 textContent。

DocumentFragment 用于临时组织节点，插入文档时移动其子节点，fragment 自身不会变成树中的包装元素，插入后通常为空。template.content 是惰性模板 fragment，cloneNode(true) 复制结构，不自动复制 addEventListener 注册的监听器。

```js
const fragment = document.createDocumentFragment()
fragment.append(document.querySelector("#template").content.cloneNode(true))
const node = fragment.firstElementChild
list.append(fragment)
log(`fragment=${fragment.childNodes.length} parent=${node.parentNode.id}`)
```

这是 `/tree` 的插入路径。fragment 与 template 有助于组织代码，不保证所有场景必然更快；浏览器优化、节点规模和工作方式都影响结果。DOM 变化记录见 [MutationObserver](../observer/observer.md)，组件模板与 slot 见 [Web Components](../api/webComponents.md)。

## 4. 几何读取：布局尺寸与视觉矩形

| 读取                  | 典型含义                                     | 坐标 / 精度                       |
| --------------------- | -------------------------------------------- | --------------------------------- |
| offsetWidth / Height  | 布局边框盒尺寸，包括可能占空间的滚动条       | 通常为整数；不体现 transform 放大 |
| clientWidth / Height  | padding 盒内部可用尺寸，排除边框和占位滚动条 | 整数；根元素等有特殊规则          |
| scrollWidth / Height  | 内容所需滚动范围，包括超出可视区域部分       | 整数，可能包含伪元素贡献          |
| getBoundingClientRect | 视觉边框盒包围矩形，体现 transform           | 可有小数，left/top 相对视口       |

rect 加页面 scrollX / scrollY 可换算常见文档坐标，但不能将其当作所有嵌套容器和复杂变换的局部坐标公式。getBoundingClientRect 返回当前矩形快照，不是后续自动变化的 live 尺寸对象。[getBoundingClientRect 文档](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)

`/layout` 的元素固定 content 宽 200px，左右 padding 各 10px，左右 border 各 3px；布局 offsetWidth 为 226，scale(1.2) 后视觉 rect 约为 271.2，布局宽度保持不变。clientWidth 的具体值还受滚动条策略影响，不将某台系统的值写成通用保证。

```js
const rect = box.getBoundingClientRect()
log(`offset=${box.offsetWidth} client=${box.clientWidth} scroll=${box.scrollWidth}`)
log(`rect=${rect.width} left=${rect.left} scrollY=${window.scrollY}`)
```

该片段依赖实验的 box 与 log；完整按钮还显示变换前后对照。尺寸变化的持续观察应考虑 [ResizeObserver](../observer/observer.md)，而不是每帧反复读取所有元素。

## 5. CSSOM、强制布局与读写分组

element.style 只反映行内声明；样式表设置的 width 不会因此出现在 style.width。getComputedStyle 提供解析后的样式值，某些属性和条件可能需要样式甚至布局更新，不能把每次读取都说成必然重排。[getComputedStyle 文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)

布局失效后立即读取 offset、rect 等几何值，浏览器可能被迫先完成待处理的样式 / 布局工作。交错读写将这种同步结算反复插入循环；分组可减少被迫刷新机会，但不保证帧率或固定性能倍数。rAF 也不自动免除读写导致的布局。

```js
const widths = nodes.map((node) => node.offsetWidth)
nodes.forEach((node, index) => {
  node.style.width = `${widths[index] + 1}px`
})
```

这是 `/layout` 的 batch 分支，省略节点构造、初始布局结算、最后一次读取和耗时统计。interleave 分支对相同的 200 个节点逐个读取再写入；两者最终都写为 101px。节点离屏但未 display:none，仍具有布局盒。

耗时受热身、机器负载、布局范围、DevTools 和浏览器优化影响。实验只报告实际 performance.now 差值；判断同步 Layout 次数和调用来源，应另录 Performance trace，不能把耗时直接当作重排次数。实际已测范围与未测项见 [走查](./index.md)。
