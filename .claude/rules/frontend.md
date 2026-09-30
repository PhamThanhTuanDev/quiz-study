---
paths:
  - "frontend/**"
---
# Quy ước frontend (React + TypeScript)

## TypeScript
- `strict: true`. Không dùng `any`; dữ liệu chưa rõ kiểu thì dùng `unknown` rồi thu hẹp.
- Kiểu khớp DTO backend đặt trong `src/types/`. Props của component khai báo bằng `type`/`interface` rõ ràng.

## Cấu trúc
- `pages/`: một component cho mỗi route. `layouts/`: khung trang. `components/`: UI tái sử dụng, không gọi API trực tiếp.
- `services/`: **chỉ nơi này** gọi `fetch`. Dùng chung một `apiClient` xử lý base URL `/api/v1`, JSON và lỗi Problem Details.
- `hooks/`: logic tái sử dụng (lấy dữ liệu, trạng thái làm bài).
- State dùng `useState` / `useReducer` / Context. **Không** thêm Redux, Zustand, axios, TanStack Query khi chưa được duyệt.
- React Router dùng ở chế độ SPA (library mode), không dùng framework mode/SSR.

## Giao diện
- **Màu dùng token ngữ nghĩa** trong `src/index.css` (D-028): `bg-canvas`, `bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-primary`, `text-danger`… Không dùng màu cụ thể của Tailwind (`bg-teal-700`, `text-slate-600`). Cần màu mới thì thêm token.
- Dùng lại component có sẵn trong `components/` (`Button`, `ButtonLink`, `Card`, `AsyncContent`, `LoadingState`, `ErrorState`, `EmptyState`) trước khi viết mới.
- Phần trang tải dữ liệu: `const { state, reload } = useAsync(load)` rồi `<AsyncContent state={state} onRetry={reload}>{(data) => …}</AsyncContent>`. `AsyncContent` lo trạng thái đang tải / lỗi / giữ focus khi bấm "Thử lại"; `load` phải ổn định (hàm trong `services/` hoặc `useCallback`).
- Chỉ hiện cho người dùng thông điệp của `ApiError` (tiếng Việt); lỗi khác hiện thông điệp chung.
- Đặt tiêu đề tab cho mỗi trang bằng thẻ `<title>` trong component (React 19 tự đưa lên `<head>`).
- **Mobile-first**: class Tailwind không tiền tố áp dụng cho mobile; mở rộng bằng `sm:` `md:` `lg:`. Kiểm tra ở 360px, 768px, 1280px.
- Vùng bấm tối thiểu khoảng 44×44px; chữ đủ lớn trên điện thoại.
- HTML ngữ nghĩa (`button`, `nav`, `main`, `label`), điều hướng được bằng bàn phím.
- Đoạn code trong câu hỏi hiển thị bằng `<pre><code>` font monospace, giữ nguyên thụt lề, cuộn ngang được trên mobile.
- Luôn có trạng thái loading / lỗi / rỗng.
- Không hard-code tên môn hay hiển thị riêng theo môn; mọi thứ lấy từ dữ liệu API.

## Test
- Vitest + React Testing Library: test theo hành vi người dùng (tìm theo role/label), không test chi tiết cài đặt.
- E2E (Playwright) cho luồng chính: chọn môn → làm bài → nộp → xem kết quả.
- Chạy `npm run build`, `npm run test`, `npm run lint` sau khi thay đổi.
