import { GreaterThan } from "./04425-medium-greater-than"

type ToFill<
  T extends unknown[],
  N,
  R extends unknown[],
  Start extends number,
  End extends number,
  InFill = false,
> = T extends [infer F, ...infer Rest]
  ? R["length"] extends Start
    ? ToFill<Rest, N, [...R, N], Start, End, true>
    : R["length"] extends End
      ? ToFill<Rest, N, [...R, F], Start, End, false>
      : ToFill<Rest, N, [...R, InFill extends true ? N : F], Start, End, InFill>
  : R

type Fill<T extends unknown[], N, Start extends number = 0, End extends number = T["length"]> =
  GreaterThan<End, Start> extends true ? ToFill<T, N, [], Start, End> : T

import type { Equal, Expect } from "@type-challenges/utils"

type Test_1 = Fill<[1, 2, 3], true, 1, 3>
type Test_2 = Fill<[1, 2, 3], true, 0, 10>

type cases = [
  Expect<Equal<Fill<[], 0>, []>>,
  Expect<Equal<Fill<[], 0, 0, 3>, []>>,
  Expect<Equal<Fill<[1, 2, 3], 0, 0, 0>, [1, 2, 3]>>,
  Expect<Equal<Fill<[1, 2, 3], 0, 2, 2>, [1, 2, 3]>>,
  Expect<Equal<Fill<[1, 2, 3], 0>, [0, 0, 0]>>,
  Expect<Equal<Fill<[1, 2, 3], true>, [true, true, true]>>,
  Expect<Equal<Fill<[1, 2, 3], true, 0, 1>, [true, 2, 3]>>,
  Expect<Equal<Fill<[1, 2, 3], true, 1, 3>, [1, true, true]>>,
  Expect<Equal<Fill<[1, 2, 3], true, 10, 0>, [1, 2, 3]>>,
  Expect<Equal<Fill<[1, 2, 3], true, 10, 20>, [1, 2, 3]>>,
  Expect<Equal<Fill<[1, 2, 3], true, 0, 10>, [true, true, true]>>,
]
