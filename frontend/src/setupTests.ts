import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest không bật globals, nên phải tự dọn DOM sau mỗi test.
// localStorage của jsdom dùng chung trong một file test: xoá để test sau không thấy "lượt làm gần đây" của test trước.
afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
