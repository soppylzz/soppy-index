# CSS 高频手写题

这里将常见 CSS 面试题拆成 24 个独立演示。每题的 `index.html` 展示结构，`style.css` 保留核心机制；共享的 `base.css` 只负责基础外观。页面不使用 JavaScript，也不依赖组件库。

练习时可以先从题目要求写出自己的 CSS，再对照对应文件，最后改变文字长度、容器尺寸和浏览器宽度，检查自己的解释是否仍然成立。

## 运行

在仓库根目录安装依赖后，进入 `coding/css/` 执行：

| 命令           | 用途                                            |
| -------------- | ----------------------------------------------- |
| `pnpm dev`     | 打开 `http://127.0.0.1:5186/`，从目录页选择题目 |
| `pnpm build`   | 将目录页及全部题目构建到 `dist/`                |
| `pnpm preview` | 构建后打开 `http://127.0.0.1:5187/`             |

服务器在终端按 `Ctrl+C` 停止，端口占用时直接报错。所有页面也可以直接打开 HTML 预览；构建结果请通过 HTTP 访问。Vite 配置复用仓库根 TypeScript 配置，类型检查在根目录运行 `pnpm typecheck`。

## 布局：先确定空间由谁分配

居中需要先回答两个问题：容器是否有多余空间，元素是否仍然占据普通文档流位置。Flex、Grid 在布局阶段分配空间；绝对定位则先离开普通文档流，再通过偏移与变换移动自身。

| 题目与实现 | 核心原理与追问 |
| --- | --- |
| [01 Flex 水平垂直居中](exercises/01-flex-center/style.css) | `justify-content` 对齐主轴，`align-items` 对齐交叉轴。本例默认主轴水平；换成 `column` 后轴的方向会改变。容器用最小高度提供可分配空间。 |
| [02 Grid 水平垂直居中](exercises/02-grid-center/style.css) | 单个网格项用 `place-items: center` 对齐到网格区域中心。追问多个元素时，要区分每项居中和整个项目组居中。 |
| [03 绝对定位居中](exercises/03-absolute-center/style.css) | 父元素定位建立包含块，`top/left: 50%` 以包含块为参照，`translate(-50%, -50%)` 默认以自身变换参考盒为参照。子元素不定宽高也能居中，但不会撑高父元素。 |
| [04 固定侧栏与自适应内容](exercises/04-two-column/style.css) | 侧栏不伸缩，主区分配剩余空间。`min-width: 0` 允许主区缩小，长单词还需要独立的断行策略。窄屏时改为纵向排列。 |
| [05 两侧固定的三栏布局](exercises/05-three-column/style.css) | Grid 中间轨道使用 `minmax(0, 1fr)`，避免默认最小尺寸被内容撑大；两侧指定固定宽度。窄屏转单列。 |
| [06 圣杯布局](exercises/06-holy-grail/style.css) | 中间栏 DOM 在前且宽度为 100%，侧栏靠浮动和负外边距回到同一行，再用相对定位移入父容器预留的左右 padding。追问负百分比 margin 的参照及最小可用宽度。 |
| [07 双飞翼布局](exercises/07-double-wing/style.css) | 中间外层占满宽度，内部内容用 margin 留出侧栏空间，侧栏通过负 margin 覆盖外层两端。与圣杯相比，预留空间发生在中间内层，无需侧栏相对定位。 |
| [08 等高卡片与底部操作](exercises/08-equal-height/style.css) | 外层 Flex 拉伸同一行卡片；卡片内部纵向 Flex，链接的 `margin-top: auto` 吸收剩余空间。本例不换行；换行后各行独立计算高度，不保证所有行等高。 |
| [09 内容不足时页脚贴底](exercises/09-sticky-footer/style.css) | 页面纵向 Flex 且最小高度为视口高度，主区增长填满空白。页脚留在文档流中，内容增多时被向下推。展开页面中的长内容观察区别；这不是 `position: fixed`。 |
| [10 局部滚动吸顶标题](exercises/10-sticky-header/style.css) | `sticky` 配合 `top`，以最近建立滚动机制的祖先为参照，并受包含块边界限制。本例在局部滚动面板内滚动，每个标题到自己章节末尾就被推走。 |

圣杯和双飞翼用于理解历史面试题。它们依赖宽度、浮动与负 margin 的配合，窄容器可能错行，本例在窄屏重置为普通块布局。新的多栏需求优先考虑 Flex 或 Grid；DOM 阅读顺序仍应符合内容语义。

## 文档流：解释溢出与边距为何出现

| 题目与实现 | 核心原理与观察 |
| --- | --- |
| [11 清除浮动与包含浮动](exercises/11-clear-floats/style.css) | 对比未处理、`::after` 加 `clear: both`、`display: flow-root`。浮动不按普通块的方式撑开父元素；clearfix 在末尾引入清除浮动的盒，flow-root 建立 BFC 并包含其内部浮动。 |
| [12 父子外边距折叠](exercises/12-margin-collapse/style.css) | 当父元素没有阻隔条件时，第一个普通流子元素的上外边距可能与父元素折叠。左侧绿色背景外出现空隙，右侧 `flow-root` 阻止父子折叠，空隙留在绿色区域内。这里不演示兄弟外边距折叠。 |
| [13 Flex 文本溢出修复](exercises/13-flex-overflow/style.css) | 长的不换行文本抬高 Flex 项的自动最小宽度，仅给内部段落加省略号仍可能挤破行宽。对比外层 Flex 项默认最小宽度与 `min-width: 0`；上方容器可横向滚动，下方文本在可用空间内省略。 |

BFC 不会消除所有边距，也不是所有溢出的通用修复。用 `overflow: hidden` 清浮动会顺带裁剪内容；这里只需要独立格式化上下文时，`flow-root` 更直接。

## 响应式与文本

| 题目与实现 | 核心原理与边界 |
| --- | --- |
| [14 自适应卡片网格](exercises/14-responsive-grid/style.css) | `auto-fit` 按可用空间生成轨道，`minmax` 设置卡片下限和扩张上限。下限再用 `min(100%, 14rem)`，避免容器比卡片下限还窄时产生横向溢出。追问 `auto-fill` 保留空轨道的区别。 |
| [15 固定比例与图片裁剪](exercises/15-aspect-ratio/style.css) | `aspect-ratio` 给出首选宽高比，一个维度自动时参与尺寸计算；内容、最小尺寸和显式宽高都可能改变最终结果。图片通过绝对定位填满比例框，不参与撑高容器；`cover` 裁剪，`contain` 留白。 |
| [16 单行省略](exercises/16-single-ellipsis/style.css) | 有限宽度、禁止换行、隐藏溢出和 `text-overflow: ellipsis` 共同作用；省略号不会自动让 Flex 项缩小。页面保留展开完整文本的入口。 |
| [17 三行省略](exercises/17-multi-ellipsis/style.css) | 使用 `display: -webkit-box`、纵向排列与 `-webkit-line-clamp: 3` 的兼容组合，配合隐藏溢出。未支持时的高度限制只能裁剪，不保证省略号；展开入口提供完整文本。 |

单行省略有明确的行内溢出条件；多行截断的兼容性应单独判断。不要因为开发浏览器支持就假设无前缀 `line-clamp` 已覆盖所有目标浏览器，参见 [MDN line-clamp](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/line-clamp)。

## 图形：看懂边框和伪元素

| 题目与实现 | 核心原理与边界 |
| --- | --- |
| [18 四方向三角形](exercises/18-triangles/style.css) | 零内容宽高的盒，其边框交界形成斜边，保留一侧颜色、其余透明。方向由着色边的相对位置决定，例如下边框着色得到朝上的三角形。 |
| [19 气泡箭头](exercises/19-speech-bubble/style.css) | 气泡建立定位参照，伪元素画三角形并定位到下边缘。箭头仅作装饰，消息正文仍写在 HTML 中。若需要外描边，可叠加两层三角形，但还要处理接缝。 |
| [20 半 CSS 像素细边框](exercises/20-hairline/style.css) | 伪元素尺寸放大到两倍，画 1 CSS px 边框，再缩小一半。名义厚度是 0.5 CSS px，设备像素比、缩放和光栅化影响实际效果，不能保证每台设备恰好一个物理像素。 |

## 动画与原生交互

CSS 负责视觉状态，交互状态交给原生表单控件与 disclosure 元素。保留可聚焦控件，避免只靠鼠标悬停才能操作。

| 题目与实现 | 核心原理与操作 |
| --- | --- |
| [21 Loading 旋转与跳点](exercises/21-loading/style.css) | `@keyframes` 分别改变旋转、位移与透明度，`animation-delay` 错开跳点。复选框通过 `:has()` 暂停动画，空格键也可切换；减少动画偏好下关闭动画。装饰图形不重复朗读，状态文本由 HTML 提供。 |
| [22 3D 翻转卡片](exercises/22-flip-card/style.css) | 外层提供透视，中层保留三维空间并旋转，背面预先旋转 180 度，两个面隐藏各自背面。复选框控制正反面，减少动画偏好下立即切换。演示的视觉面使用 `aria-hidden`，等价文字在外部提供，不能直接往隐藏面中添加可聚焦操作。 |
| [23 折叠面板](exercises/23-accordion/style.css) | `details/summary` 管理展开状态及原生键盘行为，CSS 根据 `[open]` 改变符号。本例多个面板可以同时展开，没有额外模拟独占展开逻辑，也没有高度动画。 |
| [24 纯 CSS 内容面板切换](exercises/24-css-panels/style.css) | 同组 radio 保存单选状态，`:checked` 与后续兄弟选择器展示对应内容。Tab 进入单选组后用方向键切换。这是原生单选组控制的内容展示；完整 ARIA Tabs 还需要焦点管理、键盘规则与状态同步，不能只添加 `role="tab"`。 |

动画演示使用现代浏览器的 `:has()`。如果目标浏览器不支持，可改变 HTML 层级并用兄弟选择器实现相同控制；不要隐藏输入控件后丢失键盘入口。减少动画的处理参见 [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)。

## 怎样检查自己的实现

先在桌面宽度看布局，再缩到约 360px，并把短文案改成长单词或多段内容。重点观察哪些元素溢出、哪些父元素高度变化，以及 DOM 顺序是否符合阅读顺序。

对吸顶题要滚动绿色局部面板；对页脚题要展开长内容；对省略题要检查完整文本仍可获取。用 Tab、空格和方向键检查原生控件，再在浏览器开发者工具中模拟减少动画偏好。细边框还应结合不同 DPR 和缩放检查；本演示不承诺跨设备像素一致性。
