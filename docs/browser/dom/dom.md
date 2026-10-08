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

这些接口由 [CSSOM View](https://drafts.csswg.org/cssom-view/) 定义。使用时先判断需要布局尺寸、视口矩形还是滚动状态，再选择接口：

| 读取                    | 主要内容                                            | 坐标 / 精度与边界                                                                              |
| ----------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| offsetWidth / Height    | 相关 fragment 的轴对齐 border-box 包围尺寸          | 整数 CSS 像素，忽略元素及祖先的 transform；无布局盒时为 0                                      |
| offsetTop / Left        | border edge 相对 offsetParent padding edge 的位置   | 历史 offset 模型，忽略 transform，不是视口坐标                                                 |
| clientWidth / Height    | padding 盒内部可用尺寸，排除边框和占位滚动条        | 整数；普通 inline box 为 0，根元素及 quirks mode 的 body 有视口特例                            |
| clientTop / Left        | 对应方向的边框及位于边框与 padding 之间的滚动条尺寸 | 普通 inline box 为 0，不是元素相对父级的位置                                                   |
| scrollWidth / Height    | scrolling area 的完整尺寸                           | 整数，可大于 client 尺寸，可能包含伪元素贡献                                                   |
| scrollTop / Left        | 当前滚动位置                                        | 可有小数；设置它们请求滚动，不代表完整渲染流水线重跑                                           |
| getClientRects()        | 各 fragment 的矩形集合                              | 视口坐标，反映 transform；多行 inline 可以有多个矩形                                           |
| getBoundingClientRect() | client rect 的轴对齐包围矩形                        | 可有小数，left/top 相对视口，反映 transform 和滚动；计算包围范围时忽略空盒，全部为空时另有规则 |

rect 加页面 scrollX / scrollY 可换算常见文档坐标，但不能将其当作所有嵌套容器和复杂变换的局部坐标公式。getBoundingClientRect 返回当前矩形快照，不是后续自动变化的 live 尺寸对象。[getBoundingClientRect 文档](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)

`/layout` 的元素固定 content 宽 200px，左右 padding 各 10px，左右 border 各 3px；布局 offsetWidth 为 226，scale(1.2) 后视觉 rect 约为 271.2，布局宽度保持不变。clientWidth 的具体值还受滚动条策略影响，不将某台系统的值写成通用保证。

```js
const rect = box.getBoundingClientRect()
log(`offset=${box.offsetWidth} client=${box.clientWidth} scroll=${box.scrollWidth}`)
log(`rect=${rect.width} left=${rect.left} scrollY=${window.scrollY}`)
```

该片段依赖实验的 box 与 log；完整按钮还显示变换前后对照。[lab.js](./assets/lab.js) 的 `layout()` 在 `metrics()` 中统一读取指标，transform 按钮只切换 scale 再读取，所以能比较同一元素的布局尺寸与视觉矩形。它未覆盖表中所有分片、根元素及 offsetParent 特例，已测范围见 [走查](./index.md)。尺寸变化的持续观察应考虑 [ResizeObserver](../observer/observer.md)，而不是每帧反复读取所有元素。

## 5. CSSOM、强制布局与读写分组

CSSOM 提供样式访问接口。element.style 只反映行内声明；样式表设置的 width 不会因此出现在 style.width。getComputedStyle 提供只读的 resolved value 视图：多数属性返回 computed value，部分布局相关属性在元素生成盒等条件下返回 used value，因此不是原样 CSS 文本，也不是屏幕最终像素。[CSSOM resolved value](https://drafts.csswg.org/cssom/#resolved-values)、[getComputedStyle 文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)

`/layout` 的样式按钮读取同一 box 的行内与解析值：初始 width 来自样式表，所以 style.width 为空，getComputedStyle(box).width 为 200px。读取是否需要同步结算取决于当前失效状态及所读属性，原理见 [渲染流程](../core/rendering.md#读取是否一定触发同步布局)。下面关注代码如何分组读写：

```js
const widths = nodes.map((node) => node.offsetWidth)
nodes.forEach((node, index) => {
  node.style.width = `${widths[index] + 1}px`
})
```

这是 [lab.js](./assets/lab.js) 中 `layout()` 的 `benchmark(batch)` 的 batch 分支，先读完再写入。interleave 分支则逐节点读取 offsetWidth 后立即写 width。两者都构造 200 个初始宽度为 100px 的节点，最终写为 101px；节点离屏但未 display:none，仍具有布局盒。

源码在计时前用 root.offsetHeight 结算初始布局，计时包含循环和最后一个节点的 offsetWidth 读取，结束后移除节点。片段省略了这些准备与收尾，不能仅比较循环代码就解释完整耗时。读写分组可减少被迫刷新机会，但不保证固定性能倍数；rAF 也不自动免除同步布局。

耗时受热身、机器负载、布局范围、DevTools 和浏览器优化影响。实验只报告实际 performance.now 差值；判断同步 Layout 次数和调用来源，应另录 Performance trace，不能把耗时直接当作重排次数。实际已测范围与未测项见 [走查](./index.md)。
