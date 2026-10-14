// need review
function minWindow(s: string, t: string): string {
  const need = Array(128).fill(0)
  const window = Array(128).fill(0)

  for (const ch of t) need[ch.charCodeAt(0)]++

  let left = 0,
    right = 0,
    matched = 0,
    needTypes = 0,
    minLength = Infinity,
    minLeft = 0,
    minRight = 0

  for (const count of need) if (count > 0) needTypes++

  while (right < s.length) {
    const r = s[right].charCodeAt(0)
    window[r]++
    if (window[r] === need[r]) matched++
    right++

    while (matched === needTypes) {
      if (right - left < minLength) {
        minLength = right - left
        minLeft = left
        minRight = right
      }

      const l = s[left].charCodeAt(0)
      window[l]--
      if (window[l] < need[l]) matched--
      left++
    }
  }

  return minLength === Infinity ? "" : s.slice(minLeft, minRight)
}
