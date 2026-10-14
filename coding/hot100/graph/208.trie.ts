class TrieNode {
  children: (TrieNode | null)[]
  end: boolean

  constructor() {
    this.children = Array(26).fill(null)
    this.end = false
  }
}

const aCode = "a".charCodeAt(0)

class Trie {
  private root: TrieNode

  constructor() {
    this.root = new TrieNode()
  }

  insert(word: string): void {
    let node = this.root

    for (const ch of word) {
      const idx = ch.charCodeAt(0) - aCode
      const next = node.children[idx]
      if (next === null) {
        node.children[idx] = new TrieNode()
      }
      node = node.children[idx]!
    }
    node.end = true
  }

  search(word: string): boolean {
    let node = this.root
    for (const ch of word) {
      const res = node.children[ch.charCodeAt(0) - aCode]
      if (res === null) return false
      node = res
    }
    return node.end
  }

  startsWith(prefix: string): boolean {
    let node = this.root
    for (const ch of prefix) {
      const res = node.children[ch.charCodeAt(0) - aCode]
      if (res === null) return false
      node = res
    }
    return true
  }
}

/**
 * Your Trie object will be instantiated and called as such:
 * var obj = new Trie()
 * obj.insert(word)
 * var param_2 = obj.search(word)
 * var param_3 = obj.startsWith(prefix)
 */
