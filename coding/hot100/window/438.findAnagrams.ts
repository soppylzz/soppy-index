// need review
function findAnagrams(s: string, p: string): number[] {
  const aCode = "a".charCodeAt(0)
  const result: number[] = []
  if (p.length > s.length) return result

  // note: track matches + diff to avoid comparing the whole window on each slide
  const diff = Array(26).fill(0)
  for (let i = 0; i < p.length; i++) {
    diff[p.charCodeAt(i) - aCode]++
    diff[s.charCodeAt(i) - aCode]--
  }

  let matches = 0
  for (let i = 0; i < 26; i++) {
    if (diff[i] === 0) matches++
  }
  if (matches === 26) result.push(0)

  for (let i = p.length; i < s.length; i++) {
    const out = s.charCodeAt(i - p.length) - aCode
    const add = s.charCodeAt(i) - aCode

    diff[out]++
    if (diff[out] === 0) matches++
    if (diff[out] === 1) matches--

    diff[add]--
    if (diff[add] === 0) matches++
    if (diff[add] === -1) matches--

    if (matches === 26) result.push(i - p.length + 1)
  }

  return result
}
