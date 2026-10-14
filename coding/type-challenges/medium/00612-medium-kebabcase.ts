const alphaBetUpper = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const
type AlphaBetUpper = (typeof alphaBetUpper)[number]

type KebabCase<S extends string, IsFirst = true> = S extends `${infer F}${infer R}`
  ? // handle AlphaBetUpper instead of Uppercase<F>
    F extends AlphaBetUpper
    ? `${IsFirst extends true ? "" : "-"}${Lowercase<F>}${KebabCase<R, false>}`
    : `${F}${KebabCase<R, false>}`
  : ""

type Test = KebabCase<"foo-bar">

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<KebabCase<"FooBarBaz">, "foo-bar-baz">>,
  Expect<Equal<KebabCase<"fooBarBaz">, "foo-bar-baz">>,
  Expect<Equal<KebabCase<"foo-bar">, "foo-bar">>,
  Expect<Equal<KebabCase<"foo_bar">, "foo_bar">>,
  Expect<Equal<KebabCase<"Foo-Bar">, "foo--bar">>,
  Expect<Equal<KebabCase<"ABC">, "a-b-c">>,
  Expect<Equal<KebabCase<"-">, "-">>,
  Expect<Equal<KebabCase<"">, "">>,
  Expect<Equal<KebabCase<"😎">, "😎">>,
]
