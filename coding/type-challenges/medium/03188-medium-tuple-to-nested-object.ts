type FirstOf<T extends any[]> = T extends [infer F extends PropertyKey, ...any[]] ? F : never
type RestOf<T extends any[]> = T extends [PropertyKey, ...infer R] ? R : never
type IsNever<T> = [T] extends [never] ? true : false

type TupleToNestedObject<T extends any[], U> = T["length"] extends 0
  ? U
  : {
      [K in FirstOf<T>]: TupleToNestedObject<RestOf<T>, U>
    }

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<TupleToNestedObject<["a"], string>, { a: string }>>,
  Expect<Equal<TupleToNestedObject<["a", "b"], number>, { a: { b: number } }>>,
  Expect<Equal<TupleToNestedObject<["a", "b", "c"], boolean>, { a: { b: { c: boolean } } }>>,
  Expect<Equal<TupleToNestedObject<[], boolean>, boolean>>,
]
