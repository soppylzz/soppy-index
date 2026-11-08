type IsDuplicated<A extends unknown[], T> = A extends [infer F, ...infer R]
  ? Equal<F, T> extends true
    ? true
    : IsDuplicated<R, T>
  : false

type Test1_1 = IsDuplicated<[1], number>
type Test1_2 = IsDuplicated<[number], 1>
type Test1_3 = IsDuplicated<[number], number>

type Unique<T extends unknown[], R extends unknown[] = []> = T extends [infer F, ...infer RR]
  ? Unique<RR, IsDuplicated<R, F> extends true ? R : [...R, F]>
  : R

import type { Equal, Expect } from "@type-challenges/utils"

type Test2_1 = Unique<[string, number, 1, "a", 1, string, 2, "b", 2, number]>

type cases = [
  Expect<Equal<Unique<[1, 1, 2, 2, 3, 3]>, [1, 2, 3]>>,
  Expect<Equal<Unique<[1, 2, 3, 4, 4, 5, 6, 7]>, [1, 2, 3, 4, 5, 6, 7]>>,
  Expect<Equal<Unique<[1, "a", 2, "b", 2, "a"]>, [1, "a", 2, "b"]>>,
  Expect<
    Equal<
      Unique<[string, number, 1, "a", 1, string, 2, "b", 2, number]>,
      [string, number, 1, "a", 2, "b"]
    >
  >,
  Expect<Equal<Unique<[unknown, unknown, any, any, never, never]>, [unknown, any, never]>>,
]
