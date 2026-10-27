type IsTuple<T> = [T] extends [never]
  ? false
  : T extends unknown[] | readonly unknown[]
    ? number extends T["length"]
      ? false
      : true
    : false

type Test0 = Pretty<keyof []>
type Test1 = Pretty<keyof number[]>
type Test2 = Pretty<keyof { "1": 1 }>
type Test3 = ["1", "2"]["length"]
type Test4 = number[]["length"]
type Test5 = IsTuple<readonly [1]>

import type { Equal, Expect } from "@type-challenges/utils"
import { Pretty } from "../utils"

type cases = [
  Expect<Equal<IsTuple<[]>, true>>,
  Expect<Equal<IsTuple<[number]>, true>>,
  Expect<Equal<IsTuple<readonly [1]>, true>>,
  Expect<Equal<IsTuple<{ length: 1 }>, false>>,
  Expect<Equal<IsTuple<number[]>, false>>,
  Expect<Equal<IsTuple<never>, false>>,
]
