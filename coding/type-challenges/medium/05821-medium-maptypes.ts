import type { Equal, Expect } from "@type-challenges/utils"
import { Pretty, UnionToIntersection } from "../utils"

// First resolving way
// type MapTypesOnce<T, R extends { mapFrom: unknown; mapTo: unknown }> = {
//   [K in keyof T as Equal<T[K], R["mapFrom"]> extends true ? K : never]: R["mapTo"]
// }

// type MapTypesUnmatched<T, RT> = {
//   [K in keyof T as T[K] extends RT ? never : K]: T[K]
// }

// type MapTypesUnion<T, R extends { mapFrom: unknown; mapTo: unknown }> =
//   MapTypesUnmatched<T, R["mapFrom"]> | (R extends any ? MapTypesOnce<T, R> : never)

// type Test1_1 = MapTypesUnion<{ stringToArray: string }, { mapFrom: string; mapTo: [] }>

// type MapTypes<T, R extends { mapFrom: unknown; mapTo: unknown }> = Pretty<
//   UnionToIntersection<MapTypesUnion<T, R>>
// >

// type CanNotResolved = MapTypes<
//   { date: string },
//   { mapFrom: string; mapTo: Date } | { mapFrom: string; mapTo: null }
// > // never

type MapRule = {
  mapFrom: unknown
  mapTo: unknown
}

// Distribute over mapping rules and collect all matching results.
type MapTypesValue<V, R extends MapRule> = R extends any
  ? Equal<V, R["mapFrom"]> extends true
    ? R["mapTo"]
    : never
  : never

type MapTypes<T, R extends MapRule> = Pretty<{
  [K in keyof T]: [MapTypesValue<T[K], R>] extends [never] ? T[K] : MapTypesValue<T[K], R>
}>

type cases = [
  Expect<
    Equal<
      MapTypes<{ stringToArray: string }, { mapFrom: string; mapTo: [] }>,
      { stringToArray: [] }
    >
  >,
  Expect<
    Equal<
      MapTypes<{ stringToNumber: string }, { mapFrom: string; mapTo: number }>,
      { stringToNumber: number }
    >
  >,
  Expect<
    Equal<
      MapTypes<
        { stringToNumber: string; skipParsingMe: boolean },
        { mapFrom: string; mapTo: number }
      >,
      { stringToNumber: number; skipParsingMe: boolean }
    >
  >,
  Expect<
    Equal<
      MapTypes<
        { date: string },
        { mapFrom: string; mapTo: Date } | { mapFrom: string; mapTo: null }
      >,
      { date: null | Date }
    >
  >,
  Expect<
    Equal<
      MapTypes<{ date: string }, { mapFrom: string; mapTo: Date | null }>,
      { date: null | Date }
    >
  >,
  Expect<
    Equal<
      MapTypes<
        { fields: Record<string, boolean> },
        { mapFrom: Record<string, boolean>; mapTo: string[] }
      >,
      { fields: string[] }
    >
  >,
  Expect<Equal<MapTypes<{ name: string }, { mapFrom: boolean; mapTo: never }>, { name: string }>>,
  Expect<
    Equal<
      MapTypes<
        { name: string; date: Date },
        { mapFrom: string; mapTo: boolean } | { mapFrom: Date; mapTo: string }
      >,
      { name: boolean; date: string }
    >
  >,
]
