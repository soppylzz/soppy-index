> 英文原文：[Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/webui/webui_using_lit.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="using-lit-in-chromium-webui-development"></a>

# 在 Chromium WebUI 开发中使用 Lit

- [背景](#background)
- [Chromium WebUI 基础设施：CrLitElement](#chromium-webui-infrastructure-crlitelement-base-class)
- [Lit 数据绑定与 -changed 事件](#lit-data-bindings-and-handling--changed-events)
- [select 元素的数据绑定问题](#lit-data-binding-issue-with-select-elements)
- [Lit 与 Polymer 数据绑定兼容性](#lit-and-polymer-data-bindings-compatibility)
- [Polymer iron / paper 元素的替代](#polymer-ironpaper-elements-alternatives)
- [Lit 元素的组成](#anatomy-of-a-lit-based-element)
- [Polymer 迁移到 Lit](#polymer-to-lit-migrations)
  - [计算属性](#computed-properties)
  - [Observer](#observers)
  - [dom-if](#dom-if)
  - [dom-repeat](#dom-repeat)
  - [迁移 iron-list 使用方](#migrating-iron-list-clients)
- [Lit 与 Polymer 的其他差异](#additional-lit-and-polymer-differences)
  - [accessor 关键字](#use-of-the-accessor-keyword)
  - [入库 .html.ts 的 i18n 替换](#i18n-replacements-in-checked-in-htmlts-files)
  - [测试](#testing)
  - [hidden attribute](#use-of-the-hidden-attribute)

<a id="background"></a>

## 背景

本文关注 Chromium WebUI 中的 Lit，以及 Lit、Polymer 元素之间的兼容性，因为许多 WebUI 仍使用 Polymer。假定读者熟悉：Web Components，可阅读 [MDN 概述](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)及 [Custom Element 指南](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)；[Lit 官方文档](https://lit.dev/docs/)，尤其是响应式属性、[生命周期](https://lit.dev/docs/components/lifecycle/)和[表达式](https://lit.dev/docs/templates/expressions/)；以及 [面向 Polymer 用户的 Lit 介绍](https://lit.dev/articles/lit-for-polymer-users/)，其中涉及兼容与迁移。

不熟悉这些内容时，建议先阅读上述资料。

<a id="chromium-webui-infrastructure-crlitelement-base-class"></a>

## Chromium WebUI 基础设施：CrLitElement

[CrLitElement](https://source.chromium.org/chromium/chromium/src/+/main:third_party/lit/v3_0/cr_lit_element.ts;l=1?q=cr_lit_element&sq=&ss=chromium%2Fchromium%2Fsrc) 是 WebUI 开发的基类，用于减少样板代码、改善混用 Polymer / Lit 时的兼容性，以及简化迁移。Chromium 中的 Lit custom element 应继承它。

具体功能包括：

1. 在 connectedCallback 运行、连接前调用 focus、连接前通过 `this.$` 访问子元素时，强制首次同步渲染。因此刚挂载后访问 DOM，或 Polymer 父级 connectedCallback 早于 Lit 子级运行时聚焦、访问子元素，不一定需要先等待 updateComplete。细节见类内注释。
2. 提供 `$` 代理，按 ID 用 `this.$.id` 访问子元素，与 Polymer 一致。
3. 支持属性的 `notify:true`。属性 foo 改变时，在 updated 中发出 foo-changed，兼容 Polymer 父级双向绑定，但行为并非完全相同，见下文。
4. 将属性到 attribute 的映射改为 Polymer 方式：fooBar 对应 foo-bar，而非 Lit 默认的 foobar。

<a id="lit-data-bindings-and-handling--changed-events"></a>

## Lit 数据绑定与 -changed 事件

CrLitElement 在 connectedCallback 强制首次同步渲染，因此子元素初始化 notify 属性后，可能刚连接就在 updated 发出 -changed，此时父元素第一次更新尚未完成。

因此处理 -changed 时，不能假定父元素已完成首次更新。修改 DOM 前必须等待父元素 updateComplete。可选择 async handler，先 `await this.updateComplete`；也可只更新父级属性，将依赖 DOM 的工作放到 updated。

若待检查的父级属性为 protected / private，访问 changedProperties 时需要类型转换，示例如下。子元素属性：

```ts
static override get properties() {
  return {
    foo: {
      type: Boolean,
      notify: true,
    },
 };
}
```

父元素绑定并监听：

```html
<foo-child ?foo="${this.foo}" on-foo-changed="${this.onFooChanged}"> </foo-child>
<demo-child id="demo"></demo-child>
```

父元素 TypeScript：

```ts
static override get properties() {
  return {
    foo: {type: Boolean},
 };
}

protected accessor foo: boolean = true;

onFooChanged(e: CustomEvent<{value: boolean}>) {
  // Updates the parent's property that is bound to the child.
  this.foo = e.detail.value;
}

override updated(changedProperties: PropertyValues<this>) {
  super.updated(changedProperties);

  // Cast necessary to check for changes to protected/private properties.
  const changedPrivateProperties =
      changedProperties as Map<PropertyKey, unknown>;

  // Updates the DOM when |foo| changes.
  if (changedPrivateProperties.has('foo')) {
    if (this.foo) {
      this.$.demo.show();
    } else {
      this.$.demo.hide();
    }
  }
}
```

<a id="lit-data-binding-issue-with-select-elements"></a>

## select 元素的数据绑定问题

`<select>` 对设置顺序有要求：设置其 value 时，必须已经存在对应 value 的 option，否则显示为空。如果 select.value 和 option.value 都通过 Lit 绑定，option 值可能尚未填入，因此初始化为空。

复现问题的 `.html.ts`：

```html
<select .value="${this.mySelectValue}" @change="${this.onSelectChange}">
  <option value="${MyEnum.FIRST}">Option 1</option>
  <option value="${MyEnum.SECOND}">Option 2</option>
</select>
```

对应 `.ts`，即使 mySelectValue 初始化为有效值也会出现：

```ts
static get properties() {
  return {
    mySelectValue: {type: String},
  };
}

accessor mySelectValue: MyEnum = MyEnum.SECOND;

onSelectChange(e: Event) {
  this.mySelectValue = (e.target as HTMLSelectElement).value;
}
```

原文推荐改为绑定每个 option 的 selected attribute。

`.html.ts`：

```html
<select @change="${this.onSelectChange}">
  <option value="${MyEnum.FIRST}" ?selected="${this.isSelected(MyEnum.FIRST)}">Option 1</option>
  <option value="${MyEnum.SECOND}" ?selected="${this.isSelected(MyEnum.SECOND)}">Option 2</option>
</select>
```

`.ts`：

```ts
static get properties() {
  return {
    mySelectValue: {type: String},
  };
}

accessor mySelectValue: MyEnum = MyEnum.SECOND;

onSelectChange(e: Event) {
  this.mySelectValue = (e.target as HTMLSelectElement).value;
}

isSelected(value: MyEnum): boolean {
  return value === this.mySelectValue;
}
```

也可使用 Lit live directive，并在每次 select 渲染时请求额外更新。原文中将 live 纳入 Chromium Lit bundle 仍在讨论；如果 option 极多等情况让上述方式不实用，应联系 WebUI 团队。

<a id="lit-and-polymer-data-bindings-compatibility"></a>

## Lit 与 Polymer 数据绑定兼容性

Lit 原生不支持双向绑定，CrLitElement 的 notify:true 提供基础兼容，但不同于 Polymer：Polymer 子元素仅在自身修改属性时发 -changed，父级传值不会触发；CrLitElement 无法区分变化来自父级还是自身，只要值改变就发事件。

迁移父元素或子元素时，父级直接处理 -changed 的代码应不依赖变化来源，或者检查事件的新值是否不同于父级现值。例如把事件计入“用户从子控件修改值”的指标前，需确认确实是新值，而非父级刚传下去的值。

可在 [Lit playground 示例](https://lit.dev/playground/#project=W3sibmFtZSI6InRvcC1lbGVtZW50LnRzIiwiY29udGVudCI6ImltcG9ydCB7UG9seW1lckVsZW1lbnQsIGh0bWx9IGZyb20gJ0Bwb2x5bWVyL3BvbHltZXInO1xuaW1wb3J0IHtjdXN0b21FbGVtZW50LCBwcm9wZXJ0eX0gZnJvbSAnQHBvbHltZXIvZGVjb3JhdG9ycyc7XG5pbXBvcnQge0NyRHVtbXlQb2x5bWVyRWxlbWVudH0gZnJvbSAnLi9jcl9kdW1teV9wb2x5bWVyLmpzJztcbmltcG9ydCB7Q3JEdW1teUxpdEVsZW1lbnR9IGZyb20gJy4vY3JfZHVtbXlfbGl0LmpzJztcbmltcG9ydCAnLi9jcl9kdW1teV9saXQuanMnO1xuaW1wb3J0ICcuL2NyX2R1bW15X3BvbHltZXIuanMnO1xuXG5AY3VzdG9tRWxlbWVudCgndG9wLWVsZW1lbnQnKVxuY2xhc3MgVG9wRWxlbWVudCBleHRlbmRzIFBvbHltZXJFbGVtZW50IHtcbiAgc3RhdGljIGdldCB0ZW1wbGF0ZSgpIHtcbiAgICByZXR1cm4gaHRtbGBcbiAgICAgIDxzdHlsZT5cbiAgICAgICAgOmhvc3Qge1xuICAgICAgICAgIGNvbG9yOiBibHVlO1xuICAgICAgICAgIGRpc3BsYXk6YmxvY2s7XG4gICAgICAgICAgYm9yZGVyOiAycHggc29saWQgYmx1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgI2NoaWxkcmVuIHtcbiAgICAgICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgICAgIGdhcDogMTBweDtcbiAgICAgICAgfVxuICAgICAgPC9zdHlsZT5cbiAgICAgIDxkaXY-UE9MWU1FUiBQQVJFTlQ8L2Rpdj5cbiAgICAgIDxsYWJlbD5TZXQgUG9seW1lciBwYXJlbnQgdmFsdWU6IDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgb24taW5wdXQ9XCJvbklucHV0X1wiPjwvaW5wdXQ-PC9sYWJlbD5cbiAgICAgIDxkaXYgaWQ9XCJjaGlsZHJlblwiPlxuICAgICAgPGNyLWR1bW15LXBvbHltZXIgdmFsdWU9XCJ7e3ZhbHVlUG9seW1lcn19XCIgb24tdmFsdWUtY2hhbmdlZD1cIm9uUG9seW1lclZhbHVlQ2hhbmdlZF9cIj48L2NyLWR1bW15LXBvbHltZXI-XG4gICAgICA8Y3ItZHVtbXktbGl0IHZhbHVlPVwie3t2YWx1ZUxpdH19XCIgb24tdmFsdWUtY2hhbmdlZD1cIm9uTGl0VmFsdWVDaGFuZ2VkX1wiPjwvY3ItZHVtbXktbGl0PlxuICAgICAgPC9kaXY-XG4gICAgICA8ZGl2IGlkPVwibG9nXCI-PC9kaXY-XG4gICAgYDtcbiAgfVxuICBcbiAgc3RhdGljIGdldCBwcm9wZXJ0aWVzKCkge1xuICAgIHJldHVybiB7XG4gICAgICB2YWx1ZVBvbHltZXI6IHt0eXBlOiBOdW1iZXJ9LFxuICAgICAgdmFsdWVMaXQ6IHt0eXBlOiBOdW1iZXJ9LFxuICAgIH07XG4gIH1cbiAgXG4gIHZhbHVlTGl0OiBudW1iZXI7XG4gIHZhbHVlUG9seW1lcjogbnVtYmVyO1xuICBcbiAgb25JbnB1dF8oKSB7ICAgIFxuICAgIHRoaXMudmFsdWVQb2x5bWVyID0gTnVtYmVyKHRoaXMuc2hhZG93Um9vdC5xdWVyeVNlbGVjdG9yKCdpbnB1dCcpLnZhbHVlKTtcbiAgICB0aGlzLnZhbHVlTGl0ID0gdGhpcy52YWx1ZVBvbHltZXI7XG4gIH1cbiAgXG4gIG9uUG9seW1lclZhbHVlQ2hhbmdlZF8oZSkge1xuICAgIGNvbnN0IGR1bW15ID0gdGhpcy5zaGFkb3dSb290IS5xdWVyeVNlbGVjdG9yKCdjci1kdW1teS1wb2x5bWVyJykgYXMgQ3JEdW1teVBvbHltZXJFbGVtZW50O1xuICAgIHRoaXMuJC5sb2cudGV4dENvbnRlbnQgKz0gJ3BvbHltZXItdmFsdWUtY2hhbmdlZCB0byAnICsgZS5kZXRhaWwudmFsdWUgKyAnLi4uICAnO1xuICB9XG4gICBvbkxpdFZhbHVlQ2hhbmdlZF8oZSkge1xuICAgIGNvbnN0IGR1bW15ID0gdGhpcy5zaGFkb3dSb290IS5xdWVyeVNlbGVjdG9yKCdjci1kdW1teS1saXQnKSBhcyBDckR1bW15TGl0RWxlbWVudDtcbiAgICB0aGlzLiQubG9nLnRleHRDb250ZW50ICs9ICdsaXQtdmFsdWUtY2hhbmdlZCB0byAnICsgZS5kZXRhaWwudmFsdWUgKyAnLi4uICAnO1xuICB9XG59O1xuXG4ifSx7Im5hbWUiOiJwYWNrYWdlLmpzb24iLCJjb250ZW50Ijoie1xuICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJsaXRcIjogXCJeMy4wLjBcIixcbiAgICBcIkBsaXQvcmVhY3RpdmUtZWxlbWVudFwiOiBcIl4yLjAuMFwiLFxuICAgIFwibGl0LWVsZW1lbnRcIjogXCJeNC4wLjBcIixcbiAgICBcImxpdC1odG1sXCI6IFwiXjMuMC4wXCJcbiAgfVxufSIsImhpZGRlbiI6dHJ1ZX0seyJuYW1lIjoiaW5kZXguaHRtbCIsImNvbnRlbnQiOiI8IURPQ1RZUEUgaHRtbD5cbjxoZWFkPlxuICA8c2NyaXB0IHR5cGU9XCJtb2R1bGVcIiBzcmM9XCIuL3RvcC1lbGVtZW50LmpzXCI-PC9zY3JpcHQ-XG4gIDxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiIHNyYz1cIi4vdG9wLWVsZW1lbnQtbGl0LmpzXCI-PC9zY3JpcHQ-XG48L2hlYWQ-XG48Ym9keT5cbiAgPHRvcC1lbGVtZW50PjwvdG9wLWVsZW1lbnQ-XG4gIDx0b3AtZWxlbWVudC1saXQ-PC90b3AtZWxlbWVudC1saXQ-XG48L2JvZHk-XG4ifSx7Im5hbWUiOiJjcl9kdW1teV9wb2x5bWVyLnRzIiwiY29udGVudCI6ImltcG9ydCB7UG9seW1lckVsZW1lbnQsIGh0bWx9IGZyb20gJ0Bwb2x5bWVyL3BvbHltZXInO1xuaW1wb3J0IHtjdXN0b21FbGVtZW50LCBwcm9wZXJ0eX0gZnJvbSAnQHBvbHltZXIvZGVjb3JhdG9ycyc7XG5cbkBjdXN0b21FbGVtZW50KCdjci1kdW1teS1wb2x5bWVyJylcbmV4cG9ydCBjbGFzcyBDckR1bW15UG9seW1lckVsZW1lbnQgZXh0ZW5kcyBQb2x5bWVyRWxlbWVudCB7XG4gIHN0YXRpYyBnZXQgdGVtcGxhdGUoKSB7XG4gICAgcmV0dXJuIGh0bWxgXG4gICAgICAgPHN0eWxlPlxuICAgICAgICA6aG9zdCB7XG4gICAgICAgICAgYm9yZGVyOiAycHggc29saWQgYmx1ZTtcbiAgICAgICAgICBjb2xvcjogYmx1ZTtcbiAgICAgICAgICBkaXNwbGF5OiBibG9jaztcbiAgICAgICAgfVxuICAgICAgIDwvc3R5bGU-XG4gICAgICAgPGRpdj5Qb2x5bWVyIGNoaWxkIHZhbHVlIGlzOiBbW3ZhbHVlXV08L2Rpdj5cbiAgICBgO1xuICB9XG4gIFxuICBzdGF0aWMgZ2V0IHByb3BlcnRpZXMoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbHVlOiB7dHlwZTogTnVtYmVyLCBub3RpZnk6IHRydWV9LFxuICAgIH07XG4gIH1cbiAgXG4gIHZhbHVlOiBudW1iZXIgPSAxO1xufSJ9LHsibmFtZSI6InRvcC1lbGVtZW50LWxpdC50cyIsImNvbnRlbnQiOiJpbXBvcnQge0xpdEVsZW1lbnQsIGh0bWwsIG5vdGhpbmd9IGZyb20gJ2xpdCc7XG5pbXBvcnQge2N1c3RvbUVsZW1lbnR9IGZyb20gJ2xpdC9kZWNvcmF0b3JzLmpzJztcblxuaW1wb3J0IHtDckR1bW15UG9seW1lckVsZW1lbnR9IGZyb20gJy4vY3JfZHVtbXlfcG9seW1lci5qcyc7XG5pbXBvcnQgJy4vY3JfZHVtbXlfcG9seW1lci5qcyc7XG5pbXBvcnQge0NyRHVtbXlMaXRFbGVtZW50fSBmcm9tICcuL2NyX2R1bW15X2xpdC5qcyc7XG5pbXBvcnQgJy4vY3JfZHVtbXlfbGl0LmpzJztcblxuQGN1c3RvbUVsZW1lbnQoJ3RvcC1lbGVtZW50LWxpdCcpXG5jbGFzcyBUb3BFbGVtZW50TGl0IGV4dGVuZHMgTGl0RWxlbWVudCB7XG4gIG92ZXJyaWRlIHJlbmRlcigpIHtcbiAgICByZXR1cm4gaHRtbGBcbiAgICAgIDxzdHlsZT5cbiAgICAgICAgOmhvc3Qge1xuICAgICAgICAgIGJvcmRlcjogMnB4IHNvbGlkIGdyZWVuO1xuICAgICAgICAgIGNvbG9yOiBncmVlbjtcbiAgICAgICAgICBkaXNwbGF5OiBibG9jaztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgI2NoaWxkcmVuIHtcbiAgICAgICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgICAgIGdhcDogMTBweDtcbiAgICAgICAgfVxuICAgICAgPC9zdHlsZT5cbiAgICAgIDxkaXY-TElUIFBBUkVOVDwvZGl2PlxuICAgICAgPGxhYmVsPlNldCBMaXQgcGFyZW50IHZhbHVlOiA8aW5wdXQgdHlwZT1cIm51bWJlclwiIEBpbnB1dD1cIiR7dGhpcy5vbklucHV0X31cIj48L2lucHV0PjwvbGFiZWw-XG4gICAgICA8ZGl2IGlkPVwiY2hpbGRyZW5cIj5cbiAgICAgIDxjci1kdW1teS1wb2x5bWVyIHZhbHVlPVwiJHt0aGlzLnZhbHVlUG9seW1lciB8fCBub3RoaW5nfVwiIEB2YWx1ZS1jaGFuZ2VkPVwiJHt0aGlzLm9uUG9seW1lclZhbHVlQ2hhbmdlZF99XCI-PC9jci1kdW1teS1wb2x5bWVyPlxuICAgICAgPGNyLWR1bW15LWxpdCB2YWx1ZT1cIiR7dGhpcy52YWx1ZUxpdCB8fCBub3RoaW5nfVwiIEB2YWx1ZS1jaGFuZ2VkPVwiJHt0aGlzLm9uTGl0VmFsdWVDaGFuZ2VkX31cIj48L2NyLWR1bW15LWxpdD5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBpZD1cImxvZ1wiPjwvZGl2PlxuICAgIGA7XG4gIH1cblxuICBzdGF0aWMgb3ZlcnJpZGUgZ2V0IHByb3BlcnRpZXMoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbHVlUG9seW1lcjoge3R5cGU6IE51bWJlcn0sXG4gICAgICB2YWx1ZUxpdDoge3R5cGU6IE51bWJlcn0sXG4gICAgfTtcbiAgfVxuICBcbiAgdmFsdWVQb2x5bWVyOiBudW1iZXI7XG4gIHZhbHVlTGl0OiBudW1iZXI7XG4gIFxuICBvbklucHV0XygpIHtcbiAgICB0aGlzLnZhbHVlUG9seW1lciA9IE51bWJlcih0aGlzLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcignaW5wdXQnKS52YWx1ZSk7XG4gICAgdGhpcy52YWx1ZUxpdCA9IHRoaXMudmFsdWVQb2x5bWVyO1xuICB9XG4gIFxuICBvblBvbHltZXJWYWx1ZUNoYW5nZWRfKGUpIHtcbiAgICBjb25zdCBkdW1teSA9IHRoaXMuc2hhZG93Um9vdCEucXVlcnlTZWxlY3RvcignY3ItZHVtbXktcG9seW1lcicpIGFzIENyRHVtbXlQb2x5bWVyRWxlbWVudDtcbiAgICB0aGlzLnNoYWRvd1Jvb3QhLnF1ZXJ5U2VsZWN0b3IoJyNsb2cnKS50ZXh0Q29udGVudCArPSAncG9seW1lci12YWx1ZS1jaGFuZ2VkIHRvICcgKyBlLmRldGFpbC52YWx1ZSArICcuLi4gICc7XG4gIH1cbiAgXG4gIG9uTGl0VmFsdWVDaGFuZ2VkXyhlKSB7XG4gICAgY29uc3QgZHVtbXkgPSB0aGlzLnNoYWRvd1Jvb3QhLnF1ZXJ5U2VsZWN0b3IoJ2NyLWR1bW15LWxpdCcpIGFzIENyRHVtbXlMaXRFbGVtZW50O1xuICAgIHRoaXMuc2hhZG93Um9vdCEucXVlcnlTZWxlY3RvcignI2xvZycpLnRleHRDb250ZW50ICs9ICdsaXQtdmFsdWUtY2hhbmdlZCB0byAnICsgZS5kZXRhaWwudmFsdWUgKyAnLi4uICAnO1xuICB9XG59XG4gIn0seyJuYW1lIjoiY3JfZHVtbXlfbGl0LnRzIiwiY29udGVudCI6ImltcG9ydCB7TGl0RWxlbWVudCwgaHRtbCwgUHJvcGVydHlWYWx1ZXN9IGZyb20gJ2xpdCc7XG5pbXBvcnQge2N1c3RvbUVsZW1lbnR9IGZyb20gJ2xpdC9kZWNvcmF0b3JzLmpzJztcblxuQGN1c3RvbUVsZW1lbnQoJ2NyLWR1bW15LWxpdCcpXG5leHBvcnQgY2xhc3MgQ3JEdW1teUxpdEVsZW1lbnQgZXh0ZW5kcyBMaXRFbGVtZW50IHtcbiAgb3ZlcnJpZGUgcmVuZGVyKCkge1xuICAgIHJldHVybiBodG1sYFxuICAgICAgPHN0eWxlPlxuICAgICAgICA6aG9zdCB7XG4gICAgICAgICAgYm9yZGVyOiAycHggc29saWQgZ3JlZW47XG4gICAgICAgICAgY29sb3I6IGdyZWVuO1xuICAgICAgICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgICAgICB9XG4gICAgICA8L3N0eWxlPlxuICAgICAgPGRpdj5MaXQgY2hpbGQgdmFsdWUgaXM6ICR7dGhpcy52YWx1ZX08L2Rpdj5cbiAgICBgO1xuICB9XG5cbiAgc3RhdGljIG92ZXJyaWRlIGdldCBwcm9wZXJ0aWVzKCkge1xuICAgIHJldHVybiB7XG4gICAgICB2YWx1ZToge3R5cGU6IE51bWJlcn0sXG4gICAgfTtcbiAgfVxuICBcbiAgb3ZlcnJpZGUgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgc3VwZXIuY29ubmVjdGVkQ2FsbGJhY2soKTtcbiAgICBcbiAgICB0aGlzLnBlcmZvcm1VcGRhdGUoKTtcbiAgfVxuIFxuICB2YWx1ZTogbnVtYmVyID0gMTtcbiAgXG4gIC8vIEltcGxlbWVudGF0aW9uIG9mIG5vdGlmeTogdHJ1ZSBmcm9tIENyTGl0RWxlbWVudFxuICBvdmVycmlkZSB1cGRhdGVkKGNoYW5nZWRQcm9wZXJ0aWVzOiBQcm9wZXJ0eVZhbHVlczx0aGlzPikge1xuICAgIGlmIChjaGFuZ2VkUHJvcGVydGllcy5oYXMoJ3ZhbHVlJykpIHtcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3ZhbHVlLWNoYW5nZWQnLCB7IGJ1YmJsZXM6IHRydWUsIGNvbXBvc2VkOiB0cnVlLCBkZXRhaWw6IHsgdmFsdWU6IHRoaXMudmFsdWUgfX0pKTtcbiAgICB9XG4gIH1cbn0ifV0)中调整父子初始化值，观察差异。原文列出的初始化行为如下；“发事件”均指 -changed：

| 父 / 子 | 两者都初始化 | 仅父初始化 | 仅子初始化 | 两者都不初始化 |
| --- | --- | --- | --- | --- |
| Polymer / Polymer | 父值传子，不发事件 | 父值传子，不发事件 | 子值传父，发事件 | undefined，不发事件 |
| Polymer / Lit | 父值传子，发事件 | 父值传子，发事件 | 子值传父，发事件 | undefined，不发事件 |
| Lit / Polymer | 父值传子，发事件 | 父值传子，发事件 | attribute 绑定时子值传父；property 绑定时父级 undefined 优先，发出值为 undefined 的事件 | undefined，不发事件 |
| Lit / Lit | 父值传子，发事件 | 父值传子，发事件 | attribute 绑定时子值传父；property 绑定时父级 undefined 优先，发出值为 undefined 的事件 | undefined，不发事件 |

这里 attribute 语法为 `value="${this.childValue || nothing}"`，property 语法为 `.value="${this.value}"`。非布尔、字符串、数字的值必须使用 property 绑定。

> 译注：表格对应原文示例及 Chromium CrLitElement 兼容机制，不能直接当作所有原生 LitElement 与任意初始化顺序的保证。示例的 `|| nothing` 也会将 0 等假值视为不设置 attribute，实际代码需按数据语义选择。

<a id="polymer-ironpaper-elements-alternatives"></a>

## Polymer iron / paper 元素的替代

WebUI 历史上大量依赖 Polymer 组件库。下表列出团队开始探索 Lit 时桌面 WebUI 仍使用的元素及替代方式；部分已从非 ChromeOS 桌面构建移除，其余将逐步移除。

即使在 Polymer UI 中，也[不再推荐 iron-、paper- 元素](https://chromium.googlesource.com/chromium/src/+/HEAD/styleguide/web/web.md#Polymer)。

| Polymer 元素 | 替代方式 |
| --- | --- |
| iron-list | cr-infinite-list；小列表用 map，详见迁移章节 |
| iron-icon | cr-icon |
| iron-collapse | cr-collapse |
| paper-spinner | cr-spinner-style CSS，需更多定制时使用 throbber.svg |
| paper-styles | 不使用，属于 2023 refresh 前样式，已从非 ChromeOS 构建移除 |
| iron-flex-layout | 标准 CSS |
| iron-a11y-announcer | cr-a11y-announcer |
| iron-location / iron-query-params | CrRouter 或自定义代码 |
| iron-scroll-target-behavior | 不使用 |
| paper-progress | cr-progress 或配合 CSS 的原生 progress |
| iron-iconset-svg / iron-meta | cr-iconset 与 IconsetMap |
| iron-media-query | window.matchMedia() |
| iron-pages | 条件渲染或 cr-page-selector |
| iron-scroll-threshold | 不使用 |
| iron-resizable-behavior | ResizeObserver，在尺寸变化时触发必要更新 |
| paper-tooltip | cr-tooltip |
| iron-a11y-keys | 不使用 |
| iron-selector / iron-selectable-behavior | CrSelectableMixin |

<a id="anatomy-of-a-lit-based-element"></a>

## Lit 元素的组成

Chromium WebUI 中一个 Lit custom element 使用三个文件：`.ts` 定义元素，导入 `.html.js` 模板及 `.css.js` 样式；`.css` 保存样式，构建时经 css_to_wrapper 生成可导入模块；`.html.ts` 保存模板。

模板可由入库 `.html` 经 html_to_wrapper 生成，适合 Polymer → Lit 迁移；也可直接提交 `.html.ts`，新代码或迁移后的清理推荐后者。Polymer 通常只有两个文件：同时放模板、样式的 HTML，以及元素定义 TS。

`.ts` 示例：

```ts
// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import "//resources/cr_elements/cr_input/cr_input.js"

import { CrLitElement } from "//resources/lit/v3_0/lit.rollup.js"
import { getCss } from "./my_example.css.js"
import { getHtml } from "./my_example.html.js"

export interface MyExampleElement {
  $: {
    input: HTMLElement
  }
}

export class MyExampleElement extends CrLitElement {
  static get is() {
    return "my-example"
  }

  static override get styles() {
    return getCss()
  }

  override render() {
    return getHtml.bind(this)()
  }

  static override get properties() {
    return {
      disabled: {
        type: Boolean,
        reflect: true,
      },
      myValue: { type: String },
    }
  }

  accessor disabled: boolean = false
  accessor myValue: string = "hello world"

  // Referenced from the template, so must be protected (not private).
  protected onInputValueChanged(e: CustomEvent<string>) {
    this.myValue = e.detail.value
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "my-example": MyExampleElement
  }
}

customElements.define(MyExampleElement.is, MyExampleElement)
```

CSS 示例：

```css
/* Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file. */

/* #css_wrapper_metadata_start
 * #type=style-lit
 * #import=//resources/cr_elements/cr_shared_vars.css.js
 * #scheme=relative
 * #css_wrapper_metadata_end */

#input {
  background-color: blue;
  --cr-input-error-display: none;
}

:host([disabled]) #input {
  background-color: gray;
}
```

CSS 文件开头必须有 `#css_wrapper_metadata_start`、`#css_wrapper_metadata_end` 之间的元数据注释，用于生成 `.css.ts` wrapper。`style-lit` 表示 Lit 样式；`#import=//import/path/for/file` 指定 import；`#include="style-name-1 style-name-2"` 指定 include；`scheme=relative` 表示使用 `//resources` 这样的 scheme-relative import。

`.html.ts` 示例：

```ts
// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { html } from "//resources/lit/v3_0/lit.rollup.js"
import type { MyExampleElement } from "./my_example.js"

export function getHtml(this: MyExampleElement) {
  return html` <div>Input something</div>
    <cr-input
      id="input"
      .value="${this.myValue}"
      ?disabled="${this.disabled}"
      @value-changed="${this.onInputValueChanged}"
    >
    </cr-input>`
}
```

BUILD.gn：

```python
build_webui("build") {
  …
  # Use ts_files since the .html.ts file is checked in.
  ts_files = [
     "my_example.html.ts",
     "my_example.ts",
  ]
  # Unlike Polymer, when using Lit non-shared CSS code resides in dedicated
  # CSS files passed to css_to_wrapper.
  css_files = [
    "my_example.css",
  ]
  # Other TS Compiler related arguments…
  ts_deps = [
    "//ui/webui/resources/cr_elements:build_ts",
    "//third_party/lit/v3_0:build_ts",
  ]
}
```

与 Polymer 不同，`.ts`、`.html.ts` 都加入 ts_files，表示没有需要交给 html_to_wrapper 的对应 `.html`，因为模板 TS 已直接入库。

<a id="polymer-to-lit-migrations"></a>

## Polymer 迁移到 Lit

许多样板步骤可通过[迁移脚本](https://source.chromium.org/chromium/chromium/src/+/main:ui/webui/resources/tools/codemods/lit_migration.py)自动完成，见其 [README](https://chromium.googlesource.com/chromium/src/+/main/ui/webui/resources/tools/codemods/lit_migration.md)。

先安装 [jscodeshift](https://github.com/facebook/jscodeshift#readme)：

```
npm install --prefix ui/webui/resources/tools/codemods jscodeshift
```

然后运行脚本，将 most_visited.ts 替换为待迁移文件：

```
python3 ui/webui/resources/tools/codemods/lit_migration.py \
   --file ui/webui/resources/cr_components/most_visited/most_visited.ts
```

以下是脚本无法自动完成的部分。

<a id="computed-properties"></a>

### 计算属性

如果计算属性只用于模板，不反射为 attribute，也不与 Polymer 父元素双向绑定，迁移后通常无需保留独立属性。Lit 自动更新模板变化部分，不必像 Polymer 一样在 HTML 中逐项列出依赖，可直接调用计算方法。

Polymer 模板：

```html
<cr-button hidden="[[hideButton]]">Click Me</cr-button>
```

元素定义：

```ts
static get properties() {
  return {
   loading: Boolean,
   showingDialog: Boolean,
   hideButton: {
     type: Boolean,
     computed: 'computeHideButton(loading, showingDialog)',
   },
 };
}
// Other code goes here

private computeHideButton(): boolean {
  return !this.loading && !this.showingDialog;
}
```

Lit 可完全移除 hideButton 属性，模板改为：

```html
<cr-button ?hidden="${this.computeHideButton()}">Click Me</cr-button>
```

定义改为：

```ts
static get properties() {
  return {
   loading: {type: Boolean},
   showingDialog: {type: Boolean},
 };
}
// Other code goes here
// Anything referenced in the HTML template needs to be protected, not
// private.
protected computeHideButton(): boolean {
  return !this.loading && !this.showingDialog;
}
```

若计算值还要绑定给其他元素、反射为 attribute，或内部逻辑需要，则在依赖改变时于 willUpdate 计算：

```ts
override willUpdate(changedProperties: PropertyValues<this>) {
  super.willUpdate(changedProperties);

  if (changedProperties.has('value')) {
    const values = (this.value || '').split(',');
    this.multipleValues = values.length > 1;
  }
}
```

<a id="observers"></a>

### Observer

按是否需要 DOM，将 observer 逻辑放到 willUpdate 或 updated：查询、测量 DOM 必须在 updated，避免本轮渲染尚未完成；更新其他响应式属性通常放在 willUpdate，以便合并成同一轮更新，避免额外一轮。

Polymer 复杂 observer：

```ts
static get properties() {
  return {
   max: Number,
   min: Number,
   value: Number,
 };
}

static get observers() {
  return [ 'onValueSet(min, max, value)' ];
}

private onValueSet() {
  this.value = Math.min(Math.max(this.value, this.min), this.max);
  const demo = this.shadowRoot!.querySelector('#demo');
  if (demo) {
    demo.style.height = `${this.value}px`;
  }
}
```

迁移后按职责拆分：

```ts
static override get properties() {
  return {
   max: {type: Number},
   min: {type: Number},
   value: {type: Number},
 };
}

override willUpdate(changedProperties: PropertyValues<this>) {
  super.willUpdate(changedProperties);
  // Clamp value in willUpdate() so we don't trigger a second update
  // cycle for the same changes.
  if (changedProperties.has('min') || changedProperties.has('max') ||
      changedProperties.has('value')) {
    this.value = Math.min(Math.max(this.value, this.min), this.max);
  }
}

override updated(changedProperties: PropertyValues<this>) {
  super.updated(changedProperties);

  // Querying and modifying the DOM should happen in updated().
  if (changedProperties.has('value')) {
    const demo = this.shadowRoot!.querySelector('#demo');
    if (demo) {
      demo.style.height = `${this.value}px`;
    }
  }
}
```

<a id="dom-if"></a>

### dom-if

通常用 `.html.ts` 中返回 html 模板或空字符串的三元表达式替代 `<template is="dom-if">`。以下简化自 cr-toolbar。

Polymer cr_toolbar.html：

```html
<div id="content">
  <template is="dom-if" if="[[showMenu]]" restamp>
    <cr-icon-button id="menuButton" class="no-overlap" iron-icon="cr20:menu" on-click="onMenuClick">
    </cr-icon-button>
  </template>
  <h1>[[pageName]]</h1>
</div>
```

Lit cr_toolbar.html.ts：

```html
<div id="content">
  ${this.showMenu ? html`
  <cr-icon-button
    id="menuButton"
    class="no-overlap"
    iron-icon="cr20:menu"
    @click="${this.onMenuClick}"
  >
  </cr-icon-button
  >` : ''}
  <h1>${this.pageName}</h1>
</div>
```

Lit 条件渲染对应使用 restamp 的 dom-if，这也是 WebUI 绝大多数用法。

<a id="dom-repeat"></a>

### dom-repeat

通常用 `this.myItems.map((item, index) => html...)` 替代 dom-repeat。Polymer 会给重复模板中的事件附加 item、index，即 DomRepeatEvent；Lit handler 收到原始事件，不会自动附加。

迁移时必须改为其他方式获取这些数据，例如将 index 或 item 信息放入触发事件元素的 data attribute。

Polymer 模板：

```html
<template is="dom-repeat" items="[[listItems]]">
  <div class="item-container [[getSelectedClass(item, selectedItem)]]">
    <cr-button id="[[getItemId(index)]]" on-click="onItemClick"> [[item.name]] </cr-button>
  </div>
</template>
```

Polymer 定义：

```ts
private getItemId(index: number): string {
  return 'listItemId' + index;
}

private getSelectedClass(item: ListItemType): string {
  return (item === this.selectedItem) ? 'selected' : '';
}

private onItemClick(e: DomRepeatEvent<ListItemType>) {
  this.selectedItem = e.model.item;
  // Autoscroll to selected item if it is not completely visible.
  const list =
      this.shadowRoot!.querySelectorAll<HTMLElement>('.item-container');
  const selectedElement = list[e.model.index];
  assert(selectedElement!.classList.contains('selected'));
  selectedElement!.scrollIntoViewIfNeeded();
}
```

Lit 模板：

```ts
${this.listItems.map((item, index) => html`
  <div class="item-container ${this.getSelectedClass(item)}">
    <cr-button id="${this.getItemId(index)}"
        data-index="${index}" @click="${this.onItemClick}">
      ${item.name}
    </cr-button>
  </div>
`)}
```

这里给触发 click 的 cr-button 设置 data-index。

Lit 定义：

```ts
protected getItemId(index: number): string {
  return 'listItemId' + index;
}

protected getSelectedClass(item: ListItemType): string {
  return item === this.selectedItem ? 'selected' : '';
}

protected onItemClick(e: Event) {
  const currentTarget = e.currentTarget as HTMLElement;

  // Use dataset to get the index set in the .html.ts template.
  const index = Number(currentTarget.dataset['index']);
  this.selectedItem = this.listItems[index];

  // Autoscroll to selected item if it is not completely visible.
  const list =
      this.shadowRoot!.querySelectorAll<HTMLElement>('.item-container');
  const selectedElement = list[index];
  selectedElement!.scrollIntoViewIfNeeded();
}
```

<a id="migrating-iron-list-clients"></a>

### 迁移 iron-list 使用方

许多现有列表数量有上限且不大，例如约 100 项，不需要虚拟化，直接用 Lit map。真正大量条目可用 cr-infinite-list，复用 iron-list 的聚焦、导航行为，内部使用 cr-lazy-list。

cr-lazy-list 在滚动到条目时才把它加入 DOM，还利用 CSS content-visibility 避免视口外渲染。如果需自定义导航、聚焦行为，可像 Tab Search 的 selectable-lazy-list 一样直接使用它。三种方案都不适合时，联系 WebUI 团队。

渐进迁移时可先迁移子元素，但 iron-list 手动定位条目，必须知道尺寸何时变化。子元素中影响高度的属性变化后，需在 updated 主动发 iron-resize。

父级 list_parent.html，仍是 Polymer：

```html
<iron-list id="list" items="[[listItems]]" as="item">
  <template>
    <custom-item description="[[item.description]]" name="[[item.name]]" on-click="onListItemClick">
    </custom-item>
  </template>
</iron-list>
```

子级 custom_item.html.ts：

```html
<div class="name">${this.name}</div>
<div class="description" ?hidden="${!this.description}">${this.description}</div>
```

Description 影响高度。如果不在渲染完成后通知 iron-list，可能测得错误高度，出现空隙或重叠。因此 description 变化时在 updated 发事件。

custom_item.ts：

```ts
override updated(changedProperties: PropertyValues<this>) {
  super.updated(changedProperties);
  if (changedProperties.has('description')) {
    this.fire('iron-resize');
  }
}
```

<a id="additional-lit-and-polymer-differences"></a>

## Lit 与 Polymer 的其他差异

<a id="use-of-the-accessor-keyword"></a>

### accessor 关键字

Lit 属性应使用 accessor 声明，而非 Polymer 常用的 declare。Polymer 有 value 字段提供初始化，无需构造函数赋值；Lit 若用 declare，则还需在构造函数显式初始化每个响应式属性，加上 properties getter 和成员声明，会产生大量重复代码。

因此原文推荐 accessor。所述 Chromium 尚未原生支持时，TypeScript 在 target=ES2024 下为每个属性生成 getter、setter、JS private 字段。使用 build_webui 且依赖 Lit 的 WebUI 默认采用此 target。

若两者都不用，TypeScript 生成实例字段，会遮蔽 Lit 在原型安装的 getter / setter，导致响应性失效。这源于 [public class fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields) 语义。`useDefineForClassFields:false` 可避免，但原文指出它已弃用、未来将移除，新 Lit / Polymer 目标不应依赖。

<a id="i18n-replacements-in-checked-in-htmlts-files"></a>

### 入库 .html.ts 的 i18n 替换

Lit 推荐直接提交 `.html.ts`。为了让 C++ `$i18n{}` 替换识别模板，需要在模板字符串首尾添加标记：

```ts
export function getHtml(this: MyExampleElement) {
  return html`<!--_html_template_start_-->
    <div>$i18n{inputLabel}</div>
    <cr-input
      id="input"
      .value="${this.myValue}"
      ?disabled="${this.disabled}"
      @value-changed="${this.onInputValueChanged}"
    >
    </cr-input>
    <!--_html_template_end_-->`
}
```

<a id="testing"></a>

### 测试

许多测试原本这样写：

```ts
// Validate that the input is disabled when invalid is set.
myTestElement.invalid = true
assertTrue(myTestElement.$.input.disabled)
```

它假定设置 invalid 后 DOM 同步更新。Lit 不满足此假定，需要等待渲染周期：推荐 `chrome://webui-test/test_util.js` 的 `await microtasksFinished()`，内部等待零延时 setTimeout，使多元素更新有机会完成；也可直接等待被测元素的 updateComplete。

修改后：

```ts
// Validate that the input is disabled when invalid is set.
myTestElement.invalid = true
await microtasksFinished()
assertTrue(myTestElement.$.input.disabled)
```

> 许多测试更适合等待操作应触发的具体事件或 BrowserProxy 调用，而非假定同步，或依赖 microtasksFinished、Polymer waitAfterNextRender / flushTasks 等辅助方法。后者并不保证某个具体业务行为已经发生。

<a id="use-of-the-hidden-attribute"></a>

### hidden attribute

[Polymer 风格指南](https://chromium.googlesource.com/chromium/src/+/HEAD/styleguide/web/web.md#Polymer)曾推荐少量 HTML 或单元素显隐使用 hidden，避免 dom-if 开销。Lit 条件渲染不需要额外 custom element，因此不存在同样的性能顾虑。

Lit 大多数场景可用条件渲染代替 hidden；原先使用 dom-if 的地方，应迁移为条件渲染。
