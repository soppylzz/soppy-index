# 伪元素：选中元素的一部分或生成的内容

伪类筛选元素，伪元素描述元素的特定部分或生成内容；它们不一定对应 DOM 节点。

## 按目标区分状态与特定部分

| 选择器           | 描述什么                       |
| ---------------- | ------------------------------ |
| .message:hover   | 处于 hover 状态的 message 元素 |
| .message::before | message 关联的前置生成内容     |
| p::first-line    | 段落的第一个格式化行           |
| p::first-letter  | 符合条件的首字母部分           |
| li::marker       | 列表项的标记                   |
| ::selection      | 被用户选中的部分               |

伪元素使用双冒号；:before、:after 等历史写法仍兼容，并非所有伪元素都支持单冒号。

First-line 取排版后的首行，随宽度和换行变化；marker、selection 等只支持各自规定的属性。

## Before 和 after 生成内容，但不插入 DOM 子元素

```html
<p class="message">Saved successfully.</p>
```

```css
.message::before {
  content: "";
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 8px;
  border-radius: 50%;
  background: teal;
}
```

空 content 字符串也能生成圆点，none 则不生成伪元素。Before/after 的排版仍由 display、position 等控制，不自动成为覆盖层。

前后指生成位置，不固定等于屏幕左右，也不保证绘制在最上层。规则见 [CSS Pseudo-Elements 4](https://www.w3.org/TR/css-pseudo-4/#generated-content)。

圆点不增加 DOM 子节点，querySelector 不能取得它；可用 `getComputedStyle(element, "::before")` 读取样式。

## 状态条件属于哪个目标

```css
.message:hover::before {
  background: royalblue;
}
```

条件是 message 悬停，不要求指针只落在圆点上。需要独立焦点或交互语义时，应使用真实 HTML 元素。

Img 等替换元素不能按普通容器推断 before/after。图片角标可放在包裹图片的容器上。

## 装饰与关键信息要分开

生成内容适合装饰；重要提示、按钮名称等写进 HTML，以保留可靠的语义与文本行为。无 DOM 节点不代表辅助技术一定忽略它。伪元素的声明仍按普通层叠规则竞争。
