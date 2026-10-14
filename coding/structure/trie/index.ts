class TrieNode {
  children = new Map<string, TrieNode>()
  isEnd = false
}

class Trie {
  private root = new TrieNode()

  insert(word: string): void {
    let node = this.root
    for (const ch of word) {
      let next = node.children.get(ch)
      if (!next) {
        next = new TrieNode()
        node.children.set(ch, next)
      }
      node = next
    }
    node.isEnd = true
  }

  search(word: string): boolean {
    return this.find(word)?.isEnd ?? false
  }

  startsWith(prefix: string): boolean {
    return this.find(prefix) !== null
  }

  collect(prefix: string): string[] {
    const words: string[] = []
    const start = this.find(prefix)
    if (start === null) return words
    const dfs = (node: TrieNode, path: string) => {
      if (node.isEnd) words.push(path)
      for (const [ch, child] of node.children) dfs(child, path + ch)
    }
    dfs(start, prefix)
    return words
  }

  private find(s: string): TrieNode | null {
    let node = this.root
    for (const ch of s) {
      const next = node.children.get(ch)
      if (!next) return null
      node = next
    }
    return node
  }
}

/* ==================== demo ==================== */
const trie = new Trie()
for (const word of ["cat", "car", "card", "dog"]) trie.insert(word)
console.log(trie.search("car"))
console.log(trie.search("ca")) // false: prefix but not a stored word
console.log(trie.startsWith("ca"))
console.log(trie.collect("car"))
console.log(trie.collect("d"))

export {}
