/** Display-only paragraph splitting. Never changes messages or model context. */
function splitParagraphBubbles(text: string): string[] {
  if (!text.trim()) return [text]
  // Reference definitions and HTML can bind distant blocks together. Keep them intact.
  if (/^ {0,3}\[[^\]]+\]:/m.test(text) || /^ {0,3}<\/?[a-z][\w-]*(?:\s|>|\/)/im.test(text)) return [text]
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const parts: string[] = []
  let block: string[] = []
  let fence: { char: string; length: number } | undefined
  let mathEnd: string | undefined
  let inList = false
  const flush = () => {
    if (block.some((line) => line.trim())) parts.push(block.join('\n').replace(/^\n+|\n+$/g, ''))
    block = []; inList = false
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (fence) {
      block.push(line)
      if (new RegExp(`^\\s{0,3}${fence.char}{${fence.length},}\\s*$`).test(line)) fence = undefined
      continue
    }
    if (mathEnd) {
      block.push(line)
      if (line.trim() === mathEnd) mathEnd = undefined
      continue
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (opening) {
      fence = { char: opening[1][0], length: opening[1].length }
      block.push(line); continue
    }
    if (line.trim() === '$$' || line.trim() === '\\[') {
      mathEnd = line.trim() === '$$' ? '$$' : '\\]'
      block.push(line); continue
    }
    if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(line)) inList = true
    if (!line.trim()) {
      let next = i + 1
      while (next < lines.length && !lines[next].trim()) next++
      const following = lines[next] ?? ''
      // Preserve loose/nested lists, indented code, and continued blockquotes.
      if ((inList && /^(?:\s+(?:\S)|\s*(?:[-+*]|\d+[.)])\s+)/.test(following)) ||
          (/^ {4}|^\t/.test(following) && block.length > 0) ||
          (block.some((s) => /^\s*>/.test(s)) && /^\s*>/.test(following))) {
        block.push(line)
      } else flush()
    } else block.push(line)
  }
  flush()
  // Avoid creating thousands of DOM nodes from a very large pasted transcript.
  return parts.length > 120 ? [text] : parts.length ? parts : [text]
}


export type BubbleSplitMode = 'paragraph' | 'line' | 'sentence'

function splitSentences(line: string): string[] {
  // Rich inline Markdown may span punctuation; keep that formatting scope intact.
  if (/[`*_\[\]<>]/.test(line) || /https?:\/\//.test(line)) return [line]
  const parts: string[] = []
  let start = 0
  for (let i = 0; i < line.length; i++) {
    if (!/[。！？!?]/.test(line[i]) && !(line[i] === '.' && /\s/.test(line[i + 1] ?? ''))) continue
    while (i + 1 < line.length && /[。！？!?”’」』）)]/.test(line[i + 1])) i++
    const part = line.slice(start, i + 1).trim()
    if (part) parts.push(part)
    start = i + 1
  }
  const tail = line.slice(start).trim()
  if (tail) parts.push(tail)
  return parts.length ? parts : [line]
}

export function splitMessageBubbles(text: string, mode: BubbleSplitMode = 'paragraph'): string[] {
  const paragraphs = splitParagraphBubbles(text)
  if (mode === 'paragraph' || !text.trim() || /^ {0,3}\[[^\]]+\]:/m.test(text) || /^ {0,3}<\/?[a-z][\w-]*(?:\s|>|\/)/im.test(text)) return paragraphs
  const result = paragraphs.flatMap((block) => {
    // Fences, indented code, math, tables and quotes remain one complete rendering scope.
    if (/^ {0,3}(?:`{3,}|~{3,}|>)/m.test(block) || /^(?: {4,}|\t)\S/m.test(block) || /^\s*(?:\$\$|\\\[|\|)/m.test(block)) return [block]
    if (block.includes('|')) return [block]
    const lines = block.split('\n')
    const markers = lines.map((line) => line.match(/^( *)(?:[-+*]|\d+[.)])\s+/))
    const indents = markers.filter((m) => m !== null).map((m) => m![1].length)
    if (indents.length) {
      const level = Math.min(...indents)
      const items: string[] = []
      let current: string[] = []
      lines.forEach((line, i) => {
        if (markers[i]?.[1].length === level && current.some((s) => s.trim())) {
          items.push(current.join('\n').replace(/^\n+|\n+$/g, '')); current = []
        }
        current.push(line)
      })
      if (current.some((s) => s.trim())) items.push(current.join('\n').replace(/^\n+|\n+$/g, ''))
      return items
    }
    // Avoid splitting an inline code span that crosses a physical line.
    if (block.includes('`')) return [block]
    return lines.filter((line) => line.trim()).flatMap((line) => mode === 'sentence' ? splitSentences(line) : [line])
  })
  return result.length > 200 ? [text] : result.length ? result : [text]
}
