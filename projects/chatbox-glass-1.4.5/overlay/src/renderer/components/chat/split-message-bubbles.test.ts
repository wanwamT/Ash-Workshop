import { describe, expect, it } from 'vitest'
import { splitMessageBubbles } from './split-message-bubbles'

describe('display-only bubble segmentation', () => {
  it('splits prose on empty lines, preserving single line breaks', () => {
    const source = '第一条。\n还是这一条。\n\n第二条。\n\n第三条。'
    expect(splitMessageBubbles(source)).toEqual(['第一条。\n还是这一条。', '第二条。', '第三条。'])
    expect(source).toContain('\n\n')
  })
  it('keeps blank lines inside fenced code and display math', () => {
    expect(splitMessageBubbles('说明。\n\n```js\nconst x = 1\n\nconsole.log(x)\n```\n\n$$\na + b\n\nc + d\n$$\n\n结束。')).toEqual([
      '说明。', '```js\nconst x = 1\n\nconsole.log(x)\n```', '$$\na + b\n\nc + d\n$$', '结束。',
    ])
  })
  it('preserves loose and nested lists, including indented continuation paragraphs', () => {
    const list = '- one\n\n  more detail\n\n  - nested\n\n- two'
    expect(splitMessageBubbles(`开头。\n\n${list}\n\n结束。`)).toEqual(['开头。', list, '结束。'])
  })
  it('keeps reference links, footnotes and HTML in one rendering scope', () => {
    for (const text of ['See [link][id].\n\nOther.\n\n[id]: https://example.com', 'Text[^a].\n\n[^a]: A note', '<div>\n\ninside\n\n</div>']) {
      expect(splitMessageBubbles(text)).toEqual([text])
    }
  })
  it('preserves tables, unfinished code and continued blockquotes', () => {
    const table = '| A | B |\n| --- | --- |\n| 1 | 2 |'
    expect(splitMessageBubbles(`Intro\n\n${table}\n\nEnd`)).toEqual(['Intro', table, 'End'])
    expect(splitMessageBubbles('```js\nhello\n\nworld')).toEqual(['```js\nhello\n\nworld'])
    expect(splitMessageBubbles('> quote\n\n> continued\n\nEnd')).toEqual(['> quote\n\n> continued', 'End'])
  })
  it('handles CRLF, empty messages and exceptionally many paragraphs safely', () => {
    expect(splitMessageBubbles('a\r\n\r\nb')).toEqual(['a', 'b'])
    expect(splitMessageBubbles('')).toEqual([''])
    expect(splitMessageBubbles('    const x = 1\n\n    console.log(x)')).toEqual(['    const x = 1\n\n    console.log(x)'])
    const large = Array.from({ length: 121 }, (_, i) => `${i}`).join('\n\n')
    expect(splitMessageBubbles(large)).toEqual([large])
  })
})

describe('fine message splitting', () => {
  it('splits single line breaks while keeping paragraph mode available', () => {
    expect(splitMessageBubbles('第一行\n第二行\n\n第三段', 'line')).toEqual(['第一行', '第二行', '第三段'])
    expect(splitMessageBubbles('第一行\n第二行', 'paragraph')).toEqual(['第一行\n第二行'])
  })
  it('separates top-level list items while keeping nested lists in their parent bubble', () => {
    expect(splitMessageBubbles('- 第一项\n  - 子项\n- 第二项\n- 第三项', 'line')).toEqual(['- 第一项\n  - 子项', '- 第二项', '- 第三项'])
    expect(splitMessageBubbles('1. one\n2. two', 'line')).toEqual(['1. one', '2. two'])
  })
  it('splits Chinese and English sentences without isolating closing quotes or decimals', () => {
    expect(splitMessageBubbles('他说：“你好。”然后走了！再见。', 'sentence')).toEqual(['他说：“你好。”', '然后走了！', '再见。'])
    expect(splitMessageBubbles('Value is 3.14. Next sentence.', 'sentence')).toEqual(['Value is 3.14.', 'Next sentence.'])
  })
  it('keeps code, math, pipe-less tables and reference links intact in fine mode', () => {
    for (const mode of ['line', 'sentence'] as const) {
      for (const source of ['```js\na\nb\n```', '        code\n        more', '$$\nx\ny\n$$', 'A | B\n--- | ---\n1 | 2', 'See [x][r].\n\n[r]: https://example.com']) {
        expect(splitMessageBubbles(source, mode)).toEqual([source])
      }
    }
  })
})
