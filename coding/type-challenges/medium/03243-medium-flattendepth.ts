type ToTuple<N extends number, T extends unknown[] = []> = T["length"] extends N
  ? T
  : ToTuple<N, [unknown, ...T]>

type MinusOneSimple<D extends number> = ToTuple<D> extends [infer _, ...infer R] ? R["length"] : 0

/**
 * decreasing D works for small numbers, but building a tuple of length D
 * quickly hits TypeScript's recursion limit for very large depths.
 */
type FlattenDepthOld<T, D extends number = 1> = T extends []
  ? []
  : D extends 0
    ? T extends unknown[]
      ? T
      : [T]
    : T extends [infer F, ...infer R]
      ? [...FlattenDepthOld<F, MinusOneSimple<D>>, ...FlattenDepthOld<R, D>]
      : [T]

type FlattenDepth<T, D extends number = 1, C extends unknown[] = []> = T extends []
  ? []
  : C["length"] extends D
    ? T extends unknown[]
      ? T
      : [T]
    : T extends [infer F, ...infer R]
      ? F extends unknown[]
        ? [...FlattenDepth<F, D, [unknown, ...C]>, ...FlattenDepth<R, D, C>]
        : [F, ...FlattenDepth<R, D, C>]
      : [T]

import type { Equal, Expect } from "@type-challenges/utils"

type Test = FlattenDepth<[1, [2, [3, [4, [5]]]]], 19260817>

type cases = [
  Expect<Equal<FlattenDepth<[]>, []>>,
  Expect<Equal<FlattenDepth<[1, 2, 3, 4]>, [1, 2, 3, 4]>>,
  Expect<Equal<FlattenDepth<[1, [2]]>, [1, 2]>>,
  Expect<Equal<FlattenDepth<[1, 2, [3, 4], [[[5]]]], 2>, [1, 2, 3, 4, [5]]>>,
  Expect<Equal<FlattenDepth<[1, 2, [3, 4], [[[5]]]]>, [1, 2, 3, 4, [[5]]]>>,
  Expect<Equal<FlattenDepth<[1, [2, [3, [4, [5]]]]], 3>, [1, 2, 3, 4, [5]]>>,
  Expect<Equal<FlattenDepth<[1, [2, [3, [4, [5]]]]], 19260817>, [1, 2, 3, 4, 5]>>,
]
