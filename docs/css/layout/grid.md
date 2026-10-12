# Grid：轨道、自动放置与对齐

[本组导航](./README.md)

Grid 用行列共同定义二维轨道。grid-template 定义显式轨道，自动放置超出时生成隐式轨道，由 grid-auto-rows/columns 控制。item 是容器直接子盒；line、track、cell 与矩形 area 是不同单位。

fr 分配轨道剩余空间；裸 1fr 有自动下限，长内容可能撑开。minmax(0,1fr) 让下限明确为零，但内容仍需单独处理溢出。auto-fill 保留可容纳的空轨道，auto-fit 折叠空轨道；已有 item 填满时区别可能看不出来。

justify/align-items 对齐 item 在 grid area 内的位置，justify/align-content 对齐整体轨道组。dense 和显式 placement 可能改变视觉排列，阅读顺序仍应由 DOM 保证。subgrid 适合嵌套组件共享轨道，支持情况需以目标浏览器核实。

## 样式示例与推导

```css
#layout {
  width: 320px;
  display: grid;
  grid-template-columns: 1fr 80px;
}
#layout.changed {
  grid-template-columns: minmax(0, 1fr) 80px;
}
```

设容器内容宽 320px，右轨固定 80px，左轨理论上有 240px。裸 `1fr` 的自动最小下限可能被长内容撑大；此时不能只看 `fr` 就断言左轨是 240px。改成 `minmax(0, 1fr)`，才明确允许轨道缩到 240px。若文字本身不换行，它仍可能越过轨道边界，需另处理内容溢出。

依据 [Grid 2](https://www.w3.org/TR/css-grid-2/)。
