# Kế hoạch phát triển

> Nguyên tắc: làm **từng phase một**. Hết mỗi phase phải build/test đạt và **bạn xác nhận** rồi mới sang phase sau.
> Phase lớn được lập kế hoạch chi tiết (plan) và trình bạn duyệt trước khi code.

## Tiến độ hiện tại

> Cập nhật: 2026-10-06 (trên **máy 2**: Windows 11, xem [architecture.md §10](architecture.md#10-môi-trường-phát-triển)).
> **Phase 6 đã xong và được duyệt** (2026-10-01), kèm phím tắt khi làm bài (Enter kiểm tra, ← → chuyển câu). Theo D-039, **làm Phase 10 (PWA / mobile) trước Phase 7–9**: kế hoạch đã duyệt cả 5 đề xuất (D-040, D-041); tiến độ ở mục "Tiến độ 10". **Phase 10 đã làm xong cả 4 bước, chờ chủ dự án duyệt** (2026-10-03). Sau khi duyệt: quay lại Phase 7–9 theo D-039.
> **2026-10-02:** thêm Bài 11 NumPy cho môn Python (D-042). Theo yêu cầu chủ dự án (D-043), Claude tự sửa các câu lỗi đề cho đúng (có ghi vết, người học thấy "Đã sửa so với tài liệu"). Xem mục Phase 4B.
> **2026-10-06 (theo yêu cầu chủ dự án):** chế độ **"Học"** (nút cạnh "Luyện tập", xem câu hỏi kèm đáp án đúng tô xanh) và bỏ vuốt chuyển câu (D-044); thêm Bài 12 Matplotlib, Bài 13 Pandas (D-045): môn Python 13 bài, 428 câu, cả 428 `PUBLISHED`; phương án câu điền khuyết bỏ ngoặc vuông bọc ngoài, nhiều chỗ trống thì đánh số (D-046). Đã đẩy lên GitHub theo yêu cầu.

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

### Phase 4B (Python): kế hoạch chi tiết (✅ đã duyệt 2026-10-01)

Khó hơn GDQP: 19 file slide 2 cột, phương án xếp dạng lưới (theo cột dọc), code nhiều dòng, câu điền khuyết nhiều chỗ trống, có câu lỗi đề (ví dụ w02.2 HW câu 5: đề nói "in 1, 2, 3" nhưng code in "Yes"/"No"). Không trích xuất tự động hoàn toàn được; làm **bán tự động**.

**Cách làm đề xuất: "bản đồ vị trí"**
- Script đọc PDF và đánh số mọi dòng chữ của các trang "TRẮC NGHIỆM" (theo cột, giữ toạ độ để tính thụt lề code).
- Claude xem ảnh từng trang và ghi vào file quyết định (commit) **vị trí** của đề / code / phương án (tham chiếu tới dòng), **không gõ lại nội dung**. Script dựng lại nội dung từ PDF theo vị trí đó, nên nội dung luôn đúng nguyên văn và không nằm trong Git (giữ D-030).
- File quyết định cũng chứa: đáp án đúng, lý do, cách kiểm chứng, và phương án A–D do Claude tạo cho câu điền khuyết (D-026).

**Xác định đáp án (D-020)**
- Câu có code: `scripts/verify_python_answers.py` **chạy thật** code bằng Python 3 (tiến trình riêng, thư mục tạm, giới hạn thời gian), so kết quả với phương án đúng đã ghi. Câu điền khuyết: chạy code với từng phương án; phương án đúng cho kết quả đúng yêu cầu, 3 phương án sai phải cho kết quả khác hoặc lỗi. Chạy lại được bất cứ lúc nào.
- Câu lý thuyết: đối chiếu tài liệu chính thức docs.python.org, ghi lý do và link.
- Câu lỗi đề / mơ hồ / kết quả phụ thuộc phiên bản Python: `NEEDS_REVIEW` + lý do, không vào bài làm, liệt kê cho chủ dự án.

**Các bước**
1. `scripts/extract_python_pages.py`: tìm trang trắc nghiệm của 19 file, đánh số dòng, xuất ảnh + text từng trang (vào `generated/`).
2. Làm lần lượt theo từng bài (10 bài): Claude lập bản đồ vị trí + đáp án + lý do → chạy kiểm chứng → cập nhật tiến độ ở đây (phiên sau làm tiếp được).
3. `scripts/build_python_import.py`: dựng `import.json` + `review.md`; tự kiểm tra (nội dung có nguyên văn trong trang PDF, đủ phương án, câu `PUBLISHED` đúng 1 đáp án, mọi câu trắc nghiệm của trang đều được xử lý hoặc có lý do bỏ qua).
4. Import (`scripts/import-subject.ps1 -Slug python`), so DB với JSON, xem trên web.
5. Chủ dự án duyệt `review.md` (đặc biệt danh sách `NEEDS_REVIEW`). Agent rà code. Tài liệu. Báo cáo, dừng chờ xác nhận.

**Tiến độ 4B** (cập nhật sau mỗi bài; phiên sau làm tiếp từ bài chưa xong)
- [x] Bước 1: `scripts/python_source.py` (đánh số dòng, chung cho các script), `scripts/extract_python_pages.py`. 19 file: số dòng bắt đầu bằng số câu khớp khảo sát ở mọi file; w01 LT có 8 dòng vì trang 8 và 9 là cùng 4 câu. Tổng 302 dòng = 298 câu + 4 câu trùng.
  - Chia cột ở 42% chiều rộng trang (không phải 50%): có slide cột phải bắt đầu ở x ≈ 468.
- [x] Công cụ: `scripts/build_python_import.py` (dựng nội dung theo bản đồ, kiểm tra phủ hết mọi dòng của trang trắc nghiệm), `scripts/verify_python_answers.py` (chạy code thật; kiểu run / runOptions / fill / docs / reasoning). Đã thử cố ý đổi đáp án và thêm phương án cũng đúng: đều bị phát hiện.
  - Tiến trình con chạy với `-I -X utf8`: `-I` bỏ qua `PYTHONIOENCODING`, nên phải bật UTF-8 bằng `-X utf8`.
- [x] Bước 2: bản đồ vị trí từng bài (`database/seed/python/questions/bai-NN.json`). Cách làm mỗi bài: xem `generated/pages/<nguồn>/pNN.txt` + `.png` → viết bản đồ → `build_python_import.py --allow-incomplete` → `verify_python_answers.py` → xem `generated/review.md`.
  - Lớp text PDF mất dấu cách sau chữ có dấu tiếng Việt ("thểđược"): `python_source.line_text` thêm lại khi khoảng trống > 0,15 cỡ chữ (đã kiểm tra 272 chỗ trên 19 file, đều đúng).
  - [x] Bài 1 (4 câu PUBLISHED; trang 8 là 4 câu trùng)
  - [x] Bài 2 (40 dòng câu: 3 câu trùng; 31 PUBLISHED, 6 NEEDS_REVIEW)
  - [x] Bài 3 (20 câu: 17 PUBLISHED, 3 NEEDS_REVIEW)
  - [x] Bài 4 (20 câu: 17 PUBLISHED, 3 NEEDS_REVIEW)
  - [x] Bài 5 (41 câu: 39 PUBLISHED, 2 NEEDS_REVIEW)
  - [x] Bài 6 (49 câu: 39 PUBLISHED, 10 NEEDS_REVIEW)
  - [x] Bài 7 (56 câu: 48 PUBLISHED, 8 NEEDS_REVIEW; trang 12 bỏ số "50" đứng lẻ, P9)
  - [x] Bài 8 (38 câu: 30 PUBLISHED, 8 NEEDS_REVIEW)
  - [x] Bài 9 (14 câu: 13 PUBLISHED, 1 NEEDS_REVIEW)
  - [x] Bài 10 (16 câu: 15 PUBLISHED, 1 NEEDS_REVIEW)
  - Câu có **code của đề** không chạy được nguyên văn vì ký tự in ấn ("–" thay dấu trừ, nháy cong, lệnh không thụt lề) → `NEEDS_REVIEW` nhóm `reviewGroup: "typography"`, vẫn ghi đáp án đề xuất + kiểm chứng sau khi sửa ký tự, để chủ dự án duyệt cả nhóm một lần. Ký tự in ấn chỉ nằm trong phương án sai thì không ảnh hưởng.
  - Nháy cong: nằm trong code chạy thử, hoặc trong phương án/mục mà đề hỏi "có hợp lệ / có gây lỗi không" → nhóm `typography`. Nháy cong chỉ để ghi giá trị trong lời đề (ví dụ `f( ‘5.0’)`, `Chuỗi “1234…”`) hoặc trong phương án là kết quả in ra → đọc theo nghĩa thông thường, không cần duyệt.
  - "Vị trí / phần tử thứ n" hiểu là đếm từ 1. Câu điền khuyết loại này không đưa phương án của cách hiểu đếm từ 0 vào, để chỉ có một đáp án.
- [x] Bước 3: `build_python_import.py` ghi `import.json`: **295 câu** (253 `PUBLISHED`, 42 `NEEDS_REVIEW`), 7 câu trùng bỏ qua. `verify_python_answers.py`: 289 câu đạt (252 câu chạy code thật, trong đó 206 câu chữ cái đáp án được đối chiếu tự động với kết quả chạy; 46 câu còn lại là câu phát biểu lý thuyết, code chỉ minh hoạ); 6 câu không kiểm chứng đều là `NEEDS_REVIEW` chưa xác định được đáp án.
  - Agent `code-reviewer`: không thấy chỗ nào làm đổi chữ của câu hỏi. Đã sửa: đối chiếu chữ cái đáp án với kết quả chạy (trước đó kiểu `run` chỉ so với `expect`; đã thử cố ý ghi sai 5 câu, đều bị bắt), `errorLine` chạy với `__name__ = "__main__"` và lấy số dòng trong code của đề, lỗi cấu trúc của một mục verify chỉ báo ở câu đó, `softWrap` ở hàng cuối báo lỗi. Không sửa: nhãn phương án cho phép không có dấu cách sau dấu chấm vì tài liệu có "E.5".
  - Công cụ bổ sung khi làm Bài 6–10: `errorLine` (câu "lỗi ở dòng thứ mấy": bỏ số dòng "(1)", "(2)" rồi lấy dòng gây lỗi), `intoBlanks` nhận chuỗi phân cách (phương án "int, 1" điền 2 chỗ trống), `spaceBefore` và `softWrap` trong bản đồ (chỉnh layout, chỉ đổi khoảng trắng), mục "1) … 2) …" trong đề giữ trên từng dòng, khung chữ cùng hàng trong code đặt theo cột tính từ toạ độ x.
- [x] Bước 4: import vào database dev (10 bài, 295 câu, 1198 phương án); so từng câu, phương án, đáp án, nguồn trong database với `import.json`: khớp hoàn toàn. API và trang `/subjects/python` hiển thị 10 bài · 253 câu (chỉ đếm câu `PUBLISHED`), không tràn ngang ở 390 / 1280px.
- [x] Bước 5: chủ dự án duyệt (D-036): 8 câu lỗi in ấn và 1 câu hỏi mở chuyển sang `PUBLISHED`; 33 câu còn lại giữ `NEEDS_REVIEW`. Build, kiểm chứng (289 câu đạt), import lại với `-Replace`, so database với JSON: khớp hoàn toàn. Trang chủ qua `localhost:5173` hiện GDQP 230 câu, Python 262 câu.
- [x] Bổ sung 2026-10-02 (D-042): **Bài 11 NumPy** (`bai-11.json`, nguồn `w1011-lt` trang 23–26, `w1011-hw` trang 2–6): 65 câu, 50 `PUBLISHED`, 15 `NEEDS_REVIEW` (2 lỗi in ấn, 7 nhiều phương án đúng, 6 lỗi đề / không có đáp án đúng). Cài NumPy 2.5.3 vào `scripts/.venv`. Kiểm chứng cả môn: 354 câu đạt (315 câu chạy code thật); thử ghi sai 5 câu NumPy đều bị bắt. Import lại (`-Replace`): 11 bài, 360 câu, 1451 phương án, khớp JSON; thêm đề luyện tập mặc định cho Bài 11.
- [x] Bổ sung 2026-10-02 (D-043): Claude tự sửa câu lỗi thay vì để chờ duyệt. Mục `edits` trong bản đồ (sửa đề / code / phương án, `note` bắt buộc, ghi vào `explanation`). Sửa 48 câu `NEEDS_REVIEW` và 11 câu còn lỗi hiển thị (58 câu có sửa, 1 câu chỉ chọn đáp án). Import cho phép sửa ký tự in ấn của phương án ở câu đã có người làm (thêm test). Kết quả: 360 câu `PUBLISHED`, kiểm chứng 360/360 (320 câu chạy code thật), database khớp JSON.
- [x] Bổ sung 2026-10-06 (D-045): **Bài 12 Matplotlib** (`bai-12.json`, `w1213-lt` trang 32, `w1213-hw` trang 3–5): 29 câu; **Bài 13 Pandas** (`bai-13.json`, `w14-lt` trang 30–31, `w14-hw` trang 3–5): 39 câu (13 điền khuyết). Sửa 23 câu theo D-043. Cài matplotlib 3.11.2, pandas 3.0.6 vào `scripts/.venv`; kiểm chứng chạy matplotlib ở chế độ Agg với bộ đệm font chung. Cả môn: 428 câu `PUBLISHED`, kiểm chứng 428/428 (379 câu chạy code thật); import lại khớp JSON (13 bài, 1719 phương án).

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
| 4 | Subject / Chapter / Question / Answer | ✅ Xong, đã duyệt (4A GDQP, 4B Python) |
| 5 | Quiz engine | ✅ Xong, đã duyệt |
| 6 | Result / history | ✅ Xong, đã duyệt (kèm phím tắt khi làm bài) |
| 7 | Authentication | Làm sau Phase 10 (D-039) |
| 8 | Admin management | Làm sau Phase 10 (D-039) |
| 9 | Ranking / statistics | Làm sau Phase 10 (D-039) |
| 10 | PWA / mobile experience | 🔄 Đang làm |

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

## Phase 5: Quiz engine (✅ xong, đã duyệt 2026-10-01)

**Mục tiêu:** luyện tập theo bài (biết ngay đúng/sai từng câu, không chấm điểm) và thi thử cả môn (nộp bài, chấm thang 10). Áp dụng D-037: khách được làm bài.

**Đề xuất (đã duyệt cả 5)**
1. **Đề mặc định** (tạo khi import, chung cho mọi môn, không có code riêng môn nào): mỗi bài một đề *Luyện tập* 20 câu, không giới hạn thời gian; mỗi môn một đề *Thi thử* 40 câu, 45 phút. Bài có ít câu hơn thì lấy hết. Các con số đặt trong `application.yml`, đổi được.
2. **Import khi đã có bài làm** (thay cho `-Replace` xoá hết như hiện nay): khớp câu cũ với câu mới theo nguồn (file + nhãn, ví dụ "w05 HW tr.4 – Câu 15"); câu có trong file thì cập nhật tại chỗ, câu mới thì thêm, câu không còn trong file thì xoá nếu chưa ai làm, còn nếu đã có người làm thì chuyển `ARCHIVED` (đúng quy tắc trong `.claude/rules/database.md`). Nhờ vậy sau này duyệt 33 câu `NEEDS_REVIEW` rồi import lại vẫn an toàn.
3. **Mã lượt làm là chuỗi ngẫu nhiên (UUID)**, không phải số 1, 2, 3: khách không có tài khoản, nên nếu dùng số thì đổi số trên URL là xem/sửa được bài của người khác.
4. **Xem lại từng câu sau khi nộp** (đã chọn gì, đáp án đúng) để Phase 6 như kế hoạch. Phase 5: thi thử nộp xong hiện điểm, số câu đúng, nút "Làm lại"; luyện tập làm hết câu thì hiện "Luyện tiếp" (lượt mới) và "Chọn bài khác", không có điểm.
5. **Không thêm dependency.** Chưa cài Playwright; kiểm tra giao diện bằng test React Testing Library và chụp màn hình Chrome như các phase trước.

**Database** (migration `V2__create_quiz_tables.sql`, theo [database-design.md](database-design.md) §4.6–4.8)
- `quizzes`, `quiz_results`, `user_answers` như thiết kế. Thêm vào `quiz_results`: `public_id` (UUID, UNIQUE, dùng trên URL) và `expires_at` (hạn nộp của đề có giới hạn thời gian, chụp lúc bắt đầu).
- `quiz_results.user_id` chưa có khoá ngoại vì bảng `users` có ở Phase 7; Phase 7 thêm khoá ngoại bằng migration mới.

**Quy tắc làm bài**
- Bắt đầu: rút ngẫu nhiên tối đa N câu `PUBLISHED` khác nhau trong phạm vi đề (một bài hoặc cả môn); thứ tự câu chụp vào `user_answers` (`question_order`). Thứ tự phương án xáo theo từng lượt làm nhưng cố định khi tải lại trang; câu `shuffle_answers = FALSE` giữ nguyên thứ tự.
- Không API nào trả đáp án đúng trước khi được phép: thi thử chỉ sau khi nộp; luyện tập chỉ cho câu vừa trả lời (câu đó bị khoá).
- Luyện tập không có nộp bài, không có điểm (`score`, `submitted_at` để NULL); đúng/sai của từng câu được ghi ngay khi trả lời.
- Thi thử có hạn giờ: server từ chối lưu sau hạn; lượt quá hạn được chấm với các câu đã lưu, trạng thái `EXPIRED`. Frontend tự nộp khi đồng hồ về 0.
- Lượt đã nộp thì không sửa được (409 kèm thông báo tiếng Việt).

**API** (thay bảng dự kiến ở [architecture.md](architecture.md) §5)

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/api/v1/subjects/{slug}/quizzes` | Các đề của môn (tên, chế độ, số câu thực tế, thời gian, bài) |
| POST | `/api/v1/quizzes/{quizId}/attempts` | Bắt đầu lượt làm → 201 + câu hỏi và phương án, **không** kèm đáp án đúng |
| GET | `/api/v1/attempts/{attemptId}` | Mở lại lượt làm (tải lại trang không mất bài) |
| PUT | `/api/v1/attempts/{attemptId}/answers/{questionId}` | Lưu lựa chọn. Luyện tập: trả đúng/sai + đáp án đúng của câu đó |
| POST | `/api/v1/attempts/{attemptId}/submit` | Nộp bài thi thử; server chấm → điểm, số câu đúng (luyện tập → 409) |

**Frontend**
- Trang môn (`/subjects/:slug`): nút "Luyện tập" ở từng bài, thẻ "Thi thử cả môn". Bấm → tạo lượt làm → chuyển tới `/attempts/:attemptId`.
- Trang làm bài: mobile một câu một màn hình, nút Câu trước / Câu sau, lưới số câu (đã làm / chưa làm / đang xem; luyện tập có thêm đúng / sai); code giữ thụt lề, cuộn ngang khi dài; đề và phương án giữ xuống dòng; phương án là nút chọn to, dùng được bằng bàn phím; đúng/sai hiện bằng chữ và biểu tượng, không chỉ bằng màu. Thi thử có đồng hồ đếm ngược và hộp xác nhận nộp bài (báo số câu chưa làm).
- Thi thử nộp xong: điểm /10, số câu đúng, "Làm lại" (lượt mới), "Về trang môn". Luyện tập làm hết câu: "Luyện tiếp", "Chọn bài khác".

**File dự kiến**
- Backend: `db/migration/V2__create_quiz_tables.sql`; `entity/` Quiz, QuizMode, QuizResult, QuizResultStatus, UserAnswer; `repository/` QuizRepository, QuizResultRepository, UserAnswerRepository; `service/` QuizService, AttemptService, QuestionDrawer (rút câu), AnswerShuffler (xáo phương án cố định theo lượt), ScoreCalculator, DefaultQuizService (đề mặc định); `controller/` QuizController, AttemptController; `dto/` các record request/response; `exception/` AttemptStateException (→ 409); `config/QuizDefaultsProperties`. Sửa: `SubjectImportService` (import cập nhật theo nguồn), `QuestionRepository`, `messages.properties`, `application.yml`.
- Frontend: `types/quiz.ts`; `services/quizService.ts`; `hooks/useQuizAttempt.ts`; `pages/AttemptPage.tsx`; `components/` QuestionView, CodeBlock, AnswerOption, QuestionNavigator, CountdownTimer, SubmitDialog, AttemptSummary; sửa `pages/SubjectPage.tsx`, `routes.tsx`.
- Tài liệu: `database-design.md`, `architecture.md`, `decisions.md`, `scripts/README.md` (quy tắc import mới).

**Kiểm tra**
- Backend: rút câu đủ số, không trùng, chỉ câu `PUBLISHED`; xáo phương án cố định khi tải lại và giữ nguyên khi `shuffle_answers = FALSE`; JSON của bắt đầu / mở lại lượt làm **không có** trường đáp án đúng; luyện tập khoá câu đã kiểm tra; thi thử từ chối sau hạn, sau khi nộp; chấm điểm (đúng hết, sai hết, bỏ trống, làm tròn); import cập nhật giữ id phương án và chuyển `ARCHIVED` câu đã có người làm.
- Frontend: test cho trang làm bài (chọn, chuyển câu, phản hồi luyện tập, nộp, hết giờ) với service giả; lint, build.
- Chạy thật cả hai môn: làm một đề luyện tập và một đề thi thử; chụp màn hình 360 / 768 / 1280px.
- Agent `java-reviewer` và `typescript-reviewer` rà trước khi báo hoàn thành.

**Thứ tự làm** (mỗi bước build/test đạt mới sang bước sau; cập nhật tiến độ ở đây)
1. Migration + entity + repository (+ test).
2. Import cập nhật theo nguồn + đề mặc định; import lại GDQP và Python.
3. Service + API làm bài (+ test).
4. Frontend: trang môn có nút làm bài, trang làm bài, màn hình điểm (+ test).
5. Chạy thật, chụp màn hình, agent rà code, tài liệu, báo cáo, dừng chờ xác nhận.

**Tiến độ 5** (cập nhật sau mỗi bước; phiên sau làm tiếp từ bước chưa xong)
- [x] Bước 1: migration `V2__create_quiz_tables.sql` (kèm CHECK số câu > 0, thời gian > 0); entity `Quiz`, `QuizMode`, `QuizResult`, `QuizResultStatus`, `UserAnswer`; repository `QuizRepository`, `QuizResultRepository` (khoá dòng khi ghi), `UserAnswerRepository`, thêm truy vấn id câu theo chương/môn và nạp phương án theo lô ở `QuestionRepository`. Test repository: 21/21 đạt.
- [x] Bước 2: import cập nhật theo nguồn (`SubjectContentUpdater`, nguồn câu bắt buộc và không trùng), đề mặc định (`DefaultQuizService`, `QuizDefaultsProperties`: 20 câu luyện tập; thi thử 40 câu, 45 phút). Test import 15/15. Import lại vào database dev: migration V2 chạy; GDQP và Python cập nhật tại chỗ (0 câu bị bỏ); 23 đề mặc định (GDQP 11 + 1, Python 10 + 1); Python vẫn khớp JSON.
- [x] Bước 3: `QuizService`, `AttemptService` (khoá dòng khi ghi; thi thử quá hạn được chấm khi có yêu cầu tiếp theo, cho trễ 10 giây; lưu sau hạn vẫn giữ kết quả chấm nhờ `noRollbackFor`), `QuestionDrawer`, `AnswerShuffler` (xáo cố định theo lượt + câu, không lưu thứ tự), `ScoreCalculator`, `AttemptMapper`, `QuizController`, `AttemptController`, `BusinessRuleException` (409), `InvalidRequestException` (400), `ClockConfig`. Test: 40 test mới (gồm kiểm tra JSON không chứa đáp án đúng); `mvnw verify` 102/102. Gọi thử API trên database dev với môn Python: đạt (lượt làm thử tạo trong lúc kiểm tra vẫn nằm trong database dev).
- [x] Bước 4: `apiPost`/`apiPut`; `types/quiz.ts`; `services/quizService.ts`; hook `useStartAttempt`, `useQuizAttempt` (lưu lần lượt theo hàng đợi, lưu lỗi thì trả lại lựa chọn cũ rồi đọc lại từ server); component `CodeBlock`, `QuestionView` (luyện tập: chọn rồi bấm "Kiểm tra"), `QuestionNavigator`, `CountdownTimer` (đếm từ số giây server trả về), `SubmitConfirm`, `AttemptOutcome`; trang `AttemptPage` (`/attempts/:attemptId`); trang môn có thẻ thi thử và nút luyện tập từng bài. Test 62/62 (helper `test/mockApi.ts`), lint sạch, build đạt. Chạy thật với môn Python: trang môn, luyện tập, thi thử ở 390 / 768 / 1280px không tràn ngang.
- [x] Bước 5: agent `java-reviewer` (không rò rỉ đáp án, không N+1) và `typescript-reviewer`; đã sửa: import không cho đổi nội dung phương án của câu đã có người làm (chỉ cho đổi đáp án đúng), mở lại lượt làm chỉ khoá dòng khi phải chấm bài quá hạn, nộp lại trả kết quả đã có, bài hết giờ ghi thời điểm kết thúc là hạn nộp, phản hồi luyện tập tính theo đáp án hiện tại; frontend chờ các lần lưu xong trước khi đọc lại, theo dõi nhiều câu đang kiểm tra, chặn nộp hai lần, chuyển focus tới kết quả. Backend 106/106, frontend 63/63 (chạy 3 lần, không chập chờn), lint, build đạt. Chạy thật cả hai môn, chụp màn hình 390 / 768 / 1280px.
  - Để lại (đã ghi vào Phase 7): khách tạo lượt làm không giới hạn (cần giới hạn tần suất). Import trùng lúc có người vừa bắt đầu lượt làm có thể lỗi 500 (hiếm, chỉ khi đang import).
  - Lượt làm thử tạo trong lúc kiểm tra vẫn nằm trong database dev (không ảnh hưởng gì).

## Phase 6: Result / history (✅ xong, đã duyệt 2026-10-01)

**Mục tiêu:** nộp bài thi thử xong thì xem lại được từng câu (đã chọn gì, đáp án đúng, câu bỏ trống); tìm lại được các lượt làm cũ trên máy đang dùng. Lịch sử theo tài khoản để sau Phase 7 (D-038).

**Đề xuất cần duyệt**
1. **Xem lại ngay trên trang làm bài**, không thêm trang và API riêng: bài thi thử đã nộp / hết giờ thì `GET /api/v1/attempts/{id}` trả thêm đúng/sai và đáp án đúng cho **mọi** câu, kể cả câu bỏ trống. Bỏ endpoint dự kiến `/attempts/{id}/result`. Lý do: một nguồn dữ liệu, ít code; giao diện đã có sẵn cách hiện đúng/sai của chế độ luyện tập.
2. **Thẻ kết quả rõ hơn**: điểm, "Đúng X · Sai Y · Bỏ trống Z", nút "Xem câu sai tiếp theo" (nhảy lần lượt qua các câu sai và bỏ trống). Lưới số câu tô ✓ / ✗ / bỏ trống.
3. **"Lượt làm gần đây" trên máy này** (không cần đăng nhập): trang chủ liệt kê tối đa 10 lượt gần nhất (tên đề, môn, ngày, trạng thái: đang làm / điểm / luyện tập), bấm để mở lại, có nút xoá danh sách. Chỉ lưu mã lượt làm và vài thông tin hiển thị trong `localStorage` của trình duyệt (không gửi đi đâu). Giúp khách quay lại bài thi đang dở hoặc xem lại bài cũ. Sau Phase 7 có thêm lịch sử theo tài khoản.
4. **Không thêm dependency.**

**Backend**
- `AttemptMapper`: phần phản hồi (`feedback`) có cả ở thi thử đã kết thúc. Đổi tên `PracticeFeedbackResponse` → `AnswerFeedbackResponse` cho đúng nghĩa.
- `ExamResultResponse` thêm `unansweredCount` (số câu sai = tổng − đúng − bỏ trống).
- Test: thi thử đang làm không có đáp án đúng (đã có); đã nộp / hết giờ thì mọi câu có đáp án đúng, câu bỏ trống tính sai; JSON qua HTTP đúng như vậy.

**Frontend**
- `QuestionView`: thi thử đã kết thúc thì hiện kết quả từng câu như luyện tập; câu bỏ trống: "Bạn bỏ trống câu này. Đáp án đúng là C."
- `QuestionNavigator`: thêm trạng thái "bỏ trống" sau khi nộp. `ExamOutcome`: số câu sai / bỏ trống, nút "Xem câu sai tiếp theo".
- `services/recentAttempts.ts` (đọc/ghi `localStorage`, không lỗi khi trình duyệt chặn lưu trữ), ghi khi bắt đầu, mở lại, nộp bài; `HomePage`: mục "Lượt làm gần đây".
- Test: xem lại sau khi nộp, nhảy qua câu sai, danh sách lượt làm gần đây (thêm, cập nhật điểm, giới hạn 10, xoá, lưu trữ bị chặn).

**Thứ tự làm**
1. Backend: dữ liệu xem lại + test.
2. Frontend: xem lại bài thi + test.
3. Lượt làm gần đây + test.
4. Chạy thật, chụp màn hình 360 / 768 / 1280px, agent rà code, tài liệu (`architecture.md` bỏ endpoint `/result`), báo cáo, dừng chờ xác nhận.

**Tiến độ 6** (cập nhật sau mỗi bước; phiên sau làm tiếp từ bước chưa xong)
- [x] Bước 1: `AnswerFeedbackResponse` (đổi tên từ `PracticeFeedbackResponse`) có ở mọi câu của thi thử đã kết thúc; `ExamResultResponse.unansweredCount`. Test mới: service và HTTP (trước khi nộp không có đáp án đúng, sau khi nộp có ở mọi câu kể cả câu bỏ trống). `mvnw verify` 108/108.
- [x] Bước 2: `QuestionView` hiện đúng/sai mọi câu khi có `feedback` (luyện tập đã kiểm tra, thi thử đã nộp), câu bỏ trống "– Bạn bỏ trống câu này"; `QuestionNavigator` có trạng thái "bỏ trống"; `ExamOutcome`: "Đúng · Sai · Bỏ trống", nút "Xem câu sai tiếp theo". Test 64/64, lint, type-check đạt.
- [x] Bước 3: `services/recentAttempts.ts` (tối đa 10 lượt, bỏ dữ liệu hỏng, không lỗi khi trình duyệt chặn lưu trữ), ghi trong `useQuizAttempt` mỗi khi lượt làm đổi; `components/RecentAttemptList.tsx` ở trang chủ, có "Xoá danh sách". `setupTests` xoá localStorage sau mỗi test. Test 72/72 (chạy 3 lần), type-check, lint, build đạt.
- [x] Bước 4: chạy thật (thi thử Python 40 câu: đúng 10, sai 15, bỏ trống 15, xem lại đủ 40 câu), chụp màn hình 360 / 1280px không tràn ngang. Agent `code-reviewer`: không rò rỉ đáp án, backend không có vấn đề; đã sửa 4 góp ý frontend (ngày hỏng trong localStorage làm trắng trang chủ, chữ trạng thái khi thiếu điểm, ẩn "Xem câu sai tiếp theo" khi không còn câu sai nào khác, tự bỏ lượt làm bị 404 khỏi danh sách) và mở lại bài đã nộp thì bắt đầu từ câu 1. Frontend 74/74 (chạy 3 lần), backend 108/108, lint, build đạt. `architecture.md` bỏ endpoint `/result`.

## Phase 7: Authentication

**Mục tiêu:** đăng ký, đăng nhập, phân quyền.

Công việc:
- Thêm Spring Security; bảng `users`; đăng ký/đăng nhập/đăng xuất; BCrypt.
- Vai trò `USER` / `ADMIN`; bảo vệ `/api/v1/admin/**`.
- Gắn lượt làm bài với người dùng; trang lịch sử làm bài theo tài khoản (D-038).
- Giới hạn tần suất tạo lượt làm của khách (`POST /api/v1/quizzes/{id}/attempts` đang mở, không giới hạn; góp ý khi rà code Phase 5).
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

## Phase 10: PWA / mobile experience (kế hoạch chi tiết, ✅ đã duyệt 2026-10-01; làm trước Phase 7–9 theo D-039)

**Mục tiêu:** dùng tốt trên điện thoại như một ứng dụng: cài lên màn hình chính, mở nhanh, thao tác chạm thuận tay; có E2E test cho luồng chính trên điện thoại.

**Đề xuất cần duyệt**
1. **PWA bằng `vite-plugin-pwa` 1.3** (devDependency, MIT, hỗ trợ Vite 8): tự tạo Web App Manifest và service worker (Workbox) lưu sẵn các file giao diện; có bản mới thì hiện "Có phiên bản mới · Tải lại". Phương án khác: tự viết service worker (không thêm thư viện nhưng phải tự đổi tên bộ nhớ đệm mỗi lần build, dễ sai, app có thể kẹt ở bản cũ).
2. **Offline chỉ cho "vỏ" ứng dụng**: mất mạng vẫn mở được app và thấy thông báo "Bạn đang offline"; **không làm bài offline**, vì muốn làm offline phải tải đáp án về máy, trái nguyên tắc chấm ở server (D-037). Không lưu đệm kết quả API (tránh dữ liệu cũ).
3. **Icon** tự tạo từ logo chữ "Q" đang dùng (SVG), xuất PNG 192 / 512 / maskable bằng Chrome headless đã có trên máy; không thêm công cụ.
4. **Thao tác trên điện thoại**:
   - Đồng hồ thi thử luôn hiện ở đầu màn hình khi cuộn (hiện cuộn xuống là mất đồng hồ).
   - **Vuốt trái / phải để chuyển câu** (tương đương phím ← → trên máy tính).
   - Rà vùng bấm (≥ 44px), cỡ chữ, khoảng an toàn tai thỏ / thanh điều hướng khi chạy như app (`safe-area-inset`).
5. **E2E bằng `@playwright/test` 1.63** (devDependency, Apache-2.0), dùng **Chrome đã cài** trên máy (không tải thêm trình duyệt ~150 MB). Chạy trên khung điện thoại (Pixel 7) và máy tính: trang chủ → môn → luyện tập (chọn, kiểm tra) → thi thử (chọn, nộp, xem lại) → lượt làm gần đây. Chạy với backend + database dev (dữ liệu GDQP / Python thật; lượt làm tạo ra là dữ liệu thử). Lệnh riêng `npm run test:e2e`, không gộp vào `npm run test` vì cần backend và MySQL đang chạy.

**File dự kiến**
- `frontend/vite.config.ts` (thêm VitePWA), `frontend/index.html` (theme-color, apple-touch-icon), `frontend/public/icons/*` + `frontend/public/favicon.svg`, `src/main.tsx` (đăng ký service worker).
- `src/components/` UpdatePrompt, OfflineBanner; `src/hooks/` useOnlineStatus, useSwipe; sửa `layouts/MainLayout.tsx`, `pages/AttemptPage.tsx`, `components/CountdownTimer.tsx`.
- `frontend/playwright.config.ts`, `frontend/e2e/*.spec.ts`, `package.json` (script `test:e2e`); `scripts/` script tạo icon (nếu cần).
- Tài liệu: `decisions.md` (D-040 PWA, D-041 Playwright), `architecture.md`, `README.md` (cách cài app, chạy E2E), CLAUDE.md (lệnh kiểm tra).

**Kiểm tra**
- Unit test: useOnlineStatus, useSwipe, OfflineBanner, UpdatePrompt, đồng hồ dính đầu màn hình.
- Build có `manifest.webmanifest` + `sw.js`; Chrome nhận là app cài được (kiểm tra qua DevTools Protocol); tắt mạng vẫn mở được app.
- E2E Playwright trên điện thoại và máy tính; `npm run build` / `test` / `lint`; agent rà code.

**Thứ tự làm**
1. Thao tác điện thoại (đồng hồ dính, vuốt, rà vùng bấm) + test.
2. PWA (manifest, icon, service worker, thông báo offline / bản mới) + kiểm tra cài được.
3. E2E Playwright.
4. Rà code, tài liệu, báo cáo, dừng chờ xác nhận.

**Tiến độ 10** (cập nhật sau mỗi bước; phiên sau làm tiếp từ bước chưa xong)
- [x] Bước 1: thanh đồng hồ + số câu đã làm dính đầu màn hình khi thi thử; `useSwipe` (vuốt trái = câu sau, phải = câu trước; bỏ qua vuốt ngắn / dọc / trong ô code), dòng gợi ý vuốt chỉ hiện trên màn hình cảm ứng; `useHotkey` gắn listener bằng `useLayoutEffect` (trước đó test phím tắt thỉnh thoảng hỏng vì listener gắn trễ). Vùng bấm đã ≥ 44px; không đặt `viewport-fit=cover` nên nội dung tự nằm trong vùng an toàn (tai thỏ). Test 81/81 (chạy 3 lần + file làm bài 10 lần), lint, build đạt; chụp thử cuộn trang ở 390px: đồng hồ vẫn hiện.
- [x] Bước 2: `vite-plugin-pwa` 1.3.0 (thêm 309 gói chỉ dùng lúc build, 0 lỗ hổng; npm cảnh báo `glob@11` cũ do `workbox-build` kéo theo). Manifest tiếng Việt, service worker lưu sẵn 15 file giao diện, không lưu đệm `/api`; icon 192 / 512 / maskable / apple-touch tạo bằng `scripts/generate-pwa-icons.ps1` (Chrome chụp ở 512px rồi thu nhỏ: Chrome có độ rộng cửa sổ tối thiểu nên chụp nhỏ bị cắt). `OfflineBanner` (+ `useOnlineStatus`), `UpdatePrompt` / `PwaUpdatePrompt` (hỏi trước khi tải bản mới). Kiểm tra bằng Chrome trên bản build (`vite preview`): manifest không lỗi, Chrome báo cài được, service worker điều khiển trang, tắt mạng vẫn mở được trang và hiện "Bạn đang offline". Test 84/84, lint, build đạt.
- [x] Bước 3: `npm run test:e2e` (`playwright.config.ts`, `e2e/quiz-flow.spec.ts`, có sẵn từ commit `7954ae8`), 3 luồng × 2 khung (Pixel 7, máy tính): luyện tập (Enter / bấm "Kiểm tra", vuốt / phím →), thi thử (nộp, xem lại, lượt làm gần đây), môn không tồn tại. Sửa 2 lỗi khi chạy lần đầu: lệnh bật backend ghi rõ `.\mvnw.cmd` (Windows có thể tắt việc tìm lệnh trong thư mục hiện tại); test chọn môn tìm trong `<main>` (trước đó bấm nhầm link "Trang chủ" của thanh điều hướng). Kết quả 6/6, chạy 2 lần đều đạt; build, lint, 84/84 test Vitest đạt.
- [x] Bước 4: agent `code-reviewer` rà toàn bộ Phase 10 + D-043: đồng ý, 1 điểm trung bình, 3 điểm nhỏ.
  - Đã sửa: bản deploy (Dockerfile) chưa trả `index.html` cho đường dẫn của SPA (mở thẳng / tải lại `/subjects/python` ra 404) → `SpaFallbackConfig` + 4 test; manifest được trả đúng kiểu `application/manifest+json` (`server.mime-mappings`). Kiểm tra bằng backend thật có bản build frontend trong `static/`: trang app, `sw.js`, manifest, icon đều 200; `/api/...` sai và file thiếu vẫn 404 Problem Details.
  - Đã sửa: `edits.options` ghi chữ cái sai thì báo lỗi rõ ràng (trước đó Python dừng với `ValueError`).
  - Giữ nguyên, có lý do: so khớp phương án khi import bỏ qua cả khoảng trắng / thụt lề (chỉ nhằm bắt phương án bị đổi chỗ; sửa thụt lề trong cùng phương án vẫn là phương án đó); vuốt chỉ loại trừ ô code `pre` (câu hỏi không có nội dung cuộn ngang khác).
  - Kết quả: backend 113/113, frontend 84/84 + build + lint, E2E 6/6, Python 360/360.

---

## Quy trình cho mỗi phase

1. Lập plan chi tiết, gồm file sẽ tạo/sửa, dependency mới (nếu có) và cách kiểm tra. **Bạn duyệt.**
2. Làm từng bước nhỏ; viết test song song với code.
3. Chạy build + test; review (agent/`/code-review`) cho thay đổi đáng kể.
4. Cập nhật tài liệu (`docs/`, README) và [decisions.md](decisions.md) nếu có quyết định mới.
5. Báo cáo kết quả. Commit khi bạn đồng ý. **Không push** khi chưa được yêu cầu.
