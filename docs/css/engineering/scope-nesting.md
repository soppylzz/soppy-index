# 作用域与嵌套：范围限制不等于封装

把规则放进 @scope 或写成嵌套，可以改善归属表达，但两者解决不同问题，也都不会自动切断继承。

## @scope 限定规则作用的子树

```html
<section class="card">
  <h2>Outer title</h2>
  <div class="embedded"><h2>Embedded title</h2></div>
</section>
```

```css
@scope (.card) to (.embedded) {
  h2 {
    color: teal;
  }
  :scope {
    border: 1px solid;
  }
}
```

`.card` 是作用域根，:scope 指向它；embedded 是限制边界，它及其子树不由这组 scoped 选择器命中。外部规则仍能匹配 card 内的元素，所以这不是 Shadow DOM。

范围也不阻断继承：若在根上设置 color，范围外的后代仍可能继承该颜色。要区分规则是否匹配到元素，与值是否从祖先传入。

## 范围选择器不直接给内部规则加权

`@scope (.card)` 不会让内部 h2 自动获得 .card 的 specificity。显式使用 :scope 时，它作为伪类参与权重。

当层叠前面的条件与 specificity 相同时，scoping proximity 再比较离作用域根的距离，较近者优先；之后才由出现顺序解决仍然相同的竞争。作用域不是“永远覆盖外部样式”的保证。依据 [CSS Cascade 6](https://www.w3.org/TR/css-cascade-6/#scoped-styles)。

## 原生嵌套描述选择器关系

```css
.card {
  padding: 1rem;
  & > h2 {
    margin: 0;
  }
  &:hover {
    border-color: teal;
  }
}
```

`& > h2` 选择当前 card 的直接子标题，`&:hover` 选择处于 hover 状态的 card。嵌套没有建立额外隔离，选择器匹配的仍是正常 DOM 关系。

原生 `&` 不是 Sass 的任意字符串拼接：不能假定 `&__title` 会生成 BEM 类名。深层嵌套还会把规则绑死在 DOM 结构上。

## 选择器列表可能抬高嵌套权重

```css
.card,
#featured {
  & > h2 {
    color: teal;
  }
}
```

嵌套选择器的父列表权重按类似 :is() 的方式取最大项，因此不能简单当作两条权重各自独立的手工展开规则。需要严格控制权重时避免混入 ID，或按语义使用 :where()。

规则见 [CSS Nesting 1](https://www.w3.org/TR/css-nesting-1/#nesting-selector)。原生嵌套、@scope 与构建时 CSS Modules 应分别评估兼容能力，不能因其中一种可用而假定另外两种相同。
