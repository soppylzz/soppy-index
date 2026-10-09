> 英文原文：[本地副本](../../en/rendering/renderer-readme/dom.md) · [Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/dom/README.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="dom"></a>

# DOM

[官方渲染版本](dom.md)

作者：hayato@chromium.org；部分编辑：masonf@chromium.org。

`renderer/core/dom` 包含 [DOM] 的实现。

[dom]: https://dom.spec.whatwg.org/
[dom standard]: https://dom.spec.whatwg.org/

原则上，这里应只包含与 [DOM Standard] 相关的文件。但由于历史原因，它曾被当作杂项目录，因而存在许多与 DOM 没有直接关系的文件。请不要再添加无关文件；整理工作的目标是让开发者浏览目录时不再困惑。

- [整理计划表](https://docs.google.com/spreadsheets/d/1OydPU6r8CTj8HC4D9_gVkriJETu1Egcw2RlajYcw3FM/edit?usp=sharing)给出了初步分类，但可能有误。若知道更合适的位置，可更新表格并移动文件。
- [crbug.com/738794](http://crbug.com/738794) 跟踪这项工作。

<a id="node-and-node-tree"></a>

# Node 与节点树

本文使用从左向右展开的 ASCII 树图，`A` 是根：

```text
A
├───B
├───C
│   ├───D
│   └───E
└───F
```

`Node` 是节点树中所有节点类型的基类。每个 Node 包含但不限于三个指针：`parent_or_shadow_host_node_` 指向父节点，如果自身是 shadow root 则指向 host；`previous_` 指向前一个兄弟；`next_` 指向后一个兄弟。

`Element` 的基类 `ContainerNode` 还保存 `first_child_`、`last_child_`，分别指向第一个、最后一个子节点。这意味着兄弟节点以链表存储，访问第 n 个子节点需要 `O(N)`，父节点也无法在 `O(1)` 时间直接得知子节点数量。

![前后兄弟节点](https://hayatoito.github.io/2017/dom/next-sibling.svg)

进一步查看：`Node`、`ContainerNode`。

<a id="c11-range-based-for-loops-for-traversing-a-tree"></a>

# 使用 C++11 范围 for 循环遍历树

可以手动遍历：

```c++
// In C++

// Traverse a node's children.
for (Node* child = parent.firstChild(); child; child = child->nextSibling()) {
  ...
}

// ...

// Traverse nodes in tree order, depth-first traversal.
void foo(const Node& node) {
  ...
  for (Node* child = node.firstChild(); child; child = child->nextSibling()) {
    foo(*child);  // Recursively
  }
}
```

树序如下：

![树序](https://hayatoito.github.io/2017/dom/tree-order.svg)

但手动遍历容易出错，可改用 `NodeTraversal`、`ElementTraversal` 提供的 C++11 范围循环：

```c++
// In C++
for (Node& child : NodeTraversal::childrenOf(parent) {
  ...
}
```

给定父节点 A，依次访问 B、C、F。

```c++
// In C++
for (Node& node : NodeTraversal::startsAt(root)) {
  ...
}
```

给定根 A，依次访问 A、B、C、D、E、F。还有其他针对不同用途的范围遍历。由于都可内联，这种写法没有额外运行开销。

进一步查看 `NodeTraversal`、类型更安全的 `ElementTraversal`，以及引入这些循环的 [CL](https://codereview.chromium.org/642973003)。

<a id="shadow-tree"></a>

# Shadow Tree（影子树）

Shadow tree 是以 `ShadowRoot` 为根的节点树。Web 开发者通过 `element.attachShadow(...)` 创建它，该 element 称为 shadow host，语境明确时简称 host。

Shadow root 始终通过 host 附着到另一棵节点树，影子树不会孤立存在。Host 所在的节点树有时称为 light tree。

![影子树](https://hayatoito.github.io/2017/dom/shadow-tree.svg)

给定以下节点树：

```text
A
├───B
├───C
│   ├───D
│   └───E
└───F
```

可以这样创建和操作影子树：

```javascript
// In JavaScript
const b = document.querySelector('#B');
const shadowRoot = b.attachShadow({ mode: 'open' });
const sb = document.createElement('div');
shadowRoot.appendChild(sb);
```

结果为：

```text
shadowRoot
└── sb
```

Shadow root 有一个子节点 sb，这棵树附着在 B 上：

```text
A
└── B
    ├──/shadowRoot
    │   └── sb
    ├── C
    │   ├── D
    │   └── E
    └── F
```

本文用 `──/` 表示 composed tree 中的一对一 shadow host—shadow root 关系，稍后介绍 composed tree。

从节点树角度看，light tree 和 shadow tree 必须分开理解。`──/` **不是父子关系**：虽然 B 承载影子树，shadowRoot 并不是 B 的子节点。因此下面的遍历：

```c++
// In C++
for (Node& node : NodeTraversal::startsAt(A)) {
  ...
}
```

只访问 A、B、C、D、E、F，不访问 shadowRoot 或 sb。`NodeTraversal` 不跨越 shadow boundary，即 `──/`。

进一步查看 `ShadowRoot`、`Element#attachShadow`。

<a id="treescope"></a>

# TreeScope

`Document`、`ShadowRoot` 始终是节点树的根，两者都实现 `TreeScope`。

TreeScope 为提高效率维护许多树级信息。例如通过 [`TreeOrderedMap`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/dom/tree_ordered_map.h) 保存 ID 到元素的映射，使 `querySelector('#foo')` 可按 ID 快速找到元素；原文以 `O(1)` 描述此查找。反过来，如果根不是 TreeScope，`root.querySelector('#foo')` 可能较慢。

> 译注：这是对该实现中的 ID 查找路径的说明，不是对所有 `querySelector` 调用、重复 ID 或复杂选择器的统一复杂度保证。

每个 Node 的 `tree_scope_` 指向：若根是 Document 或 ShadowRoot，则指向根；否则指向 [owner document](https://dom.spec.whatwg.org/#concept-node-documentOwnerDocument)。因此除 DOM mutation 过程中外，它始终非空，但未必指向节点树的根。

节点没有一个无条件直接指向根的指针。因此，如果节点既不在 document tree，也不在 shadow tree 中，`Node::getRootNode(...)` 可能需要 `O(N)`。如果 `Node#IsInTreeScope()` 为真，则可在 `O(1)` 获取根。

DOM mutation 会更新节点标志，可通过 `Node::IsInDocumentTree()`、`Node::IsInShadowTree()` 判断节点属于哪种树，或两者都不属于。

向 Document 添加新功能前，应考虑它是否更适合 TreeScope；我们希望尽可能平等地对待文档树和影子树。

<a id="example"></a>

## 示例

```text
document
└── a1
    ├──/shadowRoot1
    │   └── s1
    └── a2
        └── a3

document-fragment
└── b1
    ├──/shadowRoot2
    │   └── t2
    └── b2
        └── b3
```

这里有四棵节点树，根分别为 document、shadowRoot1、document-fragment、shadowRoot2。假设除 Document、ShadowRoot 外的节点均由 `document.createElement(...)` 创建，则它们的 owner document 都是 document。

| node              | 节点树的根                 | `_tree_scope` 指向   |
| ----------------- | -------------------------- | -------------------- |
| document          | document （自身）          | document （自身）    |
| a1                | document                   | document             |
| a2                | document                   | document             |
| a3                | document                   | document             |
| shadowRoot1       | shadowRoot1 （自身）       | shadowRoot1 （自身） |
| s1                | shadowRoot1                | shadowRoot1          |
| document-fragment | document-fragment （自身） | document             |
| b1                | document-fragment          | document             |
| b2                | document-fragment          | document             |
| b3                | document-fragment          | document             |
| shadowRoot2       | shadowRoot2 （自身）       | shadowRoot2 （自身） |
| t1                | shadowRoot2                | shadowRoot2          |

进一步查看 [`tree_scope.h`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/dom/tree_scope.h)、[`tree_scope.cc`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/dom/tree_scope.cc)、`Node#GetTreeScope()`、`Node#IsInTreeScope()`。

<a id="composed-tree-a-tree-of-node-trees"></a>

# Composed Tree：由节点树组成的树

上一图中，文档树和影子树似乎连接在一起。某种意义上确实如此，这种“树的树”称为 composed tree。

![由树构成的树](https://hayatoito.github.io/2017/dom/super-tree.svg)

更复杂的例子：

```text
document
├── a1 (host)
│   ├──/shadowRoot1
│   │   └── b1
│   └── a2 (host)
│       ├──/shadowRoot2
│       │   ├── c1
│       │   │   ├── c2
│       │   │   └── c3
│       │   └── c4
│       ├── a3
│       └── a4
└── a5
    └── a6 (host)
        └──/shadowRoot3
            └── d1
                ├── d2
                ├── d3 (host)
                │   └──/shadowRoot4
                │       ├── e1
                │       └── e2
                └── d4 (host)
                    └──/shadowRoot5
                        ├── f1
                        └── f2
```

它由六棵节点树组成：一棵文档树，五棵影子树。

- document tree（文档树）

  ```text
  document
  ├── a1 (host)
  │   └── a2 (host)
  │       ├── a3
  │       └── a4
  └── a5
      └── a6 (host)
  ```

- shadow tree（影子树） 1

  ```text
  shadowRoot1
  └── b1
  ```

- shadow tree（影子树） 2

  ```text
  shadowRoot2
  ├── c1
  │   ├── c2
  │   └── c3
  └── c4
  ```

- shadow tree（影子树） 3

  ```text
  shadowRoot3
  └── d1
      ├── d2
      ├── d3 (host)
      └── d4 (host)
  ```

- shadow tree（影子树） 4

  ```text
  shadowRoot4
  ├── e1
  └── e2
  ```

- shadow tree（影子树） 5

  ```text
  shadowRoot5
  ├── f1
  └── f2
  ```

把每棵节点树视为上层树的一个节点，可画成：

```text
document
├── shadowRoot1
├── shadowRoot2
└── shadowRoot3
    ├── shadowRoot4
    └── shadowRoot5
```

此处以根节点代表相应节点树，因此解释中有时可交换使用“根节点”和“节点树”。Composed tree 这一概念有助于理解 Shadow DOM 封装。

[DOM Standard] 定义了以下术语：

- [shadow-including tree order](https://dom.spec.whatwg.org/#concept-shadow-including-tree-order)：包含影子树的树序。
- [shadow-including root](https://dom.spec.whatwg.org/#concept-shadow-including-root)：包含影子关系的根。
- [shadow-including descendant](https://dom.spec.whatwg.org/#concept-shadow-including-descendant)：包含影子关系的后代。
- [shadow-including inclusive descendant](https://dom.spec.whatwg.org/#concept-shadow-including-inclusive-descendant)：上述后代及自身。
- [shadow-including ancestor](https://dom.spec.whatwg.org/#concept-shadow-including-ancestor)：包含影子关系的祖先。
- [shadow-including inclusive ancestor](https://dom.spec.whatwg.org/#concept-shadow-including-inclusive-ancestor)：上述祖先及自身。
- [closed-shadow-hidden](https://dom.spec.whatwg.org/#concept-closed-shadow-hidden)：被 closed shadow 隐藏。

例如，d1 的 shadow-including 祖先是 shadowRoot3、a6、a5、document；其后代是 d2、d3、shadowRoot4、e1、e2、d4、shadowRoot5、f1、f2。

为遵守封装，我们定义两个节点间的可见性关系。下表的 `-` 表示“从 B 可以看到 A”，hidden 表示隐藏：

| _A_ \ _B_ | document | a1     | a2     | b1     | c1     | d1     | d2     | e1     | f1     |
| --------- | -------- | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| document  | -        | -      | -      | -      | -      | -      | -      | -      | -      |
| a1        | -        | -      | -      | -      | -      | -      | -      | -      | -      |
| a2        | -        | -      | -      | -      | -      | -      | -      | -      | -      |
| b1        | hidden   | hidden | hidden | -      | hidden | hidden | hidden | hidden | hidden |
| c1        | hidden   | hidden | hidden | hidden | -      | hidden | hidden | hidden | hidden |
| d1        | hidden   | hidden | hidden | hidden | hidden | -      | -      | -      | -      |
| d2        | hidden   | hidden | hidden | hidden | hidden | -      | -      | -      | -      |
| e1        | hidden   | hidden | hidden | hidden | hidden | hidden | hidden | -      | hidden |
| f1        | hidden   | hidden | hidden | hidden | hidden | hidden | hidden | hidden | -      |

例如 document 对所有节点可见。可按以下规则理解：如果 B 能沿本节第一幅图中的边递归到达 A，则 A 对 B 可见；但 `──/` 只能从 shadow root 走向 host，不能反过来。

也就是说，内部树能看到外部树，外部树不能看到内部树。许多面向 Web 的 API 都按此原则设计或重新设计。向 Web 平台或 Blink 添加 API 时，应避免向开发者泄漏本应隐藏的节点。

注意 composed tree 在历史上曾被用于指代下文的 flat tree；若在 Blink 中发现错误用法，应修正。

进一步查看 `TreeScope::ParentTreeScope()`、`Node::IsConnected()`，以及 DOM 标准的 [connected](https://dom.spec.whatwg.org/#connected)、[retarget](https://dom.spec.whatwg.org/#retarget)。

<a id="flat-tree"></a>

# Flat Tree（扁平树）

Composed tree 不能原样渲染。Blink 需要构建 layout tree，作为 paint 阶段的输入。其节点是 `LayoutObject`，关联节点树中的 Node 及计算出的布局信息。

Shadow DOM 出现前，layout tree 与 document tree 的结构大致相似，因为只涉及一棵文档树。有了 Shadow DOM 后，需要把多棵节点树组成的 composed tree 扁平化为一棵 flat tree，再据此构建布局树。

![扁平树](https://hayatoito.github.io/2017/dom/flat-tree.svg)

例如：

```text
document
├── a1 (host)
│   ├──/shadowRoot1
│   │   └── b1
│   └── a2 (host)
│       ├──/shadowRoot2
│       │   ├── c1
│       │   │   ├── c2
│       │   │   └── c3
│       │   └── c4
│       ├── a3
│       └── a4
└── a5
    └── a6 (host)
        └──/shadowRoot3
            └── d1
                ├── d2
                ├── d3 (host)
                │   └──/shadowRoot4
                │       ├── e1
                │       └── e2
                └── d4 (host)
                    └──/shadowRoot5
                        ├── f1
                        └── f2
```

假设没有 `<slot>`，扁平化后是：

```text
document
├── a1 (host)
│   └── b1
└── a5
    └── a6 (host)
        └── d1
            ├── d2
            ├── d3 (host)
            │   ├── e1
            │   └── e2
            └── d4 (host)
                ├── f1
                └── f2
```

完整算法需要先理解 slot 和 slot assignment。如果忽略 slot，可递归定义：根是 document；节点 A 如果是 shadow host，其 flat-tree 子节点是 shadow root 的子节点；否则就是 A 自身的子节点。

<a id="slots-and-node-assignments"></a>

# Slot 与节点分配

`<slot>` 的一般用法见[这篇文章](https://developers.google.com/web/fundamentals/web-components/shadowdom)。Slot 是组件内部的占位位置，使用组件的人可以用自己的标记填入内容。下面给出示例。

<a id="example-1"></a>

## 示例 1

Composed tree：

```text
A
├──/shadowRoot1
│   ├── slot1
│   └── slot2
├── B
└── C
```

Slot 分配：

| slot  | 分配给 slot 的节点 |
| ----- | ------------------ |
| slot1 | [C]                |
| slot2 | [B]                |

对应 flat tree：

```text
A
├── slot1
│   └── C
└── slot2
    └── B
```

<a id="example-2"></a>

## 示例 2

更复杂的 composed tree：

```text
A
├──/shadowRoot1
│   ├── B
│   │   └── slot1
│   ├── slot2
│   │   └── C
│   ├── D
│   └── slot3
│       ├── E
│       └── F
├── G
├── H
├── I
└── J
```

Slot 分配：

| slot  | 分配给 slot 的节点 |
| ----- | ------------------ |
| slot1 | [H]                |
| slot2 | [G, I]             |
| slot3 | [] （未分配）      |

对应 flat tree：

```text
A
├── B
│   └── slot1
│       └── H
├── slot2
│   ├── G
│   └── I
├── D
└── slot3
    ├── E
    └── F
```

Slot2 已分配 `[G, I]`，所以其原子节点 C 不出现在 flat tree 中，而使用 G、I。未分配节点的 slot 使用自身子节点作为 fallback 内容，例如 slot3 的 E、F。Host 的子节点如果未分配到任何 slot，就不进入 flat tree，例如 J。

<a id="example-3"></a>

## 示例 3

Slot 本身也可被分配到另一个 slot。例如给 B 附加 shadow root，并在其中放入 slot4：

```text
A
├──/shadowRoot1
│   ├── B
│   │   ├──/shadowRoot2
│   │   │   └── K
│   │   │       └── slot4
│   │   └── slot1
│   ├── slot2
│   │   └── C
│   ├── D
│   └── slot3
│       ├── E
│       └── F
├── G
├── H
├── I
└── J
```

| slot  | 分配给 slot 的节点 |
| ----- | ------------------ |
| slot1 | [H]                |
| slot2 | [G, I]             |
| slot3 | [] （未分配）      |
| slot4 | [slot1]            |

得到的 flat tree：

```text
A
├── B
│   └── K
│       └── slot4
│           └── slot1
│               └── H
├── slot2
│   ├── G
│   └── I
├── D
└── slot3
    ├── E
    └── F
```

<a id="slot-assignment-recalc"></a>

# 重新计算 Slot 分配

如何重新计算分配关系见 [Incremental Shadow DOM](https://docs.google.com/document/d/1R9J8CVaSub_nbaVQwwm3NjCoZye4feJ7ft7tVe5QerM/edit?usp=sharing)。

<a id="flattreetraversal"></a>

# FlatTreeTraversal

Blink 不会在内存中保存、维护一份独立 flat tree 数据结构，而是提供 [`FlatTreeTraversal`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/dom/flat_tree_traversal.h)，按 flat-tree 顺序遍历 composed tree。

对于示例 3：`firstChild(slot1)` 返回 H；`parent(H)` 返回 slot1；`nextSibling(G)` 返回 I；`previousSibling(I)` 返回 G。其 API 与 `NodeTraversal`、`ElementTraversal` 等遍历工具很相似。

<a id="event-path-and-event-retargeting"></a>

# 事件路径与事件重定向

<!-- Old doc: https://www.w3.org/TR/2014/WD-shadow-dom-20140617/ -->

[DOM Standard] 定义了[事件分派](https://dom.spec.whatwg.org/#concept-event-dispatch)及[事件路径](https://dom.spec.whatwg.org/#event-path)计算，但规范步骤可能难以理解。这里通过示例简要解释。

事件可以跨越影子树分派：

![事件分派](https://hayatoito.github.io/2017/dom/event-dispatch.svg)

> 译注：是否跨越 shadow boundary 还取决于事件的 `composed` 标志及规范中的路径计算条件；不能把此处示例理解为所有事件都会跨越边界。原文后面的 Composed events 仍为待补充章节。

下面是涉及 slot 的复杂 composed tree：

```text
A
└── B
    ├──/shadowroot-C
    │   └── D
    │       ├──/shadowroot-E
    │       │   └── F
    │       │       └── slot-G
    │       └── H
    │           └── I
    │               ├──/shadowroot-J
    │               │   └── K
    │               │       ├──/shadowroot-L
    │               │       │   └── M
    │               │       │       ├──/shadowroot-N
    │               │       │       │   └── slot-O
    │               │       │       └── slot-P
    │               │       └── Q
    │               │           └── slot-R
    │               └── slot-S
    └── T
        └── U
```

分配关系：

| slot   | 分配给 slot 的节点 |
| ------ | ------------------ |
| slot-G | [H]                |
| slot-O | [slot-P]           |
| slot-P | [Q]                |
| slot-R | [slot-S]           |
| slot-S | [T]                |

假设 U 上触发事件，逆序表示的事件路径为：

```text
[U => T => slot-S => slot-R => Q => slot-P => slot-O => shadowroot-N => M
=> shadowroot-L => K => shadowroot-J => I => H => slot-G => F => shadowroot-E
=> D => shadowroot-C => B => A]
```

粗略地说，路径中的下一个节点这样确定：若节点分配到 slot，则走向该 slot；若为 shadow root，则走向 host；其他情况走向父节点。

U 对所有相关节点可见，因此事件生命周期中 `event.target` 不变。但若在 Q 上触发事件，为保护封装，路径中某些位置观察到的 target 会调整，这就是事件重定向（retargeting）。

Q 上触发事件时，各位置观察到的 target 如下：

| event.currentTarget | 重定向后的 event.target |
| ------------------- | ----------------------- |
| Q                   | Q                       |
| slot-P              | Q                       |
| slot-O              | Q                       |
| shadowroot-N        | Q                       |
| M                   | Q                       |
| shadowroot-L        | Q                       |
| K                   | Q                       |
| shadowroot-J        | Q                       |
| I                   | I                       |
| H                   | I                       |
| slot-G              | I                       |
| F                   | I                       |
| shadowroot-E        | I                       |
| D                   | I                       |
| shadowroot-C        | I                       |
| B                   | B                       |
| A                   | B                       |

<a id="design-goal-of-event-path-calculation"></a>

# 事件路径计算的设计目标

TODO(hayato): Explain.

> 译注：原文尚未补充。

<a id="composed-events"></a>

# Composed 事件

TODO(hayato): Explain.

> 译注：原文尚未补充。

<a id="event-path-and-related-targets"></a>

# 事件路径与 Related Target

TODO(hayato): Explain.

> 译注：原文尚未补充。

<a id="dom-mutations"></a>

# DOM 变更

TODO(hayato): Explain.

> 译注：原文尚未补充。

<a id="related-flags"></a>

# 相关标志

TODO(hayato): Explain.

> 译注：原文尚未补充。
