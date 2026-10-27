type Chunk<
  Raw extends unknown[],
  Size extends number,
  Output extends unknown[][] = [],
  Chunk_ extends unknown[] = [],
> = Raw["length"] extends 0
  ? Chunk_["length"] extends 0
    ? Output
    : [...Output, Chunk_]
  : Raw extends [infer First, ...infer Rest]
    ? [...Chunk_, First]["length"] extends Size
      ? Chunk<Rest, Size, [...Output, [...Chunk_, First]], []>
      : Chunk<Rest, Size, Output, [...Chunk_, First]>
    : never

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<Chunk<[], 1>, []>>,
  Expect<Equal<Chunk<[1, 2, 3], 1>, [[1], [2], [3]]>>,
  Expect<Equal<Chunk<[1, 2, 3], 2>, [[1, 2], [3]]>>,
  Expect<Equal<Chunk<[1, 2, 3, 4], 2>, [[1, 2], [3, 4]]>>,
  Expect<Equal<Chunk<[1, 2, 3, 4], 5>, [[1, 2, 3, 4]]>>,
  Expect<Equal<Chunk<[1, true, 2, false], 2>, [[1, true], [2, false]]>>,
]
