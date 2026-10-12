# CSS 工程化：组织、作用域和发布

[本组导航](./README.md)

组织样式先解决三个实际问题：一个规则属于谁、怎样覆盖它、升级时会影响谁。全局 Reset 会大范围重置默认样式，Normalize 更倾向保留有用默认并修正差异；两者都要评估对盒模型和交互样式的影响。

BEM 用 block__element--modifier 约定全局命名，不能提供真实隔离。CSS Modules 由构建改写类名并导出映射；浏览器原生 scope/layer 与这种转换不是同一机制。CSS-in-JS 有运行时生成和编译提取等不同实现，SSR/hydration、缓存与成本必须结合具体工具分析。

Sass/Less 在构建时生成CSS，原生 custom properties 在运行时参与层叠/继承。预处理器循环/mixin 与原生变量不等价。避免把 DOM 深度直接变成高 specificity 嵌套链。

可用 layer 显式组织 reset/base/tokens/components/utilities/overrides，并保留低 specificity 与语义 token。普通声明层顺序和 important 层顺序相反，见 [层叠](../cascade/cascade.md)。CSS Modules 的真实类名映射取决于所用构建工具。

## 样式示例与推导

```css
@layer css-components, css-variants;
@layer css-components {
  .sample-button {
    --button-color: rgb(30, 70, 180);
  }
}
@layer css-variants {
  .sample-button.changed {
    --button-color: rgb(20, 120, 60);
  }
}
.sample-button {
  background: var(--button-color);
}
```

两个层分别提供组件 token 与变体 token；普通声明中后层的变量值优先。背景在未分层规则中读取胜出的 token，因而普通按钮为蓝色，附加 `.changed` 后为绿色。若页面还有其他背景声明，仍要按完整层叠顺序判断。

原生层依据 [Cascade 5](https://www.w3.org/TR/css-cascade-5/)；构建工具属于独立工程选型。
