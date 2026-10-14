type ToTuple<N extends number, T extends unknown[] = []> = T["length"] extends N
  ? T
  : ToTuple<N, [unknown, ...T]>
type MinusOne<N extends number, T = ToTuple<N>> = T extends [infer F, ...infer R]
  ? R["length"]
  : never
type MinusTwo<N extends number> = MinusOne<MinusOne<N>>

// Type instantiation is excessively deep and possibly infinite.
// type FibonacciStupid<T extends number> = T extends 1 | 2
//   ? 1
//   : [...ToTuple<FibonacciStupid<MinusOne<T>>>, ...ToTuple<FibonacciStupid<MinusTwo<T>>>]["length"]

type Fibonacci<
  T extends number,
  CurrentIndex extends any[] = [1],
  Prev extends any[] = [],
  Current extends any[] = [1],
> = CurrentIndex["length"] extends T
  ? Current["length"]
  : Fibonacci<T, [...CurrentIndex, 1], Current, [...Prev, ...Current]>

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<Fibonacci<1>, 1>>,
  Expect<Equal<Fibonacci<2>, 1>>,
  Expect<Equal<Fibonacci<3>, 2>>,
  Expect<Equal<Fibonacci<8>, 21>>,
]
