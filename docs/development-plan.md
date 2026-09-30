# Kế hoạch phát triển

> Nguyên tắc: làm **từng phase một**. Hết mỗi phase phải build/test đạt và **bạn xác nhận** rồi mới sang phase sau.
> Phase lớn được lập kế hoạch chi tiết (plan) và trình bạn duyệt trước khi code.

## Tiến độ hiện tại

> Cập nhật: 2026-09-30 (phiên 2, trên **máy 2**: Windows 11, xem [architecture.md §10](architecture.md#10-môi-trường-phát-triển)).
> **Đang làm: Phase 4B (Python)**, bước lập kế hoạch chi tiết để chủ dự án duyệt. Phase 4A (GDQP) đã xong và được duyệt.

### Phase 1: ✅ xong, chủ dự án đã duyệt (2026-09-30)
- **Frontend** (`frontend/`): `create-vite@9.2.1` template `react-ts`. React 19.3, TypeScript 6.0 (`strict`), Vite 8.3, Tailwind CSS 4.3, React Router 8.4, Vitest 5.0 + React Testing Library 16, Oxlint (D-023). Proxy `/api` → `http://localhost:8080`. Trang chủ hiển thị trạng thái backend/database. Kết quả: 7/7 test, lint sạch, build đạt.
- **Backend** (`backend/`): Spring Boot 4.1.1, **Java 25** (D-024), Maven Wrapper; starter `webmvc`, `data-jpa`, `validation`, `flyway` + `flyway-mysql`, `mysql-connector-j`. `GET /api/v1/health` (`HealthController` → `HealthService`). Mockito nạp làm Java agent khi test (D-025). Kết quả: `mvnw.cmd clean verify` 6/6 test, không cảnh báo.
- **Cấu hình:** `application.yml` đọc `.env` (`DB_PASSWORD` bắt buộc), `ddl-auto: validate`, Flyway `classpath:db/migration`; profile `test` dùng `quiz_study_test`.
- **Database:** `database/init/01-create-database.sql` + `scripts/setup-database.ps1` tạo `quiz_study`, `quiz_study_test`, user `quiz_app`@`localhost`. Máy 2 đã chạy.
- **Kiểm tra tích hợp:** backend + frontend chạy cùng lúc, `/api/v1/health` qua proxy Vite trả `{"status":"UP","database":"UP"}`.
- **Git:** commit đầu tiên trên nhánh `main` (Q-15), chưa push.

### Phase 2: ✅ xong, chủ dự án đã duyệt (2026-09-30)
- **Schema:** migration `V1__create_content_tables.sql` tạo `subjects`, `chapters`, `questions`, `answers` đúng [database-design.md](database-design.md) (InnoDB, `utf8mb4_0900_ai_ci`, FK `answers` CASCADE, `chapters`/`questions` RESTRICT, UNIQUE, index).
- **Câu điền khuyết** chuyển thành trắc nghiệm A–D (D-026), nên `QuestionType` chỉ có `SINGLE_CHOICE`.
- **Thời gian UTC** (D-027): `Instant` + Hibernate tự điền; phiên MySQL đặt UTC qua `hikari.data-source-properties`.
- **Code:** `entity/` (`BaseEntity`, `Subject`, `Chapter`, `Question` + `addAnswer()`, `Answer`, 2 enum), `repository/` (3 repository, `@EntityGraph` tránh N+1), `exception/` (`GlobalExceptionHandler`, `ResourceNotFoundException`), `dto/InvalidField`, `messages.properties` (thông điệp lỗi tiếng Việt), profile `dev` (log SQL).
- **Kiểm tra:** 27/27 test (`mvnw.cmd clean verify`); chạy `dev` thật: Flyway tạo bảng, lỗi 404/405 trả tiếng Việt. Agent `java-reviewer` chấp thuận; 5 góp ý đã sửa.
- Ghi chú: test thứ tự phương án vẫn đạt khi bỏ `@OrderBy` (MySQL đọc qua index UNIQUE `(question_id, display_order)`); vẫn giữ `@OrderBy` để không phụ thuộc cách MySQL chọn index.

### Phase 3: ✅ xong, chủ dự án đã duyệt (2026-09-30)
- **Thiết kế** (D-028): hướng "bàn học yên tĩnh"; token màu trong `frontend/src/index.css`, component dùng class ngữ nghĩa; logo huy hiệu "Q" (`LetterBadge`).
- **Component:** `Button`, `ButtonLink`, `Card`, `AsyncContent`, `LoadingState`, `ErrorState`, `EmptyState`, `LetterBadge`.
- **Khung trang:** `MainLayout` (header + điều hướng từ `layouts/navigation.ts`, link "Bỏ qua điều hướng", footer). Chưa có menu thu gọn (khi có từ 3 mục).
- **Route:** `routes.tsx` (`pageRoutes` + `createAppRoutes()`), trang 404, trang lỗi (giữ header khi một trang lỗi).
- **Dữ liệu:** `useAsync` (suy ra trạng thái khi render, bỏ kết quả cũ, huỷ request khi rời trang); `apiClient` luôn ném `ApiError` với thông điệp tiếng Việt.
- **Kiểm tra:** 40/40 test, lint sạch, build đạt; chụp màn hình Chrome headless ở 360 / 768 / 1280px, không tràn ngang. Agent `typescript-reviewer`: không có lỗi nghiêm trọng, 6 góp ý đã sửa.

### Phase 4A (GDQP): ✅ xong, chủ dự án đã duyệt (2026-10-01)
- **Trích xuất** (D-029, D-030): `scripts/extract_gdqp.py` + `database/seed/gdqp/subject.json` → `generated/import.json` + `review.md` (không commit). 11 bài, **230 câu**, 9 câu không xáo trộn. Đáp án theo chữ đỏ (chỉ tính chữ và số của nội dung phương án); G2 theo quyết định; tên Bài 2 sửa thành "Mác-Lênin" (D-032).
- **Kiểm chứng:** script tự kiểm tra (ghép lại toàn bộ dữ liệu phải bằng đúng mọi ký tự của PDF, số câu từng bài, đủ A–D, đúng 1 đáp án); đối chiếu ảnh 9 trang (~50 câu) khớp 100%; so từng câu DB với JSON khớp hoàn toàn.
- **Import:** `scripts/import-subject.ps1 -Slug gdqp [-Replace]` → `command/ImportCommandRunner` → `service/SubjectImportService` (kiểm tra toàn bộ, ghi một transaction). Định dạng: `database-design.md` §7.
- **API:** `GET /api/v1/subjects`, `GET /api/v1/subjects/{slug}` (truy vấn gộp, chỉ môn publish, chỉ đếm câu PUBLISHED, không trả đáp án).
- **Frontend:** trang chủ = danh sách môn; `/subjects/:slug` = chi tiết môn + các bài; môn không có → trang "Không tìm thấy môn học".
- **Kiểm tra:** backend 46/46, frontend 44/44 + lint + build; chụp màn hình 360 / 768 / 1280px; agent `code-reviewer` (không có lỗi nghiêm trọng, góp ý đã sửa).

### Phase 4B (Python): lập kế hoạch
Chưa bắt đầu. Kế hoạch riêng sẽ được trình chủ dự án duyệt (xác định đáp án bằng cách chạy code theo D-020, tạo phương án cho câu điền khuyết theo D-026, các điểm P5–P14).

### Điểm kỹ thuật đã phát hiện
- ID `4.1.1.RELEASE` trong metadata của Spring Initializr **không phải** phiên bản Maven. Trên Maven Central là `4.1.1`; `pom.xml` đã được sửa.
- Flyway 12.4 bản Community hỗ trợ MySQL từ 8.0, nên MySQL 8.0.46 dùng được.
- Vitest 5: cấu hình qua `defineConfig` của `vitest/config`; jest-dom import `@testing-library/jest-dom/vitest`; không bật globals nên `setupTests.ts` tự gọi `cleanup()`.
- React Router 8: `createBrowserRouter` lấy từ `react-router`, `RouterProvider` lấy từ `react-router/dom`.
- `node_modules/` và `backend/target/` không được copy khi chuyển máy. Chạy `npm install` và `mvnw.cmd -DskipTests package` để tạo lại.
- Vitest 5 yêu cầu Node `^22.12 || ^24 || >=26` (chặt hơn Vite 8). Trên máy 2 (Node 24.20): test, lint, build frontend đều đạt.
- Máy 2: `JAVA_HOME` (cấp User) = `C:\Program Files\Java\jdk-25.0.4` (D-024).
- Cảnh báo "Mockito is currently self-attaching…" của JDK 21+ đã xử lý bằng cách nạp Mockito làm Java agent trong `maven-surefire-plugin`, kèm `-Xshare:off` (D-025).
- Spring Boot 4 đổi package của annotation test JPA: `DataJpaTest` ở `org.springframework.boot.data.jpa.test.autoconfigure`, `AutoConfigureTestDatabase` ở `org.springframework.boot.jdbc.test.autoconfigure`, `TestEntityManager` ở `org.springframework.boot.jpa.test.autoconfigure`. `@DataJpaTest` cần `@AutoConfigureTestDatabase(replace = NONE)` để dùng MySQL thật thay vì database nhúng.
- Khoá của Map trong YAML (`spring.jpa.properties`, `hikari.data-source-properties`) có ký tự đặc biệt như `_` thì viết trong ngoặc vuông, ví dụ `"[hibernate.jdbc.time_zone]"`.
- Controller giả lồng trong class test không được component scan tự nhận (Spring Boot loại trừ class lồng trong test). Cần `@WebMvcTest(controllers = X.class)` + `@Import(X.class)`.
- Kiểm tra giao diện không cần Playwright: chạy Chrome `--headless=new --remote-debugging-port=…` và điều khiển qua Chrome DevTools Protocol bằng `WebSocket` có sẵn của Node 24 (đặt kích thước màn hình, mở trang, đo `scrollWidth`, chụp ảnh). Script tạm của phiên 2 nằm ngoài repo.
- Hibernate 7: JPQL `select new <record>(…)` dùng được cả subquery trong danh sách tham số; record nên dùng kiểu bọc (`Long`, `Integer`) cho kết quả `count`.
- Test `@SpringBootTest @Transactional` không commit: phải `entityManager.flush()` trước `clear()` thì mới đọc lại được thay đổi (thay đổi chưa flush bị bỏ khi clear).
- Xoá hàng loạt bằng JPQL (`@Modifying(clearAutomatically = true)`) bỏ qua cascade của JPA; phương án được xoá nhờ `ON DELETE CASCADE` trong database. Sau lệnh xoá phải đọc lại entity cần sửa.
- Chạy backend kiểm tra mà cổng 8080 đang bận (chủ dự án tự chạy): dùng `--server.port=8081` và một cấu hình Vite tạm ngoài repo (cổng 5174, proxy sang 8081), không tắt tiến trình của chủ dự án.
- VS Code trên máy 2 tự tạo `.github/modernize/` (có `.gitignore` bỏ qua toàn bộ) và `.vscode/settings.json` (đã bị `.gitignore` bỏ qua). Không thuộc dự án, không commit.

## Trạng thái

| Phase | Tên | Trạng thái |
|---|---|---|
| 0 | Khởi tạo: khảo sát, tài liệu, skill, cấu trúc thư mục | ✅ Xong, đã duyệt |
| 1 | Project setup | ✅ Xong, đã duyệt |
| 2 | Database + Backend foundation | ✅ Xong, đã duyệt |
| 3 | Frontend foundation | ✅ Xong, đã duyệt |
| 4 | Subject / Chapter / Question / Answer | 🔄 4A (GDQP) xong; 4B (Python) đang lập kế hoạch |
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
