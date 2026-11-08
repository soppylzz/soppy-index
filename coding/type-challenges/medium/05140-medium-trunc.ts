type Trunc<T extends string | number> = TruncOperator<`${T}`>

type TruncOperator<T extends string> = T extends `-${infer R}`
  ? `-${EnsureZero<TruncDot<R>>}`
  : EnsureZero<TruncDot<T>>
type EnsureZero<T extends string> = T extends "" ? "0" : T
type TruncDot<T extends string, P extends string = ""> = T extends `.${infer D}`
  ? P
  : T extends `${infer F}${infer RR}`
    ? TruncDot<RR, `${P}${F}`>
    : P

import type { Equal, Expect } from "@type-challenges/utils"

type Test = Trunc<10>

type cases = [
  Expect<Equal<Trunc<0.1>, "0">>,
  Expect<Equal<Trunc<0.2>, "0">>,
  Expect<Equal<Trunc<1.234>, "1">>,
  Expect<Equal<Trunc<12.345>, "12">>,
  Expect<Equal<Trunc<-5.1>, "-5">>,
  Expect<Equal<Trunc<".3">, "0">>,
  Expect<Equal<Trunc<"1.234">, "1">>,
  Expect<Equal<Trunc<"-.3">, "-0">>,
  Expect<Equal<Trunc<"-10.234">, "-10">>,
  Expect<Equal<Trunc<10>, "10">>,
]
