function generateKey(str: string) {
  const keyArr = Array(26).fill(0)
  for (let i = 0; i < str.length; i++) {
    const sNum = str[i].charCodeAt(0) - "a".charCodeAt(0)
    keyArr[sNum]++
  }
  return keyArr.join("|")
}

/**
 * alternative: use the product of per-letter primes to generate a unique key
 * const primes = [
 *   2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n,
 *   31n, 37n, 41n, 43n, 47n, 53n, 59n, 61n, 67n, 71n,
 *   73n, 79n, 83n, 89n, 97n, 101n
 * ];
 */
function groupAnagrams(strs: string[]): string[][] {
  // tip: hash by a key derived from each word's letter counts
  // ai suggestion: multiply per-letter primes into one product
  const result = new Map<string, string[]>()

  for (let i = 0; i < strs.length; i++) {
    const key = generateKey(strs[i])

    if (result.has(key)) {
      const arr = result.get(key)!
      arr.push(strs[i])
    } else {
      result.set(key, [strs[i]])
    }
  }

  return [...result.values()]
}
