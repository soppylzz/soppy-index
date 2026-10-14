type Pop<T extends any[]> = T extends [infer F, ...infer R]
  ? R["length"] extends 1
    ? [F]
    : [F, ...Pop<R>]
  : []

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<Pop<[3, 2, 1]>, [3, 2]>>,
  Expect<Equal<Pop<["a", "b", "c", "d"]>, ["a", "b", "c"]>>,
  Expect<Equal<Pop<[]>, []>>,
]
