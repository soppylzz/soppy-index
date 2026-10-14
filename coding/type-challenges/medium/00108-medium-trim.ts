type ToTrim = " " | "\n" | "\t"
type TrimLeft<S extends string> = S extends `${ToTrim}${infer R}` ? TrimLeft<R> : S
type TrimRight<S extends string> = S extends `${infer R}${ToTrim}` ? TrimRight<R> : S

type Trim<S extends string> = TrimLeft<TrimRight<S>>

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<Trim<"str">, "str">>,
  Expect<Equal<Trim<" str">, "str">>,
  Expect<Equal<Trim<"     str">, "str">>,
  Expect<Equal<Trim<"str   ">, "str">>,
  Expect<Equal<Trim<"     str     ">, "str">>,
  Expect<Equal<Trim<"   \n\t foo bar \t">, "foo bar">>,
  Expect<Equal<Trim<"">, "">>,
  Expect<Equal<Trim<" \n\t ">, "">>,
]
