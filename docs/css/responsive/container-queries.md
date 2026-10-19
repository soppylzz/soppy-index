# 容器查询：组件按自己拿到的空间布局

同一视口里，卡片可能一张放侧栏、一张放正文。媒体查询看到相同视口，容器查询则能根据不同祖先提供的空间调整后代。

## 提供空间的外层与响应空间的内层

```html
<div class="host">
  <article class="card">
    <div>Preview</div>
    <div>Description</div>
  </article>
</div>
```

```css
.host {
  container: card-host / inline-size;
}
.card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}
@container card-host (inline-size >= 30rem) {
  .card {
    grid-template-columns: 10rem minmax(0, 1fr);
  }
}
```

`.host` 的行内尺寸由外部布局提供。小于 30rem 时 card 单列，达到阈值后变为预览与说明两栏，视口无需改变。查询比较容器的内容盒尺寸，横排中 inline-size 才对应宽度。

`container` 简写同时设置名称与类型；名称用于筛选合适的祖先，不是用 ID 查找任意元素。嵌套结构中会按查询所需能力寻找最近的合适容器。

## 为什么不能查询自身来改自身尺寸

如果后代内容决定父宽，父宽又决定后代采用哪套布局，就可能循环。Inline-size 查询通过相应尺寸隔离，使查询轴不再按后代内容自然撑开。

因此 host 自己通常不能用这一条自身尺寸查询来改自己；由 host 提供参照，card 作为后代响应。Shrink-to-fit 外层若失去内容贡献，也可能出现意外小尺寸，需要让外部布局明确提供空间。

`container-type: size` 涉及双轴尺寸查询和隔离，不能只为查询高度就添加后仍期待容器由子内容撑高。隔离边界见[containment](../engineering/containment.md)。

## 容器单位不是父元素百分比

1cqi 是适合行内轴查询容器尺寸的百分之一，cqb 对应块轴，cqw/cqh 对应物理轴。不同轴可能选择不同的合适容器；缺少对应容器时，使用小视口尺寸回退。

```css
.card h2 {
  font-size: clamp(1rem, 4cqi, 1.5rem);
}
```

容器单位可以连续调整，@container 用于切换布局策略；它们不互相替代。

## 尺寸查询与样式查询分开检测

样式查询可围绕自定义属性状态组织规则，但不能从“支持尺寸查询”推断所有 style query 或滚动状态查询都可用。使用具体语法时确认对应能力，基础布局仍应可用。

本篇按 [CSS Conditional Rules 5](https://www.w3.org/TR/css-conditional-5/) 的容器查询模型说明；扩展能力需按目标浏览器验证。
