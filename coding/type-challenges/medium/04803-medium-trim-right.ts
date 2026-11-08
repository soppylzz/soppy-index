type TrimRight<S extends string> = S extends `${infer F}${infer R}`
  ? `${TrimRight<R> extends "" ? (F extends " " | "\t" | "\n" ? "" : F) : F}${TrimRight<R>}`
  : ""

import type { Equal, Expect } from "@type-challenges/utils"

type Test_1 = TrimRight<"str ">

type cases = [
  Expect<Equal<TrimRight<"str">, "str">>,
  Expect<Equal<TrimRight<"str ">, "str">>,
  Expect<Equal<TrimRight<"str     ">, "str">>,
  Expect<Equal<TrimRight<"     str     ">, "     str">>,
  Expect<Equal<TrimRight<"   foo bar  \n\t ">, "   foo bar">>,
  Expect<Equal<TrimRight<"">, "">>,
  Expect<Equal<TrimRight<"\n\t ">, "">>,
]
