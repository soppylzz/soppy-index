type Equal_<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false

type Includes<T extends readonly unknown[], U> = T extends readonly [infer First, ...infer Rest]
  ? Equal_<First, U> extends true
    ? true
    : Includes<Rest, U>
  : false

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<Includes<["Kars", "Esidisi", "Wamuu", "Santana"], "Kars">, true>>,
  Expect<Equal<Includes<["Kars", "Esidisi", "Wamuu", "Santana"], "Dio">, false>>,
  Expect<Equal<Includes<[1, 2, 3, 5, 6, 7], 7>, true>>,
  Expect<Equal<Includes<[1, 2, 3, 5, 6, 7], 4>, false>>,
  Expect<Equal<Includes<[1, 2, 3], 2>, true>>,
  Expect<Equal<Includes<[1, 2, 3], 1>, true>>,
  Expect<Equal<Includes<[{}], { a: "A" }>, false>>,
  Expect<Equal<Includes<[boolean, 2, 3, 5, 6, 7], false>, false>>,
  Expect<Equal<Includes<[true, 2, 3, 5, 6, 7], boolean>, false>>,
  Expect<Equal<Includes<[false, 2, 3, 5, 6, 7], false>, true>>,
  /**
   * these two cases perfectly illustrate why you can't simply
   * use bidirectional `extends` to implement `Equal`.
   */
  Expect<Equal<Includes<[{ a: "A" }], { readonly a: "A" }>, false>>,
  Expect<Equal<Includes<[{ readonly a: "A" }], { a: "A" }>, false>>,
  Expect<Equal<Includes<[1], 1 | 2>, false>>,
  Expect<Equal<Includes<[1 | 2], 1>, false>>,
  Expect<Equal<Includes<[null], undefined>, false>>,
  Expect<Equal<Includes<[undefined], null>, false>>,
]
