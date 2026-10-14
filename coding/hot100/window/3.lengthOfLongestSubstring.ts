// need review
function lengthOfLongestSubstring(s: string): number {
  if (s.length === 0) return 0

  // note: cannot use a bitmask to represent the state
  const map = new Map<string, number>()

  let left = 0,
    right = 0,
    maxLength = 0

  while (right < s.length) {
    const char = s[right]
    if (map.has(char)) {
      // light: no need to delete cached entries outside the current window
      left = Math.max(left, map.get(char)! + 1)
    }
    map.set(char, right)
    maxLength = Math.max(maxLength, right - left + 1)

    right++
  }

  return maxLength
}
