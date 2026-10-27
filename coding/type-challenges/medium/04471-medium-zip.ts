type Zip<
  T extends unknown[],
  U extends unknown[],
  O extends [unknown, unknown][] = [],
> = T extends [infer TF, ...infer TR]
  ? U extends [infer UF, ...infer UR]
    ? Zip<TR, UR, [...O, [TF, UF]]>
    : O
  : O

type Test = Zip<[1, 2], [true, false]>

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<Zip<[], []>, []>>,
  Expect<Equal<Zip<[1, 2], [true, false]>, [[1, true], [2, false]]>>,
  Expect<Equal<Zip<[1, 2, 3], ["1", "2"]>, [[1, "1"], [2, "2"]]>>,
  Expect<Equal<Zip<[], [1, 2, 3]>, []>>,
  Expect<Equal<Zip<[[1, 2]], [3]>, [[[1, 2], 3]]>>,
]
