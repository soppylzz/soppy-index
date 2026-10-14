import type { Pretty } from "../utils"

/**
 * why must use Pretty here?
 * view discussion: https://github.com/type-challenges/type-challenges/issues/608
 */
type Merge<F, S> = Pretty<Omit<F, keyof S> & S>

import type { Equal, Expect } from "@type-challenges/utils"

type Foo = {
  a: number
  b: string
}
type Bar = {
  b: number
  c: boolean
}

type cases = [
  Expect<
    Equal<
      Merge<Foo, Bar>,
      {
        a: number
        b: number
        c: boolean
      }
    >
  >,
]
