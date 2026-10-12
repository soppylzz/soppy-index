# 容器查询：按组件可用空间调整

[本组导航](./README.md) · [媒体查询](./responsive.md) · [Containment](../engineering/containment.md)

媒体查询以视口、设备特征或用户偏好为条件；容器查询让组件根据祖先提供的查询容器尺寸调整自身。`container-type: inline-size` 建立可查询的行内轴尺寸；`@container` 匹配指定容器。被查询的元素需要祖先容器，不能以自身尺寸查询自身并同时修改自身尺寸。[CSS Conditional Rules 5](https://www.w3.org/TR/css-conditional-5/) 说明容器查询规则。

```css
.host {
  container: cards / inline-size;
  inline-size: 240px;
  max-inline-size: 100%;
}
.cards {
  display: grid;
  grid-template-columns: 1fr;
}
@container cards (inline-size >= 400px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

推导时只看查询容器的实际内容盒行内尺寸：240px 小于 400px，卡片保持一列；若祖先增至 480px，查询成立，卡片变两列。视口在这两次比较中可以完全不变。若外部空间或 `max-inline-size` 使容器达不到 400px，也不会切换。`inline-size` 是逻辑轴尺寸，竖排时不要当作物理宽度。

`cqi`、`cqb` 等容器单位参照适合相应轴的查询容器；没有合适容器时按规范使用小视口尺寸回退，不能直接当成父元素百分比。Style query 的能力与兼容范围仍在演进，目标环境应单独确认。容器类型也施加布局所需的尺寸隔离约束，相关副作用见 [Containment](../engineering/containment.md)。
