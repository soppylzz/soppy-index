export function parseCount(value) {
  if (!/^(0|[1-9]\d*)$/.test(value)) throw new Error("Expected an integer")
  const count = Number(value)
  if (!Number.isSafeInteger(count) || count > 100) throw new RangeError("Count outside 0..100")
  return count
}
