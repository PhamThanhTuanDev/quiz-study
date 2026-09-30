# Kế hoạch phát triển

> Nguyên tắc: làm **từng phase một**. Hết mỗi phase phải build/test đạt và **bạn xác nhận** rồi mới sang phase sau.
> Phase lớn được lập kế hoạch chi tiết (plan) và trình bạn duyệt trước khi code.

## Tiến độ hiện tại

> Cập nhật: 2026-09-30 (phiên 2, trên **máy 2**: Windows 11, xem [architecture.md §10](architecture.md#10-môi-trường-phát-triển)).
> **Đang làm: Phase 2**, bước lập kế hoạch chi tiết để chủ dự án duyệt. Chưa viết code Phase 2.

### Phase 1: ✅ xong, chủ dự án đã duyệt (2026-09-30)
- **Frontend** (`frontend/`): `create-vite@9.2.1` template `react-ts`. React 19.3, TypeScript 6.0 (`strict`), Vite 8.3, Tailwind CSS 4.3, React Router 8.4, Vitest 5.0 + React Testing Library 16, Oxlint (D-023). Proxy `/api` → `http://localhost:8080`. Trang chủ hiển thị trạng thái backend/database. Kết quả: 7/7 test, lint sạch, build đạt.
- **Backend** (`backend/`): Spring Boot 4.1.1, **Java 25** (D-024), Maven Wrapper; starter `webmvc`, `data-jpa`, `validation`, `flyway` + `flyway-mysql`, `mysql-connector-j`. `GET /api/v1/health` (`HealthController` → `HealthService`). Mockito nạp làm Java agent khi test (D-025). Kết quả: `mvnw.cmd clean verify` 6/6 test, không cảnh báo.
- **Cấu hình:** `application.yml` đọc `.env` (`DB_PASSWORD` bắt buộc), `ddl-auto: validate`, Flyway `classpath:db/migration`; profile `test` dùng `quiz_study_test`.
- **Database:** `database/init/01-create-database.sql` + `scripts/setup-database.ps1` tạo `quiz_study`, `quiz_study_test`, user `quiz_app`@`localhost`. Máy 2 đã chạy.
- **Kiểm tra tích hợp:** backend + frontend chạy cùng lúc, `/api/v1/health` qua proxy Vite trả `{"status":"UP","database":"UP"}`.
- **Git:** commit đầu tiên trên nhánh `main` (Q-15), chưa push.

### Điểm kỹ thuật đã phát hiện
- ID `4.1.1.RELEASE` trong metadata của Spring Initializr **không phải** phiên bản Maven. Trên Maven Central là `4.1.1`; `pom.xml` đã được sửa.
- Flyway 12.4 bản Community hỗ trợ MySQL từ 8.0, nên MySQL 8.0.46 dùng được.
- Vitest 5: cấu hình qua `defineConfig` của `vitest/config`; jest-dom import `@testing-library/jest-dom/vitest`; không bật globals nên `setupTests.ts` tự gọi `cleanup()`.
- React Router 8: `createBrowserRouter` lấy từ `react-router`, `RouterProvider` lấy từ `react-router/dom`.
- `node_modules/` và `backend/target/` không được copy khi chuyển máy. Chạy `npm install` và `mvnw.cmd -DskipTests package` để tạo lại.
- Vitest 5 yêu cầu Node `^22.12 || ^24 || >=26` (chặt hơn Vite 8). Trên máy 2 (Node 24.20): test, lint, build frontend đều đạt.
- Máy 2: `JAVA_HOME` (cấp User) = `C:\Program Files\Java\jdk-25.0.4` (D-024).
- Cảnh báo "Mockito is currently self-attaching…" của JDK 21+ đã xử lý bằng cách nạp Mockito làm Java agent trong `maven-surefire-plugin`, kèm `-Xshare:off` (D-025).
- VS Code trên máy 2 tự tạo `.github/modernize/` (có `.gitignore` bỏ qua toàn bộ) và `.vscode/settings.json` (đã bị `.gitignore` bỏ qua). Không thuộc dự án, không commit.

## Trạng thái

| Phase | Tên | Trạng thái |
|---|---|---|
| 0 | Khởi tạo: khảo sát, tài liệu, skill, cấu trúc thư mục | ✅ Xong, đã duyệt |
| 1 | Project setup | ✅ Xong, đã duyệt |
| 2 | Database + Backend foundation | 🔄 Đang lập kế hoạch (xem "Tiến độ hiện tại") |
| 3 | Frontend foundation | |
| 4 | Subject / Chapter / Question / Answer | |
| 5 | Quiz engine | |
| 6 | Result / history | |
| 7 | Authentication | |
| 8 | Admin management | |
| 9 | Ranking / statistics | |
| 10 | PWA / mobile experience | |

---

## Phase 1: Project setup

**Mục tiêu:** có khung frontend và backend chạy được, nói chuyện được với nhau; chưa có tính năng.

Công việc:
- Frontend: tạo project bằng template chính thức `npm create vite@latest` (react-ts) trong `frontend/`; cài Tailwind CSS (`@tailwindcss/vite`), React Router, Vitest + React Testing Library; bật TypeScript `strict`; cấu hình proxy `/api` sang `localhost:8080`.
- Backend: tạo project bằng Spring Initializr (Maven, Java 21 → sau đổi Java 25 theo D-024, Spring Boot 4.1.x) với Spring Web, Spring Data JPA, Validation, MySQL Driver (thêm Flyway nếu D-009 được duyệt); endpoint `GET /api/v1/health`.
- Database: tạo database `quiz_study` và user riêng `quiz_app` (không dùng `root`) trên MySQL local; mật khẩu để trong biến môi trường.
- Cập nhật README: cách chạy frontend/backend.
- Commit đầu tiên (khi bạn đồng ý).

Hoàn thành khi:
- `npm run build` và `npm run test` (frontend) chạy đạt.
- `mvnw verify` (backend) chạy đạt, backend kết nối được MySQL.
- Trang frontend gọi `/api/v1/health` và hiển thị kết quả.

Các quyết định cần có đã chốt: vị trí project (D-018), package Java, Flyway, Spring Boot 4.1.1 (D-007 đến D-009). Xem [decisions.md](decisions.md).

## Phase 2: Database + Backend foundation

**Mục tiêu:** có schema nội dung và nền móng backend chuẩn để các phase sau chỉ việc thêm tính năng.

Công việc:
- Migration tạo bảng `subjects`, `chapters`, `questions`, `answers` theo [database-design.md](database-design.md).
- Entity + Repository tương ứng.
- Xử lý lỗi tập trung (`@RestControllerAdvice`, Problem Details), quy ước DTO, validation.
- Cấu hình profile `dev` / `test`; database test riêng.
- Test repository và test cho phần xử lý lỗi.

Hoàn thành khi: backend khởi động với schema mới, test repository đạt, Hibernate `validate` khớp schema.

## Phase 3: Frontend foundation

**Mục tiêu:** khung giao diện mobile-first dùng chung.

Công việc:
- `MainLayout` (header, điều hướng trên mobile), trang chủ, trang 404.
- `services/apiClient.ts` (bọc `fetch`, xử lý lỗi theo Problem Details), kiểu dữ liệu trong `types/`.
- Component cơ bản: nút, thẻ, trạng thái loading/lỗi/rỗng.
- Quy ước màu, chữ, khoảng cách bằng Tailwind.
- Test component cơ bản.

Hoàn thành khi: `npm run build`, `npm run test`, `npm run lint` đạt; giao diện hiển thị tốt ở 360px, 768px, 1280px.

## Phase 4: Subject / Chapter / Question / Answer

**Mục tiêu:** có dữ liệu thật và xem được môn/chương.

Công việc:
- API đọc: danh sách môn, chi tiết môn + chương.
- Frontend: trang danh sách môn, trang chi tiết môn.
- **Import dữ liệu:** script trích xuất GDQP (230 câu) sinh JSON, **bạn duyệt** các điểm G1–G5, rồi import. Python làm sau, khi đã chốt P1–P14.
- Kiểm tra toàn vẹn khi import: câu `PUBLISHED` phải có đúng 1 đáp án đúng; câu thiếu đáp án thành `DRAFT`.

Hoàn thành khi: xem được môn GDQP và danh sách bài trên web; số câu trong DB khớp báo cáo nguồn; không câu nào bị sửa nội dung.

## Phase 5: Quiz engine

**Mục tiêu:** làm bài được.

Công việc:
- Migration `quizzes`, `quiz_results`, `user_answers`; tạo đề luyện tập mặc định cho mỗi chương / môn.
- API bắt đầu lượt làm (rút ngẫu nhiên N câu `PUBLISHED`), lưu lựa chọn, nộp bài; chấm ở server.
- Tôn trọng `shuffle_answers = FALSE` cho câu "Tất cả đều đúng"…
- Frontend: trang làm bài (một câu một màn hình trên mobile, có điều hướng câu), hiển thị code đúng thụt lề, đồng hồ (nếu đề có giới hạn thời gian).
- Test: rút câu không trùng, không lộ `is_correct` trước khi nộp, chấm điểm đúng.

Cần quyết định trước: chế độ luyện tập có hiện đáp án ngay sau mỗi câu không; khách (chưa đăng nhập) có được làm bài không; thang điểm.

## Phase 6: Result / history

**Mục tiêu:** xem kết quả và làm lại.

Công việc:
- Trang kết quả: điểm, số câu đúng, xem lại từng câu (đã chọn gì, đáp án đúng).
- API và trang lịch sử làm bài.

Lưu ý: lịch sử theo từng người dùng cần đăng nhập (Phase 7). Có thể **đổi thứ tự Phase 6 ↔ 7**, hoặc ở Phase 6 chỉ làm trang kết quả và API, phần lịch sử cá nhân hoàn thiện sau Phase 7. Bạn quyết định.

## Phase 7: Authentication

**Mục tiêu:** đăng ký, đăng nhập, phân quyền.

Công việc:
- Thêm Spring Security; bảng `users`; đăng ký/đăng nhập/đăng xuất; BCrypt.
- Vai trò `USER` / `ADMIN`; bảo vệ `/api/v1/admin/**`.
- Gắn lượt làm bài với người dùng.
- Frontend: trang đăng nhập/đăng ký, route cần đăng nhập.
- Security review (agent `security-reviewer`, `/security-review`).

Cần quyết định trước: session cookie hay JWT.

## Phase 8: Admin management

**Mục tiêu:** quản lý nội dung không cần đụng database.

Công việc:
- CRUD môn, chương, câu hỏi, phương án (có validation đáp án).
- **Hàng đợi duyệt:** danh sách câu `DRAFT` / `NEEDS_REVIEW` kèm `review_note`, nguồn (file, trang, số câu) để đối chiếu và duyệt.
- Import file JSON qua giao diện.
- Không xoá cứng câu đã dùng; chỉ lưu trữ (`ARCHIVED`).

## Phase 9: Ranking / statistics

**Mục tiêu:** tạo động lực học và biết mình yếu ở đâu.

Công việc:
- Thống kê cá nhân: tỉ lệ đúng theo môn/chương, tiến bộ theo thời gian.
- Bảng xếp hạng theo môn/đề.
- Thống kê câu hỏi: câu hay sai (hỗ trợ admin rà soát nội dung).
- Tính từ `quiz_results` / `user_answers`; kiểm tra index, hiệu năng truy vấn.

## Phase 10: PWA / mobile experience

**Mục tiêu:** dùng tốt trên điện thoại như một ứng dụng.

Công việc:
- Web App Manifest, icon, cài lên màn hình chính.
- Service worker (cache tài nguyên tĩnh; luyện tập offline nếu cần). Thường cần thêm plugin như `vite-plugin-pwa`, **phải được duyệt**.
- Rà soát hiệu năng, accessibility và thao tác chạm trên mobile.
- E2E test (Playwright) cho luồng chính trên viewport mobile.

---

## Quy trình cho mỗi phase

1. Lập plan chi tiết, gồm file sẽ tạo/sửa, dependency mới (nếu có) và cách kiểm tra. **Bạn duyệt.**
2. Làm từng bước nhỏ; viết test song song với code.
3. Chạy build + test; review (agent/`/code-review`) cho thay đổi đáng kể.
4. Cập nhật tài liệu (`docs/`, README) và [decisions.md](decisions.md) nếu có quyết định mới.
5. Báo cáo kết quả. Commit khi bạn đồng ý. **Không push** khi chưa được yêu cầu.
