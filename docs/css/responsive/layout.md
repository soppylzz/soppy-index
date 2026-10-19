# 响应式布局：先允许伸缩，再决定何时切换

一张卡片在窄屏放不下，不一定要新增断点。先排查固定宽度、内容下限和长文本，只有布局策略需要改变时再切换规则。

## 视口宽度是 CSS 布局条件

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

移动页面通常需要这个配置，使布局视口与设备可用宽度建立合适关系；不要禁止用户缩放。CSS 视口宽度与设备物理像素数不同，媒体查询也不等于检测手机品牌。

```css
.page {
  width: min(100% - 2rem, 70rem);
  margin-inline: auto;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: 1rem;
}
```

页面先限制最大阅读宽度，卡片再按自身最低空间自动分列。内层 min 避免极窄容器仍坚持 16rem；项目中的长词和图片也需要分别处理，自动分列不消除内容溢出。

## 当布局策略变化时使用媒体查询

```css
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}
@media (width >= 48rem) {
  .layout {
    grid-template-columns: 15rem minmax(0, 1fr);
  }
}
```

这是从单列增强到侧栏与正文的布局变化。48rem 是示例阈值，应该由内容何时放不下决定。`min-width`:48rem 是相应的传统条件写法；范围语法还能表达连续区间。

`and` 组合条件，逗号连接查询列表、表达“或”。条件成立只让规则成为候选，不提高 specificity，最终仍按层叠决定结果。Em/rem 在媒体查询中的字体参照基于初始字体值，不应拿作者设置的根字号直接反推断点。

## 断点之外的移动端问题

100vh 可能不等于当前可见高度，动态工具栏参照见[单位](../values/units.md)。安全区域可通过 `env(safe-area-inset-bottom, 0px)` 等参与留白，但要结合页面视口配置和真实设备检查，不能写死某个机型高度。

检查窄屏时还要放大文字、缩放页面、切换横屏和 RTL；只缩小开发工具窗口不能覆盖软键盘、地址栏和触摸输入。组件放在不同栏位时，更适合[容器查询](./container-queries.md)。

查询语法与字体参照见 [Media Queries 4](https://www.w3.org/TR/mediaqueries-4/)。
