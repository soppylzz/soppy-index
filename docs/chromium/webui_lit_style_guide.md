> 英文原文：[本地副本](en/webui_lit_style_guide.md) · [Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/webui/webui_lit_style_guide.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="webui-lit-style-guide"></a>

# WebUI Lit 风格指南

- [概述](#overview)
- [CrLitElement 子类规范（.ts）](#crlitelement-subclass-guidelines-ts)
  - [方法定义顺序](#method-definition-order)
  - [字段定义顺序](#class-fields-definition-order)
  - [使用 CrLitElement 的辅助方法](#leverage-helper-methods-of-the-crlitelement-superclass)
    - [尽可能用 this.fire() 发事件](#use-thisfire-for-firing-events-where-possible)
- [模板规范（.html.ts）](#template-guidelines-htmlts)
  - [模板不承载业务逻辑](#logic-free-templates)
    - [复用 HTML 片段](#reusing-chunks-of-html)
  - [内联 Lambda](#inline-lambdas)
  - [循环变量](#loop-variables)
  - [格式化](#formatting)
  - [泛型 UI 元素](#templatized-ui-elements)
- [命名约定](#naming-conventions)
  - [DOM 名、文件名与类名](#crlitelement-dom-file-class-names)
  - [事件](#events)
  - [事件处理方法](#event-handlers)
- [DOM 访问](#dom-access)
  - [静态元素](#static-elements)

<a id="overview"></a>

## 概述

本指南给出 Chromium WebUI 使用 Lit 时的编码标准与最佳实践，目标是保持代码质量、一致性和性能，是 [Chromium Web 开发风格指南](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/styleguide/web/web.md)的补充。

> 译注：这是 Chromium 项目的约定，不是 Lit 或 Web 平台对所有项目的强制要求。

<a id="crlitelement-subclass-guidelines-ts"></a>

## CrLitElement 子类规范（.ts）

元素类应采用以下结构：

```ts
// my_button.ts example contents

import {getCss} from './my_button.css.js';
import {getHtml} from './my_button.html.js';

class MyButtonElement extends CrLitElement {
 static get is() {
    return 'my-button';
  }

  static override get styles() {
    return getCss();
  }

  override render() {
    return getHtml.bind(this)();
  }

  static override get properties() {
    return {
      ...
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cr-button': MyButtonElement;
  }
}

customElements.define(MyButtonElement.is, MyButtonElement);
```

必须包含：

1. 类名以 Element 结尾，与 HTMLButtonElement 等原生类型一致，表明它是 UI 组件。
2. `static get is()` 返回 custom element 的 DOM 名称。
3. HTMLElementTagNameMap 声明 DOM 名与类的映射，让 TypeScript 推断 createElement、querySelector、querySelectorAll 的结果类型。放在同一文件的类定义之后。
4. customElements.define 注册运行时元素，使浏览器知道遇到相应 DOM 名时实例化哪个类，也放在类定义之后。
5. 用 getHtml 从对应 `.html.ts` 导入模板，不内联定义。测试用 dummy element，以及实现定制渲染的底层 cr_elements，可以例外直接使用 html / render。

<a id="method-definition-order"></a>

### 方法定义顺序

适用的方法按如下顺序：is、styles、render、properties、constructor、connectedCallback、disconnectedCallback、willUpdate、firstUpdated、updated。

<a id="class-fields-definition-order"></a>

### 字段定义顺序

字段放在 properties getter 后、constructor 前；没有 constructor 时，放在上述顺序中下一个方法之前。有对应 Lit 响应式属性的字段，与没有对应属性的字段之间空一行：

```ts
  static override get properties() {
    return {
      isActive: {type: Boolean},
      isDefault: {type: Boolean},
    };
  }

  accessor isActive: boolean = false;
  accessor isDefault: boolean = false;

  private browserProxy_: BrowserProxy = browserProxyFactory.getInstance();
```

<a id="leverage-helper-methods-of-the-crlitelement-superclass"></a>

### 使用 CrLitElement 的辅助方法

<a id="use-thisfire-for-firing-events-where-possible"></a>

#### 尽可能用 this.fire() 发事件

不推荐：

```ts
this.dispatchEvent(new CustomEvent(
  'event-one', {bubbles: true, composed: true}));

this.dispatchEvent(new CustomEvent(
  'event-two', {bubbles: true, composed: true, detail: someValue}));
```

推荐：

```ts
this.fire('event-one');
this.fire('event-two', someValue);

// OK to use dispatchEvent() when firing non-bubbling or non-composed events.
this.dispatchEvent(new CustomEvent('event-three', {detail: someValue}));
```

注意 fire 创建 bubbles、composed 均为 true 的事件。如果需要不冒泡或不跨 shadow boundary，直接使用 dispatchEvent。

<a id="template-guidelines-htmlts"></a>

## 模板规范（.html.ts）

<a id="logic-free-templates"></a>

### 模板不承载业务逻辑

模板保持声明式，避免 let / const 局部变量、除唯一 getHtml 外的函数定义、if / for 语句及其他复杂逻辑。

复杂逻辑放到 `.ts` 辅助方法；多处使用或相对独立的 HTML 模块，拆为 custom element。目标是明确职责：`.html.ts` 大致像普通 HTML，只添加少量 Lit expression；非简单 TS 逻辑交给 `.ts`，而 `.ts` 不直接定义模板片段。

不推荐：

```ts
// my_element.html.ts
export function getHtml(this: MyElement) {
  const isVisible = this.someCondition && this.otherCondition;
  return html`
    <div ?hidden="${isVisible}">...</div>
  `;
}
```

推荐：

```ts
// my_element.ts
protected accessor isVisible = false;

// my_element.html.ts
export function getHtml(this: MyElement) {
  return html`
    <div ?hidden="${!this.isVisible}">...</div>
  `;
}
```

<a id="reusing-chunks-of-html"></a>

#### 复用 HTML 片段

通常将多处使用的 HTML 提取为 custom element。这是模板复用的常规方式，类似共享样式复用 CSS、mixin 或辅助类复用 TS 行为。但有三个例外或替代方案。

1. 很小的片段可直接重复，为其创建 custom element 成本过高。例如：

```ts
// my_element.html.ts
export function getHtml(this: MyElement) {
  // Small amount of repeated HTML for the cr-button is okay.
  return html`
    ${this.submitButtonFirst ? html`
      <cr-button id="submit" @click="${this.onSubmitClick}">
        $i18n{submit}
      </cr-button>
    ` : ''}
    <cr-button id="cancel" @click="${this.onCancelClick}">
      $i18n{cancel}
    </cr-button>
    ${!this.submitButtonFirst ? html`
      <cr-button id="submit" @click="${this.onSubmitClick}">
        $i18n{submit}
      </cr-button>
    ` : ''}
  `;
}
```

2. 仅为改变外观时，优先条件样式，而非条件切换 DOM。有时看似需要把同一片段放在两个不同位置，其实只是为了改变它或周围 DOM 的外观，CSS 更合适。

不推荐：

```css
/* my_element.css */
.fancy-css {
  border: 4px solid blue;
}
```

```ts
// my_element.html.ts
export function getHtml(this: MyElement) {
  const button = html`
      <cr-button id="submit" @click="${this.onSubmitClick}">
        $i18n{submit}
      </cr-button>`;
  return html`
    ${this.fancyStyleEnabled ? html`
      <div class="fancy-css">${button}</div>
    ` : button}
  `;
}
```

推荐：

```css
/* my_element.css */
:host([fancy-style-enabled]) .wrapper {
  border: 4px solid blue;
}
```

```ts
// my_element.html.ts
export function getHtml(this: MyElement) {
  return html`
    <div class="wrapper">
      <cr-button id="submit" @click="${this.onSubmitClick}">
        $i18n{submit}
      </cr-button>
    </div>
  `;
}
```

3. 很长但元素很少、主要由大量属性和事件绑定组成的重复片段，可放到独立辅助 `.html.ts` 导入。提取 custom element 并无收益，因为仍需为新组件再写一遍这些绑定。

示例：

```ts
// my_element_fancy_button.html.ts
export function getHtml(this: MyElement) {
  return html`
<fancy-button .prop1="${this.prop1}"
    .prop2="${this.prop2}"
    .prop3="${this.prop3}"
    .prop4="${this.prop4}"
    .prop5="${this.prop5}"
    .prop6="${this.prop6}"
    .prop7="${this.prop7}"
    .prop8="${this.prop8}"
    .prop9="${this.prop9}"
    @one="${this.onButtonOne}"
    @two="${this.onButtonTwo}"
    @three="${this.onButtonThree}"
    @four="${this.onButtonFour}">
</fancy-button>
`;
}
```

```ts
// my_element.html.ts
import {getHtml as getFancyButtonHtml} from './my_element_fancy_button.html.js';

export function getHtml(this: MyElement) {
  return html`
${this.compact ? html`
  <div class="compact">
    ${getFancyButtonHtml.bind(this)()}
    <cr-input id="input></cr-input>
  </div>
` : html`
  <div class="tall">
    <cr-textarea id="input></cr-textarea>
    <fancy-menu>
      ${getFancyButtonHtml.bind(this)()}
    </fancy-menu>
  </div>
`}
```

<a id="inline-lambdas"></a>

### 内联 Lambda

不要在模板中用内联箭头函数向事件 handler 传数据。每次 render 创建函数会影响性能和可读性。

常见需求是绑定额外数据。可改为在 data-* attribute 绑定唯一标识，通常为 index，再由 handler 读取。

不推荐：

```html
${this.items.map(item => html`
  <button @click="${() => this.onItemClick(item)}">${item}</button>
`)}
```

推荐：

```html

${this.items.map((item, index) => html`
  <button data-index="${index}" @click="${this.onItemClick}">${item}</button>
`)}
```

```ts
protected onItemClick(e: Event) {
  const currentTarget = e.currentTarget as HTMLElement;
  const item = items[Number(currentTarget.dataset['index'])];
}
```

<a id="loop-variables"></a>

### 循环变量

使用 map 渲染列表时，统一优先命名 item；嵌套循环可用更具体名称避免混淆。

```ts
${this.items.map(item => html`...`)}
```

<a id="formatting"></a>

### 格式化

用 `// clang-format off`、`// clang-format on` 包围 getHtml 或 render 的 return，避免 clang-format 破坏模板可读性。

```ts
export function getHtml(this: MyCrLitElement) {
  // clang-format off
  return html`
    <!--_html_template_start_-->
    <div>...</div>
    <!--_html_template_end_-->`;
  // clang-format on
}
```

<a id="templatized-ui-elements"></a>

### 泛型 UI 元素

在模板为 cr-lazy-list、cr-infinite-list 等泛型元素绑定 `.template`、`.items` 时，`@webui-eslint/lit-element-expressions` 检查属性类型兼容性。

默认从 HTMLElementTagNameMap 解析标签，泛型参数通常是 unknown，例如 CrLazyListElement<unknown>。如果传入 `(item:MyItem,index:number)=>TemplateResult` 这样的强类型回调，参数 MyItem 不能满足预期的 unknown，会报类型不兼容。

要提供精确类型，应给模板元素设置 ID，例如 list，并在 **`.html.ts` 而非类定义 `.ts`** 导出 TemplatizedDomNodes 接口，将 ID 映射到具体泛型类型：

```ts
// my_element.html.ts
import type {CrLazyListElement} from '//resources/cr_elements/cr_lazy_list/cr_lazy_list.js';
import {html} from '//resources/lit/v3_0/lit.rollup.js';

import type {MyItem} from './my_item.js';
import type {MyElement} from './my_element.js';

export interface TemplatizedDomNodes {
  list: CrLazyListElement<MyItem>;
}

export function getHtml(this: MyElement) {
  return html`<!--_html_template_start_-->
<cr-lazy-list id="list" .items="${this.items}"
    .template="${(item: MyItem, index: number) => html`
      <div>${item.name}</div>
    `}">
</cr-lazy-list>
<!--_html_template_end_-->`;
}
```

<a id="naming-conventions"></a>

## 命名约定

<a id="crlitelement-dom-file-class-names"></a>

### DOM 名、文件名与类名

DOM 名不以 -element 结尾；文件名不以 _element 结尾；类名以 Element 结尾；类名、文件名从 DOM 名派生。

例如 DOM 名 foo-bar-baz，类名可为 `<OptionalPrefix>FooBarBazElement`、BarBazElement 或 BazElement；文件可为 `foo_bar_baz.{css,html,ts}`、`bar_baz.{css,html,ts}`、`baz.{css,html,ts}`。

<a id="events"></a>

### 事件

使用小写 kebab-case，描述已经发生的事情，而非要求处理者将做什么。推荐 close-click、selection-change-click；不推荐 close-dialog、update-selection。

<a id="event-handlers"></a>

### 事件处理方法

命名为 `on<OptionalContext>[Event]`。推荐 onRetryClick、onSelectionChanged、onPointerdown；不推荐 onRetryClicked、handleRetry、selectionHandler。

如果绑定的 DOM 节点有 ID，OptionalContext 应使用该 ID。

不推荐：

```html
<button id="foo" @click="${this.onBarClick}"></button>
```

推荐：

```html
<button id="foo" @click="${this.onClick}"></button>
<button id="foo" @click="${this.onFooClick}"></button>
```

<a id="dom-access"></a>

## DOM 访问

<a id="static-elements"></a>

### 静态元素

对于始终存在于 Shadow DOM、不是条件渲染一部分的元素，优先用 `this.$.<id>`，比 shadowRoot.querySelector 更统一，并提供严格类型。

不推荐：

```ts
const button = this.shadowRoot.querySelector('#submitButton');
```

推荐：

```ts
// In your class definition
export interface MyElement {
  $: {
    submitButton: CrButtonElement,
  }
}

// In your code
const button = this.$.submitButton;
```
