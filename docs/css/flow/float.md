# 浮动与清除：先分清环绕、避让和父盒高度

浮动图片能让文字环绕，却可能不撑高父盒。文字可用空间与父盒自动高度是两套规则，clear 又处理后续块的放置，不能混称为“清除浮动”。

## Float 影响行盒，不是简单生成两列

```html
<article class="article">
  <div class="figure">Figure</div>
  <p class="text">
    Text wraps beside the figure. More words continue onto the next line and return to the full
    available width below it.
  </p>
  <div class="next">Next section</div>
</article>
```

```css
.article {
  width: 320px;
}
.figure {
  float: left;
  width: 90px;
  height: 80px;
  margin-right: 12px;
  background: #cde;
}
.text {
  margin: 0;
}
```

Figure 靠左放置，相关行盒在其外边距边缘外排列文字；浮动下方的行恢复可用宽度。Text 的块盒不必缩成一列，背景仍可能延伸到浮动背后。

因此要区分“行盒绕开”与“整个块盒避开”：后者需要独立上下文等约束，见 [BFC](./bfc.md)。

## 多个浮动如何放置，auto 宽度怎样求解

浮动受包含块、先前浮动与源顺序约束，尽量向指定侧、向高处放置；放不下则向下寻找位置。

将两个宽 90px、margin-right 为 12px 的 figure 依次放入宽 320px 的 article，可在同一高度排列；内容增多、可用宽度不足后，后续浮动可能移到下面。Float: right 改变靠边方向，不是把 DOM 顺序反转。

非替换浮动盒 auto 宽度通常收缩适配，部分 display 值还会块化；块化不代表重新进入普通流。规则见 [CSS 2.2 float](https://www.w3.org/TR/CSS22/visuren.html#float-position) 与[尺寸求解](../box/sizing.md)。

若同时设置 position: absolute 或 fixed，float 计算为 none，按定位方案处理；Flex/Grid 项目的 float 和 clear 也不按普通浮动布局改变项目排列。

## Clear 约束的是声明它的盒

在上例补上：

```css
.next {
  clear: both;
}
```

Next 必须避开相关先前浮动；需要时引入 clearance，使其上边框边缘不高于这些浮动的底部外边距边缘。已在浮动下方则不需要额外清除距离。

`clear: left/right/both` 分别关注左、右、两侧相关浮动，不取消已有 float。它受 BFC 归属限制，不清除任意上下文里的浮动。

给 article 自己设置 clear 不会自动包含内部浮动，它处理的是 article 相对外部相关浮动的位置。Clearance 也不等于 margin，会改变部分折叠条件，见 [CSS 2.2 clear](https://www.w3.org/TR/CSS22/visuren.html#flow-control)。

## 父盒只含浮动时，高度怎样计算

```html
<div class="frame">
  <div class="figure">Only a float</div>
</div>
```

```css
.frame {
  margin: 0;
  padding: 0;
  border: 0;
  background: #eee;
}
.figure {
  float: left;
  width: 90px;
  height: 80px;
  margin: 0;
}
```

`.frame` 是无其他内容与尺寸约束、未建立新 BFC 的普通块。自动内容高为 0，浮动仍可绘制；若只有少量普通流文字，父高也可能只包住文字而没包住更高的浮动。

给 frame 设置 flow-root 后，自动高度包含内部所属浮动，本例为 80px。浮动并未取消；若父盒明确设置固定高度，flow-root 也不保证让它自动增高。

## Clearfix 为什么也能让父盒包住浮动

另一种传统写法是在父盒末尾生成清除盒：

```css
.frame::after {
  content: "";
  display: block;
  clear: both;
}
```

生成的普通流块经 clear 放到浮动下方，使父盒自动高度延伸到那里。它没有要求父盒建立新 BFC，也不承诺修复所有父子 margin 折叠。

| 需求                 | 对应方式           | 机制                           |
| -------------------- | ------------------ | ------------------------------ |
| 让后续块位于浮动下方 | 后续块 clear       | 约束该盒的位置                 |
| 父盒包含内部浮动     | 父盒 flow-root     | 新上下文的自动高度计入内部浮动 |
| 维护已有 clearfix    | 末尾生成盒并 clear | 利用末尾流内盒的位置撑开父高   |

`overflow: hidden` 还会裁剪和建立滚动容器，不是无副作用替代。页面两栏通常用 Flex/Grid，float 更适合文字环绕和历史代码分析。
