# 替换元素：外盒尺寸与内部资源分两步求解

给图片设置 object-fit:cover 后，图像被裁掉了，旁边内容为什么没有移动？CSS 先确定元素盒的尺寸，再把资源适配到内容盒。

## 固有尺寸、CSS 尺寸与首选比例

Img、video、iframe 等内容不按普通 CSS 子盒排版，但它们的外盒仍参与 CSS 布局。并非所有表单控件都可用同一套替换元素口诀解释，需看具体类型。

资源可能提供固有宽、高和比例；width/height 的 auto 再结合这些信息与 min/max 约束求解。`aspect-ratio` 提供首选比例，至少一个轴为 auto 时更能发挥作用；明确设置双轴尺寸通常不会被比例强制改写。

```html
<img class="photo" src="landscape.jpg" width="800" height="400" alt="A lake" />
```

```css
.photo {
  display: block;
  max-width: 100%;
  height: auto;
}
```

HTML 的 width/height 可提前提供比例，减少加载后位移；CSS 仍可限制最终显示大小。父内容宽 300px、无其他约束时，800 × 400 的图片可缩至 300 × 150px，而不是固定保留 HTML 尺寸。

## 同一个 120px 方盒，三种内容适配

```css
.thumbnail {
  width: 120px;
  height: 120px;
  object-fit: cover;
  object-position: center;
}
```

假定资源为 160 × 80px：

| object-fit | 资源在内容盒中的尺寸                  | 结果                                    |
| ---------- | ------------------------------------- | --------------------------------------- |
| fill       | 120 × 120px                           | 填满但改变比例                          |
| contain    | 120 × 60px                            | 保持完整，留下竖向空白                  |
| cover      | 240 × 120px                           | 覆盖方盒，横向裁剪                      |
| none       | 使用资源默认对象尺寸，本例 160 × 80px | 不做 contain/cover 缩放，可能留白并裁剪 |
| scale-down | 在 none 与 contain 的结果中选择较小者 | 避免为适配而放大                        |

外盒在这些情况中仍为 120 × 120px。`object-position` 调整资源在盒内的位置，不移动元素本身；对 iframe 不能期待 object-fit 像对 img 那样适配嵌入页面。

## 普通盒也可以用 aspect-ratio

```css
.preview {
  width: 100%;
  aspect-ratio: 16 / 9;
}
```

普通非替换盒也能据此从自动轴推导尺寸，但内容最小需求、min/max、box-sizing 等仍参与。对替换元素使用 `aspect-ratio: auto 16 / 9` 时，可以在资源尚无自然比例时先用给定比例，加载后使用自然比例；要固定裁剪框则需要明确相应布局约束。

背景图片适合装饰，不能替代 img 的 alt、响应式资源选择等语义。外盒尺寸规则见 [CSS Sizing 4](https://www.w3.org/TR/css-sizing-4/#aspect-ratio)，资源适配见 [CSS Images 3](https://www.w3.org/TR/css-images-3/#the-object-fit)。
