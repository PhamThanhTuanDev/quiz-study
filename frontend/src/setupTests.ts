import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest không bật globals, nên phải tự dọn DOM sau mỗi test.
// localStorage của jsdom dùng chung trong một file test: xoá để test sau không thấy "lượt làm gần đây" của test trước.
afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

// jsdom chưa có showModal / close của <dialog> (hộp xem hình phóng to): giả lập phần test cần là mở / đóng.
// Giữ focus trong hộp và Esc để đóng là việc của trình duyệt thật, kiểm tra bằng E2E.
if (!('showModal' in HTMLDialogElement.prototype)) {
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      this.open = true
    },
    close(this: HTMLDialogElement) {
      this.open = false
      this.dispatchEvent(new Event('close'))
    },
  })
}
