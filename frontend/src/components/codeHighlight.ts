/**
 * Tách code thành từng đoạn theo loại (từ khoá, chuỗi, số, tên hàm…) để tô màu giống VS Code (D-047).
 * Viết riêng thay vì thêm thư viện: chỉ cần tô màu để dễ đọc, và trả về dữ liệu (không phải HTML) để React
 * tự hiển thị, không cần dangerouslySetInnerHTML.
 *
 * Quy tắc theo cú pháp Python (code của các môn hiện có đều là Python). Ngôn ngữ khác vẫn hiển thị đúng chữ,
 * chỉ tô màu kém chính xác hơn; khi có môn dùng ngôn ngữ khác thì đưa thông tin ngôn ngữ vào dữ liệu câu hỏi.
 * Ghép các đoạn lại luôn ra đúng code ban đầu (không thêm, không bớt ký tự).
 */

export type CodeTokenKind =
  | 'plain'
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'control'
  | 'function'
  | 'class'
  | 'constant'
  | 'variable'

export interface CodeToken {
  kind: CodeTokenKind
  text: string
}

/** Từ khoá điều khiển luồng / import: VS Code tô tím. */
const CONTROL_WORDS = new Set([
  'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'return', 'pass', 'try', 'except', 'finally',
  'raise', 'with', 'import', 'from', 'as', 'yield', 'await',
])

/** Từ khoá khai báo, toán tử chữ và hằng có sẵn: VS Code tô xanh dương. */
const KEYWORDS = new Set([
  'def', 'class', 'lambda', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False', 'global', 'nonlocal',
  'del', 'assert', 'async', 'self', 'cls',
])

/** Kiểu có sẵn: tô như tên lớp. */
const BUILTIN_TYPES = new Set([
  'int', 'float', 'complex', 'str', 'bool', 'list', 'dict', 'set', 'frozenset', 'tuple', 'bytes', 'object', 'type',
])

// Mỗi mẫu dùng cờ "y" (sticky): chỉ khớp đúng tại vị trí đang xét.
const COMMENT_RE = /#[^\n]*/y
// Tiền tố r / b / u / f (có thể ghép, ví dụ rb, f); chuỗi 3 dấu nháy được xuống dòng; chuỗi chưa đóng thì tới cuối dòng.
const STRING_RE = /(?:[rRbBuUfF]{1,2})?(?:'''[\s\S]*?(?:'''|$)|"""[\s\S]*?(?:"""|$)|'(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?)/y
const NUMBER_RE = /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[jJ]?)/y
const NAME_RE = /[\p{L}_][\p{L}\p{N}_]*/uy
const CALL_AFTER_RE = /^\s*\(/
const ALL_CAPS_RE = /^[A-Z][A-Z0-9_]+$/

export function highlightCode(code: string): CodeToken[] {
  const tokens: CodeToken[] = []
  let previousName = ''
  let lineStart = true
  let index = 0

  const push = (kind: CodeTokenKind, text: string) => {
    const last = tokens.at(-1)
    if (last && last.kind === kind && kind === 'plain') last.text += text
    else tokens.push({ kind, text })
  }

  while (index < code.length) {
    const char = code[index]
    if (char === '\n') {
      push('plain', char)
      lineStart = true
      index++
      continue
    }
    if (char === ' ' || char === '\t') {
      push('plain', char)
      index++
      continue
    }

    const decorator = lineStart && char === '@' ? matchAt(NAME_RE, code, index + 1) : null
    const match =
      (decorator !== null && { kind: 'function' as const, text: '@' + decorator }) ||
      matchKind('comment', COMMENT_RE, code, index) ||
      matchKind('string', STRING_RE, code, index) ||
      matchKind('number', NUMBER_RE, code, index)
    if (match) {
      push(match.kind, match.text)
      index += match.text.length
    } else {
      const name = matchAt(NAME_RE, code, index)
      if (name !== null) {
        const after = code.slice(index + name.length)
        push(nameKind(name, previousName, CALL_AFTER_RE.test(after)), name)
        previousName = name
        index += name.length
      } else {
        push('plain', char)
        index++
      }
    }
    lineStart = false
  }
  return tokens
}

function nameKind(name: string, previousName: string, isCall: boolean): CodeTokenKind {
  if (CONTROL_WORDS.has(name)) return 'control'
  if (KEYWORDS.has(name)) return 'keyword'
  if (previousName === 'def') return 'function'
  if (previousName === 'class' || BUILTIN_TYPES.has(name)) return 'class'
  if (ALL_CAPS_RE.test(name)) return 'constant'
  // Quy ước Python: tên lớp viết hoa chữ đầu (Student("Mike") là tạo đối tượng, không phải gọi hàm).
  if (/^[A-Z]/.test(name)) return 'class'
  if (isCall) return 'function'
  return 'variable'
}

function matchAt(pattern: RegExp, code: string, index: number): string | null {
  pattern.lastIndex = index
  const match = pattern.exec(code)
  return match && match[0].length > 0 ? match[0] : null
}

function matchKind(kind: CodeTokenKind, pattern: RegExp, code: string, index: number): CodeToken | null {
  const text = matchAt(pattern, code, index)
  return text === null ? null : { kind, text }
}
