import { Pretty, UnionToIntersection } from "../utils"

type Primitive = string | number | bigint | boolean

type Flip<T> = Pretty<
  UnionToIntersection<
    {
      [K in keyof T]: {
        [
          AK in T[K] as T[K] extends string | number
            ? T[K]
            : T[K] extends Primitive
              ? // null and undefined are not considered
                `${T[K]}`
              : never
        ]: K
      }
    }[keyof T]
  >
>

// a simpler alternative using the `as` clause to remap keys.
type FlipBetter<T extends Record<string, string | number | boolean>> = {
  [P in keyof T as `${T[P]}`]: P
}

import type { Equal, Expect, NotEqual } from "@type-challenges/utils"

type Test = Flip<{ pi: 3.14; bool: true }>

type cases = [
  Expect<Equal<{ a: "pi" }, Flip<{ pi: "a" }>>>,
  Expect<NotEqual<{ b: "pi" }, Flip<{ pi: "a" }>>>,
  Expect<Equal<{ 3.14: "pi"; true: "bool" }, Flip<{ pi: 3.14; bool: true }>>>,
  Expect<Equal<{ val2: "prop2"; val: "prop" }, Flip<{ prop: "val"; prop2: "val2" }>>>,
]
