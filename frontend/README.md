# frontend/

Ứng dụng web **React + Vite + TypeScript + Tailwind CSS + React Router**.

> **Trạng thái:** chưa scaffold. Project sẽ được tạo ở **Phase 1** bằng template chính thức `npm create vite@latest` (react-ts). Hiện chỉ có khung thư mục `src/`.

## Cấu trúc dự kiến

```
frontend/
├── index.html
├── package.json
├── vite.config.ts        # plugin React + Tailwind; proxy /api -> http://localhost:8080
├── tsconfig*.json        # strict: true
└── src/
    ├── components/       # UI tái sử dụng (không gọi API trực tiếp)
    ├── pages/            # Mỗi route một trang
    ├── layouts/          # Khung trang (header, điều hướng mobile)
    ├── services/         # Nơi duy nhất gọi API (apiClient + service theo tài nguyên)
    ├── hooks/            # Custom hooks
    ├── types/            # Kiểu TypeScript khớp DTO backend
    ├── App.tsx
    └── main.tsx
```

Quy ước: [.claude/rules/frontend.md](../.claude/rules/frontend.md) · Kiến trúc: [docs/architecture.md](../docs/architecture.md)
