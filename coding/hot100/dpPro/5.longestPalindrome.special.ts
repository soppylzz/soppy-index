/**
 * cases to consider:
 * 1. aba
 * 2. aa
 * 3. aaa
 * 4. abaaaa
 * a single-dimension dp cannot solve this problem;
 * inserting "|" separators like manacher does gives an O(n) solution
 */
function longestPalindromeViaDp(s: string): string {
  // note: dp[i][j] means s[i...j] is a palindrome
  const n = s.length
  if (n < 2) return s

  const dp = Array(n)
  for (let i = 0; i < n; i++) {
    dp[i] = Array(n).fill(false)
  }

  let maxLength = 1
  let start = 0

  for (let i = 0; i < n; i++) {
    dp[i][i] = true
  }

  for (let len = 2; len <= n; len++) {
    for (let i = 0; i < n - len + 1; i++) {
      const j = i + len - 1

      if (len === 2) {
        dp[i][j] = s[i] === s[j]
      } else {
        dp[i][j] = s[i] === s[j] && dp[i + 1][j - 1]
      }

      if (dp[i][j] && len > maxLength) {
        maxLength = len
        start = i
      }
    }
  }

  return s.substring(start, start + maxLength)
}

function longestPalindrome(s: string): string {
  if (s.length < 2) return s

  const str = `|${s.split("").join("|")}|`
  const n = str.length
  const radius = Array(n).fill(0)

  let center = 0,
    right = 0,
    maxCenter = 0,
    maxRight = 0

  for (let i = 0; i < n; i++) {
    // light: use symmetry to fill radius[i]
    if (i < right) {
      const mirror = 2 * center - i
      radius[i] = Math.min(right - i, radius[mirror])
    } else {
      radius[i] = 0
    }

    // expand bi-directionally from i
    while (
      i - radius[i] - 1 >= 0 &&
      i + radius[i] + 1 < n &&
      str[i - radius[i] - 1] === str[i + radius[i] + 1]
    ) {
      radius[i]++
    }

    // if the expansion goes beyond right, update center and right
    if (i + radius[i] > right) {
      center = i
      right = i + radius[i]
    }

    // track the max radius (= max palindrome length)
    if (radius[i] > maxRight) {
      maxRight = radius[i]
      maxCenter = i
    }
  }

  const start = (maxCenter - maxRight) / 2
  return s.substring(start, start + maxRight)
}
