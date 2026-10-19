# 锚点定位：让浮层跟随另一个元素

绝对定位依赖包含块，提示框却常想跟随某个按钮。锚点定位把“参考哪个元素”和“放在其哪一边”直接表达出来，还可以尝试替代位置。

## 基础内容先按普通流可用

```html
<div class="field">
  <button class="trigger" aria-describedby="hint">Details</button>
  <p class="hint" id="hint">Additional information</p>
</div>
```

```css
.hint {
  max-width: 20rem;
}
@supports (anchor-name: --help) and (position-area: block-end) and
  (position-try-fallbacks: flip-block) {
  .trigger {
    anchor-name: --help;
  }
  .hint {
    position: absolute;
    position-anchor: --help;
    position-area: block-end;
    position-try-fallbacks: flip-block;
    margin: 8px;
  }
}
```

支持时，hint 以 trigger 为默认锚点，优先放在块末端方向；不合适时可尝试块轴翻转。示例只有一组唯一锚点，且提示始终可见，专门展示定位；不支持时说明文字仍在普通流中。

`position-area` 使用围绕锚点的区域模型，不是把 position:relative 改名。`anchor()` 可在适用 inset 中引用边，anchor-size() 可引用锚点尺寸；它们有各自的可用位置与回退规则。

## 锚点与包含块仍是不同参照

锚点提供目标几何，定位盒仍受包含块与可用空间约束。锚点有布局顺序、名称解析等要求，不是任意 DOM 节点都能无条件被后面的规则引用。

重复组件不能全靠一个全局同名锚点碰运气，应考虑命名与 anchor-scope 等能力，并分别验证。命中一个 anchor-name 语法检测，也不代表所有子能力可用。

## 翻转不是完整浮层交互

`position-try` 提供溢出时的候选位置，不负责打开关闭、焦点管理、Escape、屏幕阅读器语义或 Top Layer。需要弹出层时可以结合原生 popover，但其默认样式、锚点关联和交互仍需理解。

复杂表单、缩放、滚动祖先与视口边缘应使用最小实际用例验证。它是定位基础之后的增强专题，语法与边界以 [CSS Anchor Positioning 1 草案](https://www.w3.org/TR/css-anchor-position-1/) 和目标环境为准。
