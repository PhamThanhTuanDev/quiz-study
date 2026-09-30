# Quiz Study: hướng dẫn cho Claude

## Dự án

- Quiz Study là **nền tảng web học tập và luyện thi trắc nghiệm nhiều môn**. Python và Giáo dục quốc phòng là 2 môn đầu tiên; sẽ còn thêm Java, Toán, Vật lý và các môn khác.
- Chủ dự án **mới làm dự án kiểu này**: giải thích ngắn gọn, dễ hiểu; làm từng bước; hỏi khi cần quyết định.
- Làm theo phase trong `docs/development-plan.md`. **Hết mỗi phase phải dừng và chờ xác nhận** rồi mới sang phase tiếp theo.
- **Khi bắt đầu một phiên mới:** đọc mục "Tiến độ hiện tại" ở đầu `docs/development-plan.md` để biết đang làm tới đâu, rồi làm tiếp từ việc chưa xong. Không làm lại việc đã xong.
- Tài liệu chính: `docs/architecture.md`, `docs/database-design.md`, `docs/source-material-analysis.md`, `docs/decisions.md`, `docs/skills.md`.

## Stack (không đổi khi chưa được đồng ý)

- Frontend: React + Vite + TypeScript + Tailwind CSS + React Router (chế độ SPA).
- Backend: Java 25 (D-024) + Spring Boot (Web, Data JPA, Security, Bean Validation), Maven.
- Database: MySQL. Test: JUnit 5, Spring Boot Test, Vitest + React Testing Library, Playwright.
- **Cấm tự ý thêm:** Next.js, NestJS, MongoDB, Firebase, Supabase, Prisma, Redux, hoặc framework/database lớn khác.

## Nguyên tắc bắt buộc

1. **Nhiều môn, không hard-code một môn.** Môn học là dữ liệu (`subjects`). Không tạo bảng, route, component, enum hay nhánh `if` riêng cho một môn (không `python_questions`, không `if (subject === "python")`). Thêm môn mới không được đòi hỏi sửa code lõi.
2. **Không xoá, ghi đè, đổi tên hay di chuyển tài liệu nguồn** (các file `*.pdf` ở thư mục gốc và mọi file câu hỏi người dùng cung cấp) khi chưa được đồng ý rõ ràng.
3. **Không thay đổi nội dung câu hỏi.** Quy tắc về đáp án (chi tiết: `.claude/rules/source-material.md`, D-020, D-021 trong `docs/decisions.md`):
   - **GDQP:** lấy đáp án theo chữ đỏ trong tài liệu, không tự sửa.
   - **Python:** dấu tô trong tài liệu là bài làm chưa kiểm chứng của chủ dự án, **không dùng**. Claude tự xác định đáp án đúng; câu có code phải **chạy thật bằng Python 3** để kiểm chứng; ghi lý do cho từng câu.
   - **Câu điền khuyết** được chuyển thành trắc nghiệm A–D; Claude tạo phương án, phương án sai cũng phải kiểm chứng (D-026).
   - Câu lỗi đề hoặc mơ hồ thì đánh dấu `NEEDS_REVIEW`, ghi lý do và hỏi chủ dự án.
4. **Không thêm dependency** (npm, Maven, công cụ) khi chưa nêu lý do và được đồng ý. Ghi quyết định vào `docs/decisions.md`.
5. **Trước feature lớn phải lập plan**: file sẽ tạo/sửa, dependency, cách kiểm tra. Trình bày và chờ duyệt.
6. **Không thay đổi lớn ngoài yêu cầu.** Không refactor hay "tiện tay sửa" phần không liên quan; thấy vấn đề thì ghi lại và báo.
7. **Sau khi thay đổi phải chạy test/build phù hợp** (xem "Lệnh kiểm tra") và báo kết quả trung thực, kể cả khi thất bại.
8. **Gặp lỗi thì tìm nguyên nhân gốc**, không sửa tạm: không tắt/skip test, không nuốt exception, không dùng `any` hay `@SuppressWarnings` để che lỗi.
9. **Code dễ đọc, dễ bảo trì.** Tên rõ nghĩa, hàm ngắn, một trách nhiệm; comment giải thích "tại sao", không lặp lại "cái gì".
10. **Bảo mật:** không commit `.env`, mật khẩu, API key, secret, mật khẩu database. Cấu hình nhạy cảm lấy từ biến môi trường.
11. **Git:** commit nhỏ, message dạng `feat: ...`, `fix: ...`, `docs: ...`. **Không push** lên GitHub khi chưa được yêu cầu.

## Frontend (chi tiết: `.claude/rules/frontend.md`)

- TypeScript `strict`. Không dùng `any`; kiểu dữ liệu API đặt trong `src/types/`.
- **Responsive, mobile-first**: viết style cho màn hình nhỏ trước, rồi mở rộng bằng `sm:` `md:` `lg:`.
- Cấu trúc: `components/`, `pages/`, `layouts/`, `services/` (gọi API), `hooks/`, `types/`.
- Gọi API qua `src/services/`, không gọi `fetch` rải rác trong component.

## Backend (chi tiết: `.claude/rules/backend.md`)

- **Controller → Service → Repository → Entity.** Controller mỏng, nghiệp vụ nằm ở Service.
- API trả **DTO**, không trả Entity. Validate input bằng Bean Validation. Xử lý lỗi tập trung (`@RestControllerAdvice`, Problem Details).
- API làm bài **không bao giờ** trả `is_correct` trước khi nộp; chấm điểm ở server.

## Database (chi tiết: `.claude/rules/database.md`, `docs/database-design.md`)

- Schema generic hỗ trợ nhiều môn: `subjects → chapters → questions → answers`, cùng `quizzes`, `quiz_results`, `user_answers`, `users`.
- `utf8mb4`, `snake_case`, thời gian lưu UTC. Thay đổi schema qua migration, không sửa tay trên database.

## Lệnh kiểm tra

Có hiệu lực từ Phase 1; cập nhật khi thay đổi.

- Frontend (`frontend/`): `npm run build` · `npm run test` · `npm run lint`
- Backend (`backend/`): `mvnw.cmd verify` (Windows) hoặc `./mvnw verify`. **Cần JDK 25** (`JAVA_HOME` trỏ JDK 25).
  - `verify` chạy cả `QuizStudyApplicationTests` (profile `test`), nên cần MySQL và database `quiz_study_test`. Tạo database bằng `scripts/setup-database.ps1` (chủ dự án chạy, vì cần mật khẩu root). Máy 2 đã tạo xong.
  - Test repository (`@DataJpaTest`) cũng chạy trên `quiz_study_test` thật (không Testcontainers, D-015), mỗi test tự rollback.
  - Test không cần database: `mvnw.cmd test "-Dtest=HealthServiceTest,HealthControllerTest,GlobalExceptionHandlerTest"`.
- Chỉ sửa tài liệu thì không cần build, nhưng kiểm tra link/đường dẫn trong tài liệu.

## Skill và agent (ECC, chi tiết: `docs/skills.md`)

- Skill trong `.claude/skills/` (Spring Boot, JPA, MySQL, React, Vite, TDD, E2E, security, git…). Dùng khi đúng chủ đề.
- Agent trong `.claude/agents/` (planner, architect, code-reviewer, java-reviewer, typescript-reviewer, build-error-resolver, java-build-resolver, security-reviewer, tdd-guide, code-simplifier). **Chỉ gọi khi thật sự cần**: plan cho feature lớn, review trước khi báo hoàn thành một phần đáng kể, hoặc khi chủ dự án yêu cầu. Không gọi hàng loạt agent song song.

## Môi trường

- Vị trí project: `D:\Learn\quiz-study` (D-018). Không đặt project trong thư mục được Google Drive/OneDrive đồng bộ. Bản cũ ở `G:\My Drive\HCMUTE\quiz-study` chỉ có Phase 0, **không dùng**.
- Máy gốc: Windows 10; Node 26, Java 21 (**phải cài JDK 25** trước khi build backend, D-024), Maven 3.9, MySQL 8.0 (service `MySQL80`, cổng 3306; `mysql.exe` chưa có trong PATH), Git. Chưa có Docker và `gh`.
- Máy 2 (Windows 11, kiểm tra ngày 2026-09-30): Node 24.20, `JAVA_HOME` (cấp User) = `C:\Program Files\Java\jdk-25.0.4`, MySQL 8.0.46 (`MySQL80`, cổng 3306; `mysql.exe` chưa có trong PATH; database và user `quiz_app` đã tạo), Maven 3.9.16, Git, Docker 29.8, Python 3.14 (dùng lệnh `py`). Chưa có `gh`.
- Khi chạy trên máy khác: kiểm tra lại các công cụ trên (`node -v`, `java -version`, `mvn -v`, MySQL) trước khi làm tiếp. Không mặc định máy mới giống máy gốc.
