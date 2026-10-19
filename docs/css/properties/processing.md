# 值处理阶段：从声明到布局使用的值

声明胜出，不代表尺寸已经确定。`width: 50%` 要结合包含块求解，`color: var(--tone)` 要完成变量替换；它们分别发生在层叠之后的不同阶段。

## 六个阶段分别处理什么

```html
<div class="container">
  <div class="item">Half the container width.</div>
</div>
```

```css
.container {
  width: 400px;
}
.item {
  box-sizing: content-box;
  width: 120px;
  width: 50%;
  padding: 0;
  border: 0;
  margin: 0;
}
```

固定为普通横排块布局，无其他规则或尺寸约束：

| 阶段 | 处理内容 | 本例的 width |
| --- | --- | --- |
| Declared values（声明值） | 收集适用且有效的候选声明 | 120px、50% |
| Cascaded value（层叠值） | 按来源、重要性、层、specificity 等排序，选出胜出声明 | 50%，同一规则中后写者胜出 |
| Specified value（指定值） | 处理默认化，确定计算起点 | 50% |
| Computed value（计算值） | 处理变量替换、相对值等，具体转换由属性定义 | 50%，width 在此保留百分比 |
| Used value（使用值） | 结合布局条件求解 | 200px |
| Actual value（实际值） | 考虑设备及实现精度等限制 | 本例可仍为 200px |

阶段不同，值可以相同。规范定义见 [CSS Cascade 5 值处理](https://www.w3.org/TR/css-cascade-5/#value-stages)。

## Specificity 用于层叠，不属于 specified 阶段

specificity 是选择器的权重，层叠排序在适当的竞争范围内使用它，决定哪个声明成为 cascaded value。它不等到 specified 阶段再比较。完整排序见[声明优先级](./cascade.md)。

specified 阶段主要解决默认化：有普通胜出值时采用它；没有层叠值时，默认继承的属性取父元素计算值，否则取初始值。显式 inherit、initial 等关键字也按各自规则处理，见[默认值与回退](./defaulting.md)。

ID 规则战胜 class 规则发生在层叠阶段；没有自身 color 声明而继承父色属于默认化。Specificity 不是 specified 的处理步骤。

## Computed 与 Used：是否已结合布局条件求解

上例 computed width 为 50%，保留比例关系；used width 为 200px，已代入当前包含块宽度。容器改为 600px，计算值仍是 50%，使用值变为 300px。

在同样的普通块条件下，width: auto 的计算值保留 auto，布局求得使用值为可用内容宽 400px。换成 Flex、Grid 或绝对定位，auto 必须按相应算法求解。

计算值不一定是相对值：font-size 的 em 通常在计算阶段就转为绝对长度。若 width: 200px 且无额外约束，计算值和使用值也可以相同。

## Width 与 max-width：约束在 Used value 求解时结合

沿用 400px 容器及原有盒模型条件，将 item 的宽度声明替换为：

```css
.item {
  width: 50%;
  max-width: 180px;
}
```

| 阶段     | width                                | max-width        |
| -------- | ------------------------------------ | ---------------- |
| 层叠     | 独立选出 50%                         | 独立选出 180px   |
| 计算值   | 50%                                  | 180px            |
| 布局求解 | 候选宽 200px，受上限约束后采用 180px | 提供最大宽度约束 |

它们是不同属性，不比较彼此的 specificity。Max-width 没有把 width 的计算值改为 180px，而是参与使用值求解。

容器若缩到 300px，候选宽为 150px，未触及上限，使用值就是 150px。若再加入 min-width，则需共同求解；在此普通块条件下，最小宽度与最大宽度冲突时，最小宽度优先。

## Used 与 Actual：布局结果与实现精度

容器宽 401px 时，50% 对应的 used width 为 200.5 个 CSS 像素。Actual value 描述这个结果在设备和实现精度约束下的实际采用值，不是重新求百分比。

不能据此断言 actual 必为 201px：浏览器可以保留子像素布局，CSS 像素也不一定与设备像素一一对应。若无需精度调整，actual 与 used 相同。

## 计算时失效：为什么没有重新采用前一条 color

```html
<div class="parent">
  <p class="message">Check the computed color.</p>
</div>
```

```css
.parent {
  color: rebeccapurple;
  --tone: 12px;
}
.message {
  color: blue;
  color: var(--tone, green);
}
```

没有其他相关声明时，文字为父元素的紫色：

1. 层叠选中后写的 var() 声明，blue 被覆盖。
2. 计算时取得 --tone 的值 12px；变量有效，所以不选择 green。
3. 替换后的 color: 12px 无效，按 unset 的方式处理；color 默认继承，因此取得父色。

计算时失效不会重新层叠找回 blue。若直接写 color: 12px，它在解析时就被忽略，blue 则能胜出。规则见 [CSS Variables 的计算时失效处理](https://www.w3.org/TR/css-variables-1/#invalid-at-computed-value-time)。

| 改动                                  | 结果       | 原因                                |
| ------------------------------------- | ---------- | ----------------------------------- |
| 保留未注册的 --tone: 12px，使用 var() | 父元素紫色 | 目标属性计算时失效                  |
| 删除 --tone，且无其他声明或继承值     | green      | 变量为 guaranteed-invalid，使用回退 |
| 直接写 color: 12px，不使用 var()      | blue       | 后一条解析时无效                    |
| 将 --tone 改为 red                    | red        | 替换后符合颜色语法                  |

## 注册初始值与 var() 回退分别在哪个阶段生效

`initial-value` 定义注册属性本身的初始值，fallback 属于某次变量引用：

| 机制                       | 流程位置                                                 |
| -------------------------- | -------------------------------------------------------- |
| @property 的 initial-value | 注册时定义；默认化可采用它，计算时类型失效后也可能回到它 |
| var(--tone, fallback)      | 计算值阶段解析引用，变量为 guaranteed-invalid 时选择回退 |

沿用前面的 HTML，替换为以下 CSS。假定浏览器接受注册，且没有其他相关声明：

```css
@property --tone {
  syntax: "<color>";
  inherits: false;
  initial-value: teal;
}

.parent {
  color: rebeccapurple;
}
.message {
  color: blue;
  color: var(--tone, green);
}
```

Message 未声明 --tone，且注册禁止继承，默认化采用初始值 teal。计算 color 时，var() 已能取得有效的 teal，因此不选 green。

若再给 message 依次声明 `--tone: blue; --tone: 12px`，后一条先胜出，计算时注册类型检查失败；因 inherits: false，--tone 回到 teal，不恢复 blue。随后 color 仍取得 teal。

| --tone 的状态             | var() 替换值        | color 的结果 |
| ------------------------- | ------------------- | ------------ |
| 未注册且无声明或继承值    | green               | green        |
| 未注册，值为 12px         | 12px                | 继承父色     |
| 上述注册生效，未声明      | teal                | teal         |
| 上述注册生效，声明为 12px | 类型失效后取得 teal | teal         |

若 inherits 为 true，默认化或类型失效后可能取得父元素值，不能概括成“注册属性出错总取初始值”。规则见 [注册属性的计算值处理](https://www.w3.org/TR/css-properties-values-api-1/#calculation)。

Fallback 也不保证目标值合法：`color: var(--missing, 12px)` 即使选中回退 12px，color 仍会计算时失效。替换规则见 [CSS Variables](https://www.w3.org/TR/css-variables-1/#resolve-variables)。

## API 返回值不一定对应名字中的阶段

在开头无 max-width 约束的例子中，`getComputedStyle(element).width` 返回类似 `"200px"`，而非 `"50%"`。它暴露 resolved value；width 在规定条件下返回使用值，不能仅凭 API 名称认定返回的都是 computed value。规则见 [CSSOM](https://www.w3.org/TR/cssom/#resolved-values)。

`getBoundingClientRect()` 返回视觉边界矩形，受 padding、border、transform 等影响。变换后矩形变宽，不代表参与布局的 width 使用值也随之变大，它也不是读取任意属性 actual value 的通用接口。
