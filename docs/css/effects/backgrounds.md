# 背景与边框：画在哪里，按哪个矩形定位

`background` 不参与普通子盒排版。背景图可以覆盖整个卡片，却不会替卡片撑出高度；背景定位也不等于元素定位。

## 多层背景从上往下写

```css
.banner {
  background-image: linear-gradient(rgb(0 0 0 / 0%), rgb(0 0 0 / 60%)), url("hero.jpg");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #253445;
}
```

第一层渐变画在第二层照片上，背景色位于所有背景图后面。多组 position/size/repeat 可以用逗号逐层对应；background 简写还会重置未指定的背景长属性。

## Origin 决定参照，clip 决定绘制边界

| 属性                | 作用             | 常见初始值  |
| ------------------- | ---------------- | ----------- |
| background-origin   | 背景定位区域     | padding-box |
| background-clip     | 背景可绘制到哪里 | border-box  |
| background-size     | 每层图像如何缩放 | auto auto   |
| background-position | 缩放后如何放置   | 0% 0%       |

默认背景可以画到边框后面，因此半透明边框能透出背景。Origin 与 clip 不要求相同；attachment:fixed 等情况还有额外定位规则。

## 背景百分比不是简单乘容器宽度

对一张已确定显示尺寸的背景图，横向偏移可理解为：

`偏移 = (定位区域宽度 - 图像显示宽度) × 位置百分比`

定位区域 300px、图像 100px 时，50% 得到 100px，使双方中心对齐；100% 得到 200px，使右边对齐。图像比区域大时差值为负，仍可用于理解裁剪位置。

## Cover 与 contain 先保比，再决定留白或裁剪

300 × 200px 的区域放入 400 × 200px 的图片：contain 得到 300 × 150px，可能留白；cover 得到 400 × 200px，横向裁剪。规则与 object-fit 相似，但作用对象分别是背景图与替换内容。

渐变也属于图像，可以参与多背景，不会因为写了渐变而自动产生文字或盒尺寸。

## 圆角不会自动裁掉所有后代

`border-radius` 改变边框和背景的圆角形状，不等于给后代建立通用裁剪。需要裁剪后代时再按需求选择 overflow 或 clip-path，注意随之引入的滚动、格式化与定位边界。

`border` 参与盒尺寸；outline 和 box-shadow 不以相同方式占用布局空间。`border-image` 是边框图像切片机制，不是 background 的别名。定义见 [CSS Backgrounds and Borders 3](https://www.w3.org/TR/css-backgrounds-3/)。
