# 堆叠上下文与 Top Layer

[本组导航](./README.md)

Stacking context 内部先排序，再作为整体参与父上下文排序。父 A z-index:1，父 B z-index:2 时，A 内的 9999 也不能越过 B。auto 和 0 不能混用：定位元素的 0 建新上下文，auto 通常不建。

常见触发条件包括定位 + 非 auto z-index、fixed/sticky、flex/grid item 非 auto z-index、opacity<1、transform、isolation:isolate 和适用 containment 等。规范与容器查询实现曾演进，不要仅凭 container-type 声明就把所有浏览器行为当作固定列表。

独立堆叠不代表独立 compositor layer。overflow 裁剪与 z-index 也是不同问题，提高层级不能穿透既定裁剪。Modal dialog 的 showModal()、显示的 popover 等进入 top layer，位于普通文档堆叠之上；普通高 z-index 无法覆盖它们。下面的示例只比较普通上下文。

## 样式示例与推导

```css
#low {
  position: relative;
  z-index: 1;
}
#high {
  position: absolute;
  z-index: 9999;
}
#peer {
  position: absolute;
  z-index: 2;
}
#layout.changed #low {
  z-index: 3;
}
```

假定 `#low` 与 `#peer` 同级、`#high` 是 `#low` 的子元素，且盒子重叠。先在 `#low` 内比较，`#high` 的 9999 让它位于该父盒内部较高处；再把整个 `#low` 作为一个单元与 `#peer` 比较：1 低于 2，所以 `#peer` 仍盖在上面。把 `#low` 提到 3，内部元素才跟着整体上移。

参阅 [CSS 2.2 层叠绘制](https://www.w3.org/TR/CSS22/zindex.html) 和 [HTML top layer](https://html.spec.whatwg.org/multipage/interaction.html#top-layer)。
