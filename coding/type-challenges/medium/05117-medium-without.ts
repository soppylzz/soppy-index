type ToWithout<T, U, R extends unknown[] = []> = T extends [infer F, ...infer Rest]
  ? ToWithout<Rest, U, F extends U ? R : [...R, F]>
  : R
type EnsureArray<T> = T extends readonly unknown[] ? T : [T]

type Test1_1 = EnsureArray<[1]>
type Test1_2 = EnsureArray<1>

type Without<T, U extends unknown[] | unknown> = ToWithout<T, EnsureArray<U>[number], []>

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<Without<[1, 2], 1>, [2]>>,
  Expect<Equal<Without<[1, 2, 4, 1, 5], [1, 2]>, [4, 5]>>,
  Expect<Equal<Without<[2, 3, 2, 3, 2, 3, 2, 3], [2, 3]>, []>>,
]
