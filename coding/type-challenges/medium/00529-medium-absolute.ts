type RemoveMinus<T extends string> = T extends `-${infer R}` ? R : T
type RemoveN<T extends string> = T extends `${infer R}n` ? R : T

type Absolute<T extends number | string | bigint> = RemoveN<RemoveMinus<`${T}`>>

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<Absolute<0>, "0">>,
  Expect<Equal<Absolute<-0>, "0">>,
  Expect<Equal<Absolute<10>, "10">>,
  Expect<Equal<Absolute<-5>, "5">>,
  Expect<Equal<Absolute<"0">, "0">>,
  Expect<Equal<Absolute<"-0">, "0">>,
  Expect<Equal<Absolute<"10">, "10">>,
  Expect<Equal<Absolute<"-5">, "5">>,
  Expect<Equal<Absolute<-1_000_000n>, "1000000">>,
  Expect<Equal<Absolute<9_999n>, "9999">>,
]
