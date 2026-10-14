function partitionViaMerge(s: string): string[][] {
  const result: string[][] = []
  /**
   * weak: the merge-based dfs can produce duplicate results; dedupe with a key cache, e.g.:
   * 1.|a|a|a|a| => |aa|a|a| => |aa|aa|
   * 2.|a|a|a|a| => |a|a|aa| => |aa|aa|
   */
  const visited = new Set<string>()

  function dfs(splits: string[]) {
    const key = JSON.stringify(splits.join("|"))
    if (visited.has(key)) return

    result.push(splits)
    visited.add(key)

    // possible optimization: better start settings
    for (let i = 0; i < splits.length; i++) {
      if (splits[i] === splits[i + 1]) {
        const newSplits = [
          ...splits.slice(0, i),
          splits.slice(i, i + 2).join(""),
          ...splits.slice(i + 2),
        ]
        dfs(newSplits)
      }
      if (i + 2 < splits.length && splits[i] === splits[i + 2]) {
        const newSplits = [
          ...splits.slice(0, i),
          splits.slice(i, i + 3).join(""),
          ...splits.slice(i + 3),
        ]
        dfs(newSplits)
      }
    }
  }

  dfs(s.split(""))
  return result
}

function partition(s: string): string[][] {
  const result: string[][] = []
  const path: string[] = []

  function isPalindrome(str: string) {
    let left = 0
    let right = str.length - 1

    while (left < right) {
      if (str[left] !== str[right]) return false
      left++
      right--
    }
    return true
  }

  function dfs(start: number) {
    if (start === s.length) {
      result.push(path.slice())
      return
    }

    for (let end = start; end < s.length; end++) {
      const sub = s.slice(start, end + 1)
      if (!isPalindrome(sub)) continue

      path.push(sub)
      dfs(end + 1)
      path.pop()
    }
  }

  dfs(0)

  return result
}
