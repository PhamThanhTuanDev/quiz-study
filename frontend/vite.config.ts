import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA (D-040): cài lên màn hình chính; service worker lưu sẵn file giao diện để mở được khi mất mạng.
    // Không lưu đệm API (/api): dữ liệu làm bài luôn lấy mới từ server, và không làm bài offline.
    VitePWA({
      // Có bản mới thì hỏi người dùng (UpdatePrompt) thay vì tự tải lại giữa lúc đang làm bài.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Quiz Study',
        short_name: 'Quiz Study',
        description: 'Học tập và luyện thi trắc nghiệm nhiều môn',
        lang: 'vi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Khớp token màu trong src/index.css (--color-canvas, --color-primary).
        background_color: '#fafaf9',
        theme_color: '#0f766e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // Mở đường dẫn bất kỳ của SPA khi mất mạng (ví dụ /subjects/python) thì trả index.html đã lưu,
        // trừ /api: request API phải tới server thật.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // Khi chạy dev, mọi request /api được chuyển sang backend Spring Boot,
      // nên trình duyệt thấy cùng một origin và không cần cấu hình CORS.
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
