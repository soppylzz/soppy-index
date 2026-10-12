/**
 * `as` remaps or filters keys while iterating over `keyof T`.
 * The condition decides whether each key `K` is kept, renamed,
 * or removed (`never`), even if the decision depends on `T[K]`.
 *
 * similar: @see {@link 01367-medium-remove-index-signature.ts}
 */
type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K]
}

import type { Equal, Expect } from "@type-challenges/utils"

interface Model {
  name: string
  count: number
  isReadonly: boolean
  isEnable: boolean
}

type Test = PickByType<Model, boolean>

type cases = [
  Expect<Equal<PickByType<Model, boolean>, { isReadonly: boolean; isEnable: boolean }>>,
  Expect<Equal<PickByType<Model, string>, { name: string }>>,
  Expect<Equal<PickByType<Model, number>, { count: number }>>,
]
