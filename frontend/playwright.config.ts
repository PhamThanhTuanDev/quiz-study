import { defineConfig, devices } from '@playwright/test'

/**
 * E2E cho luồng chính (D-041): chạy bằng Chrome đã cài trên máy (`channel: 'chrome'`), không tải trình duyệt
 * riêng của Playwright. Dùng database dev thật (môn đã import), nên lượt làm tạo ra trong lúc test là dữ liệu thử.
 * Chạy: `npm run test:e2e` (tự bật frontend và backend nếu chưa chạy; cần MySQL đang chạy).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    // Lưu dấu vết (ảnh, DOM, mạng) khi test hỏng, để xem lại bằng `npx playwright show-trace`.
    trace: 'retain-on-failure',
    locale: 'vi-VN',
  },
  projects: [
    // Điện thoại: màn hình nhỏ, cảm ứng (gợi ý phím tắt ẩn, chuyển câu bằng nút).
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
  webServer: [
    {
      // Ghi rõ "./": Windows có thể tắt việc tìm lệnh trong thư mục hiện tại (NoDefaultCurrentDirectoryInExePath).
      command: process.platform === 'win32' ? '.\\mvnw.cmd -q spring-boot:run' : './mvnw -q spring-boot:run',
      cwd: '../backend',
      url: 'http://localhost:8080/api/v1/health',
      // Đang chạy sẵn (ví dụ chủ dự án tự bật) thì dùng luôn, không bật thêm.
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
