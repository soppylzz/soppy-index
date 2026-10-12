type Mutable<T extends object> = {
  -readonly [P in keyof T]: T[P] extends object ? Mutable<T[P]> : T[P]
}

import type { Equal, Expect } from "@type-challenges/utils"

interface Todo1 {
  title: string
  description: string
  completed: boolean
  meta: {
    author: string
  }
}

type List = [1, 2, 3]

type cases = [
  Expect<Equal<Mutable<Readonly<Todo1>>, Todo1>>,
  Expect<Equal<Mutable<Readonly<List>>, List>>,
]

type Test = Mutable<Readonly<Todo1>>

type errors = [
  // @ts-expect-error: A string is outside the object constraint.
  Mutable<"string">,
  // @ts-expect-error: A number is outside the object constraint.
  Mutable<0>,
]
