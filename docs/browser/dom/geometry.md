# DOM 样式与几何：读取的是哪一种尺寸

给元素加上 scale(1.2) 后，为什么 offsetWidth 不变，getBoundingClientRect().width 却变大？前者读取忽略变换的布局盒尺寸，后者读取经过变换后的视口矩形。选 API 前，先确定需要布局大小、视觉位置还是滚动范围。

## 先区分样式声明与解析值

DOM 描述节点，CSSOM 提供样式表和声明等接口，CSSOM View 定义几何与滚动读取。节点存在，不代表一定产生布局盒。

element.style 只反映行内声明；样式表设置的 width 不会因此出现在 style.width。getComputedStyle 返回只读的 resolved value 视图，多数属性返回计算值，部分布局相关属性在满足条件时返回使用值，不等于原始 CSS 文本或屏幕最终像素。[CSSOM resolved value](https://drafts.csswg.org/cssom/#resolved-values)

下面将固定样式表与元素插入页面，再比较行内声明和解析值：

```js
const style = document.createElement("style")
style.textContent = ".geometry-example { width: 200px; }"
const box = document.createElement("div")
box.className = "geometry-example"
document.head.append(style)
document.body.append(box)
console.log(box.style.width) // ""
console.log(getComputedStyle(box).width) // "200px"
box.remove()
style.remove()
```

## 按尺寸范围与坐标系选择接口

| 接口 | 读取内容 | 关键边界 |
| --- | --- | --- |
| offsetWidth / offsetHeight | 相关布局分片的轴对齐 border-box 包围尺寸 | 整数 CSS 像素，忽略元素及祖先 transform；无布局盒时为 0 |
| offsetTop / offsetLeft | 相对 offsetParent 的位置 | 使用历史 offset 模型，忽略 transform，不是视口坐标 |
| clientWidth / clientHeight | padding 盒内部可用尺寸 | 整数，排除边框和占位滚动条；根元素等有视口特例 |
| clientTop / clientLeft | 对应方向边框及可能位于该侧的滚动条尺寸 | 不是元素相对父级的位置 |
| scrollWidth / scrollHeight | 完整滚动区域尺寸 | 整数，可能大于 client 尺寸，也可能受伪元素影响 |
| scrollTop / scrollLeft | 滚动位置 | 可有小数，特殊布局下可能为负；也可赋值请求滚动 |
| getClientRects() | 各布局分片的矩形 | 视口坐标，反映 transform；多行 inline 可有多个矩形 |
| getBoundingClientRect() | client rect 的轴对齐包围矩形 | 可有小数，相对视口，反映 transform 与滚动 |

普通 inline box 的 clientWidth / clientHeight / clientTop / clientLeft 为 0。根元素、quirks mode 的 body、多分片及空盒有特定规则；getBoundingClientRect 计算范围时会处理空盒，不能将所有元素都套成一个普通 div。完整定义见 [CSSOM View](https://drafts.csswg.org/cssom-view/)。

rect.left / top 加页面 scrollX / scrollY，可换算常见文档坐标，但不是嵌套滚动容器和复杂变换的通用局部坐标公式。返回的 DOMRect 是当前快照，不会随元素继续变化。

## 用变换区分布局盒和视觉矩形

```js
const box = document.createElement("div")
box.style.cssText = `
  box-sizing: content-box;
  width: 200px;
  height: 40px;
  padding: 10px;
  border: 3px solid;
  transform: scale(1.2);
`
document.body.append(box)
console.log(box.offsetWidth) // 226
console.log(box.getBoundingClientRect().width) // Approximately 271.2
box.remove()
```

这里布局宽度为 200 + 20 + 6 = 226 CSS 像素，视觉矩形宽度约为 226 × 1.2。transform 没有把布局宽度改为 271.2；测量结果也不是设备物理像素。旋转后的包围矩形还可能同时受宽、高影响。

## 为什么读写交错可能迫使布局提前执行

修改样式后，浏览器可能先记录失效，稍后统一更新。若这时读取需要最新几何的属性，可能必须同步完成样式或布局；这取决于失效状态和所读属性，不是所有读取都必定触发重排。[渲染中的同步布局](../rendering/rendering.md#读取是否一定触发同步布局)

假设 nodes 是一组具有布局盒的元素，逐个读取宽度后立即写入，后一个元素的读取可能遇到前一次写入导致的失效。可先集中读取，再集中写入：

```js
function widenElements(nodes) {
  const widths = nodes.map((node) => node.getBoundingClientRect().width)
  nodes.forEach((node, index) => {
    node.style.width = `${widths[index] + 1}px`
  })
}
```

此片段要求 nodes 是数组，元素采用 border-box 且没有影响宽度测量的 transform，才能把测得的宽度直接作为 CSS width 基准。实际业务应按盒模型选测量值，不能把“分组读写”和“尺寸计算正确”混为一谈。

分组减少反复强制刷新的机会，不保证固定性能倍数；放进 requestAnimationFrame 也不会自动消除同步布局。确认调用来源和布局次数应查看 Performance trace，不能用一段循环耗时反推重排次数。持续监听尺寸变化可考虑 [ResizeObserver](../observer/observer.md)，而不是每帧读取所有节点。
