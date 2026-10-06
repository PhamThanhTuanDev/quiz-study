import { describe, expect, it } from 'vitest'
import { highlightCode, type CodeTokenKind } from './codeHighlight'

/** Các đoạn không phải chữ thường (bỏ khoảng trắng, dấu câu) dạng [loại, chữ], để so sánh gọn. */
function colored(code: string): [CodeTokenKind, string][] {
  return highlightCode(code)
    .filter((token) => token.kind !== 'plain')
    .map((token) => [token.kind, token.text])
}

describe('highlightCode', () => {
  it('keeps the code exactly as it is when the pieces are joined back', () => {
    const code = 'class Person:\n  def __init__(self, fname):\n    self.firstname = fname  # lưu tên\nstd = Student("Mike")\n[…]'

    expect(highlightCode(code).map((token) => token.text).join('')).toBe(code)
  })

  it('colors a class like VS Code: keywords, class and function names, variables, strings', () => {
    expect(colored('class Student(Person):\n  def printname(self):\n    print(self.firstname)\nstd = Student("Mike")')).toEqual([
      ['keyword', 'class'],
      ['class', 'Student'],
      ['class', 'Person'],
      ['keyword', 'def'],
      ['function', 'printname'],
      ['keyword', 'self'],
      ['function', 'print'],
      ['keyword', 'self'],
      ['variable', 'firstname'],
      ['variable', 'std'],
      ['class', 'Student'],
      ['string', '"Mike"'],
    ])
  })

  it('tells control-flow keywords apart from other keywords, and colors numbers and built-in types', () => {
    expect(colored('for i in range(3):\n    if i % 2 == 0 and x is None:\n        n = int(2.5e3)')).toEqual([
      ['control', 'for'],
      ['variable', 'i'],
      ['keyword', 'in'],
      ['function', 'range'],
      ['number', '3'],
      ['control', 'if'],
      ['variable', 'i'],
      ['number', '2'],
      ['number', '0'],
      ['keyword', 'and'],
      ['variable', 'x'],
      ['keyword', 'is'],
      ['keyword', 'None'],
      ['variable', 'n'],
      ['class', 'int'],
      ['number', '2.5e3'],
    ])
  })

  it('treats # inside a string as text, and // as floor division, not a comment', () => {
    expect(colored('s = "a # b"  # chú thích\nprint(7 // 2)')).toEqual([
      ['variable', 's'],
      ['string', '"a # b"'],
      ['comment', '# chú thích'],
      ['function', 'print'],
      ['number', '7'],
      ['number', '2'],
    ])
  })

  it('reads string prefixes, escaped quotes and triple-quoted strings spanning lines', () => {
    expect(colored("print(f'{x}', 'it\\'s')\ndoc = '''dòng 1\ndòng 2'''")).toEqual([
      ['function', 'print'],
      ['string', "f'{x}'"],
      ['string', "'it\\'s'"],
      ['variable', 'doc'],
      ['string', "'''dòng 1\ndòng 2'''"],
    ])
  })

  it('colors a decorator at the start of a line, but not the @ operator between two arrays', () => {
    expect(colored('  @staticmethod\nc = a @ b')).toEqual([
      ['function', '@staticmethod'],
      ['variable', 'c'],
      ['variable', 'a'],
      ['variable', 'b'],
    ])
  })

  it('colors names written in capitals as constants', () => {
    expect(colored('MAX_SIZE = 10')).toEqual([
      ['constant', 'MAX_SIZE'],
      ['number', '10'],
    ])
  })
})
