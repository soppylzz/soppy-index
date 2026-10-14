// center expansion baseline: 2n-1 centers, expand both parities, O(n^2)
function longestPalindromeExpand(s: string): string {
  let start = 0
  let maxLen = 0
  const expand = (l: number, r: number) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) {
      l--
      r++
    }
    if (r - l - 1 > maxLen) {
      maxLen = r - l - 1
      start = l + 1
    }
  }
  for (let i = 0; i < s.length; i++) {
    expand(i, i)
    expand(i, i + 1)
  }
  return s.slice(start, start + maxLen)
}

/**
 * Manacher: p[i] = max palindrome radius on the transformed string, mirrors the known half, O(n)
 * https://leetcode.cn/problems/longest-palindromic-substring/
 */
function longestPalindrome(s: string): string {
  const t = "^#" + [...s].join("#") + "#$"
  const p: number[] = new Array(t.length).fill(0)
  let center = 0
  let right = 0
  for (let i = 1; i < t.length - 1; i++) {
    if (i < right) p[i] = Math.min(right - i, p[2 * center - i])
    while (t[i + p[i] + 1] === t[i - p[i] - 1]) p[i]++
    if (i + p[i] > right) {
      center = i
      right = i + p[i]
    }
  }
  let best = 0
  let bestCenter = 0
  for (let i = 1; i < t.length - 1; i++) {
    if (p[i] > best) {
      best = p[i]
      bestCenter = i
    }
  }
  const start = (bestCenter - best) / 2
  return s.slice(start, start + best)
}

/* ==================== demo ==================== */
console.log(longestPalindromeExpand("babad"))
console.log(longestPalindromeExpand("cbbd"))
console.log(longestPalindrome("babad"))
console.log(longestPalindrome("cbbd"))

export {}
