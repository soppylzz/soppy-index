import { Pretty, UnionToIntersection } from "../utils"

// type RemoveIndexSignature<T> = {
//   [K in keyof T as {} extends Record<K, unknown> ? never : K]: T[K]
// }
type RemoveIndexSignature<T> = {
  [
    K in keyof T as string extends K
      ? never
      : number extends K
        ? never
        : symbol extends K
          ? never
          : K
  ]: T[K]
}

import type { Equal, Expect } from "@type-challenges/utils"

type Foo = {
  [key: string]: any
  foo(): void
}

/**
 * conbination has higher priority to contravariance here
 */
type TestOne = UnionToIntersection<string | "test"> // string
type TestTwo = string & "test" // "test"

type Bar = {
  [key: number]: any
  bar(): void
  0: string
}

const foobar = Symbol("foobar")
type FooBar = {
  [key: symbol]: any
  [foobar](): void
}

type Baz = {
  bar(): void
  baz: string
}

type Test = RemoveIndexSignature<Foo>

type cases = [
  Expect<Equal<RemoveIndexSignature<Foo>, { foo(): void }>>,
  Expect<Equal<RemoveIndexSignature<Bar>, { bar(): void; 0: string }>>,
  Expect<Equal<RemoveIndexSignature<FooBar>, { [foobar](): void }>>,
  Expect<Equal<RemoveIndexSignature<Baz>, { bar(): void; baz: string }>>,
]
