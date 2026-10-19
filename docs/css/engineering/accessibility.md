# CSS 可访问性：视觉、焦点与阅读顺序一致

页面看起来整齐，不代表用户能找到焦点、放大文字或按合理顺序操作。CSS 需要与 DOM 语义和输入行为共同设计。

## 先让焦点看得见

```css
.action:focus-visible {
  outline: 3px solid #164eaf;
  outline-offset: 3px;
}
```

`focus-visible` 依据输入方式等启发式匹配，不是简单的“只在键盘时为真”。可以设计焦点外观，但不要删除默认 outline 后没有替代。强制颜色下阴影可能消失，明确 outline 往往更可靠。

焦点还可能被 overflow 裁剪或固定栏挡住，需要结合滚动和容器边界检查。依据 [WCAG 焦点可见性说明](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)。

## 视觉重排不自动重排操作顺序

```html
<div class="actions"><button>Save</button><button>Cancel</button></div>
```

```css
.actions {
  display: flex;
  flex-direction: row-reverse;
}
```

通常视觉顺序改变，DOM 和默认 Tab 顺序仍先 Save 后 Cancel。Grid placement、Flex order 也有同类问题。应先让 DOM 顺序表达合理阅读流程，再用布局安排空间；不要靠正 tabindex 拼补一个复杂的焦点顺序。

## 不可见、不可点与不可访问分别判断

| 手段                | 关键影响                                           |
| ------------------- | -------------------------------------------------- |
| display:none        | 不生成该子树的正常布局盒，通常也从可访问树排除     |
| visibility:hidden   | 保留布局，通常不可聚焦且不呈现；后代可另设 visible |
| opacity:0           | 保留布局和通常的命中、焦点能力                     |
| pointer-events:none | 不作为通常指针命中目标，不自动禁止键盘聚焦         |
| aria-hidden         | 不负责视觉隐藏或阻止焦点，不宜包住可聚焦内容       |

需要仅供辅助技术阅读的文本时，可使用经过验证的 visually-hidden 模式；不要把真正可操作控件永久藏成不可见焦点。图标按钮应由 HTML 提供名称，不能只靠背景图或伪元素。

## 缩放、对比与运动都要留有空间

不要禁用用户缩放。固定高度文字盒、nowrap、绝对定位提示容易在大字号与窄屏时遮挡；检查 200% 缩放、文本放大和重排，不能只按默认截图验收。

错误、成功、选中等状态需要文字或形状，不只用红绿。正文和控件还要检查颜色对比，主题切换后应重新检查。非必要运动尊重减少动态效果偏好，见[用户能力与偏好](../responsive/preferences.md)。

这些原则覆盖 CSS 常见问题，不等于完整的 WCAG 合规验收；键盘、读屏、缩放和高对比模式应分别验证。
