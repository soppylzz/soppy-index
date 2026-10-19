# CSS 性能与调试：从现象找到实际工作

“改 transform 一定不重绘”“复杂选择器一定慢”都不足以指导优化。先定位卡顿属于样式、布局、绘制还是合成，再缩小工作范围。

## 几种工作不是固定每次都全跑

| 工作     | 解决什么                       |
| -------- | ------------------------------ |
| 样式计算 | 匹配规则并求出元素需要的样式值 |
| 布局     | 根据约束计算盒的尺寸与位置     |
| 绘制     | 生成或更新绘制内容             |
| 合成     | 将适用图层等结果组合为画面     |

浏览器可复用与增量更新。布局不等于整页重绘，修改颜色通常也不需要重新求解所有几何。某次操作走哪些阶段，取决于页面依赖与实现。

## 读写交错为什么可能强制布局

```js
for (const card of cards) {
  card.style.width = `${container.offsetWidth}px`
}
```

`cards` 和 container 表示已有 DOM 引用。循环中写样式后，又读取可能受待处理布局影响的 offsetWidth，浏览器为了返回当前几何值可能同步结算；并非这个 API 每次调用都必然发生新 Layout。

```js
const width = container.offsetWidth
for (const card of cards) {
  card.style.width = `${width}px`
}
```

若所有项目确实都使用同一个、不会因本轮写入改变的容器宽度，可先读一次再批量写。若业务需要“改父宽后测子高”，提前读取会改变语义，不能为了批处理得到旧结果。

`requestAnimationFrame()` 只安排执行时机，不自动消除内部读写交错或强制布局。

## 动画与 will-change 的边界

`transform`/opacity 常有机会由合成处理，但不保证每个场景都不绘制或有独立图层。大面积模糊、混合、频繁变化的内容和过多图层仍可能昂贵。

`will-change` 是优化提示，还可能提前产生某些包含块或层叠副作用。应只在明确需要、接近变化时使用，并在适当时机撤销；给所有元素长期设置不构成优化证据。

## 如何排查一条不生效的规则

先看 Elements 中是否匹配和被覆盖，再看 computed value；接着检查属性是否适用于当前盒、尺寸参照是否确定、min/max 与内容下限是否介入。不能看到声明未划线就断言最终尺寸必须等于声明数字。

性能问题则录制同条件操作，查看实际 Style、Layout、Paint 和调用栈，比较修改前后的工作量。固定内容、窗口和输入，多次录制；不要用一次时间差宣称通用倍数。

操作方法见 [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance)，渲染机制衔接[浏览器渲染](../../browser/rendering/rendering.md)。
