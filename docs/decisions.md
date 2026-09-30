# Nhật ký quyết định

Ghi lại mọi quyết định kỹ thuật quan trọng: bối cảnh, lựa chọn và hệ quả. Khi có quyết định mới, thêm mục mới. Không xoá mục cũ; nếu thay đổi thì đánh dấu "Thay thế bởi D-xxx".

Trạng thái: **Đã chốt** · **Đề xuất** (chờ bạn duyệt) · **Cần quyết định** (bạn chọn)

---

## A. Đã chốt

### D-001 · Stack công nghệ · Đã chốt (theo yêu cầu, 2026-09-30)
- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router.
- Backend: Java, Spring Boot, Spring Web, Spring Data JPA, Spring Security, Bean Validation.
- Database: MySQL. Test: JUnit, Spring Boot Test, test frontend, test E2E. Công cụ: Git, GitHub.
- **Không** dùng Next.js, NestJS, MongoDB, Firebase, Supabase, Prisma, Redux hoặc framework/database lớn khác khi chưa được đồng ý.

### D-002 · Một repository chứa frontend và backend tách riêng · Đã chốt
`frontend/`, `backend/`, `database/`, `docs/`, `scripts/` nằm chung một Git repo. Frontend và backend là hai project độc lập, giao tiếp qua REST.

### D-003 · Mô hình dữ liệu generic nhiều môn · Đã chốt (theo yêu cầu)
`Subject → Chapter → Question → Answer`. Môn học là dữ liệu. Không tạo bảng riêng theo môn. Chi tiết: [database-design.md](database-design.md).

### D-004 · Tài liệu nguồn chỉ đọc; không tự bổ sung đáp án · Đã chốt (theo yêu cầu)
- Không xoá, ghi đè, đổi tên, di chuyển file nguồn khi chưa được đồng ý.
- Không sửa nội dung câu hỏi/đáp án; không suy đoán đáp án từ kiến thức bên ngoài.
- Câu thiếu hoặc nghi vấn đáp án: trạng thái `DRAFT` / `NEEDS_REVIEW`, không dùng trong bài thi.

### D-005 · Cài ECC chọn lọc, phạm vi project · Đã thực hiện (2026-09-30)
21 skill + 10 agent từ ECC 2.2.2 (commit `c70874f`) vào `.claude/`. Cài bằng cách copy từng thành phần, vì installer lỗi trên Google Drive (không hỗ trợ hard link). Chi tiết và kiểm chứng: [skills.md](skills.md).

### D-006 · Không cài ECC hooks / rules / commands / MCP · Đã thực hiện
Lý do chính: `rules/common` của ECC mâu thuẫn với cách làm việc từng bước của dự án; hooks chạy ngầm khó kiểm soát với người mới. Dự án dùng rule riêng trong `.claude/rules/`.

---

## B. Đề xuất, chờ bạn duyệt

### D-007 · Phiên bản · Đề xuất
| Thành phần | Phiên bản | Lý do |
|---|---|---|
| Java | ~~21 (LTS)~~ → **Thay thế bởi D-024** (Java 25) | Đã cài trên máy; được Spring Boot 4 hỗ trợ |
| Spring Boot | 4.1.x (hiện là 4.1.1, bản ổn định mặc định trên Spring Initializr) | Spring Initializr không còn cung cấp dòng 3.x. Nhiều tutorial trên mạng viết cho 3.x, phần lớn vẫn áp dụng được |
| Build backend | Maven + Maven Wrapper (`mvnw`) | Máy đã có Maven 3.9.16; wrapper giúp mọi máy dùng cùng phiên bản |
| React / Vite / TypeScript / Tailwind / React Router | Bản mới nhất lúc tạo project ở Phase 1 (hiện là React 19.3, Vite 8.3, Tailwind 4.3, React Router 8.4) | Dùng đúng template chính thức, không tự ghim phiên bản lạ |

### D-008 · Backend tổ chức package theo tầng (package-by-layer) · Đề xuất
`controller/`, `service/`, `repository/`, `entity/`, `dto/`, `mapper/`, `exception/`, `config/` dưới package gốc (tạm đặt `com.quizstudy`).
- Ưu: dễ hiểu với người mới, khớp trực tiếp mô hình Controller → Service → Repository → Entity.
- Nhược: khi dự án rất lớn, mỗi thư mục sẽ nhiều file. Với khoảng 8 entity thì chấp nhận được. Có thể chuyển sang package-by-feature sau.

### D-009 · Quản lý schema bằng Flyway · Đề xuất (thêm dependency, cần đồng ý)
- Mỗi thay đổi schema là một file SQL đánh số trong `backend/src/main/resources/db/migration/`, chạy tự động khi backend khởi động, có lịch sử trong Git.
- Hibernate đặt `ddl-auto=validate` (chỉ kiểm tra, không tự sửa bảng).
- Dependency mới: `spring-boot-starter-flyway` (hoặc `flyway-core`) + `flyway-mysql`.
- Phương án thay thế: tự viết script SQL trong `database/` và chạy tay. Đơn giản hơn nhưng dễ lệch giữa các máy.

### D-010 · Gọi API bằng `fetch`, state bằng React · Đề xuất
Không thêm axios, Redux, Zustand hay TanStack Query ở giai đoạn đầu. Nếu sau này cần cache dữ liệu phức tạp thì đề xuất lại.

### D-011 · Chấm điểm ở server, không lộ đáp án · Đề xuất
API làm bài không trả `is_correct`. Đáp án đúng chỉ trả về sau khi nộp bài (hoặc sau từng câu nếu chế độ luyện tập được chọn như vậy, xem Q-09).

### D-012 · Code trong câu hỏi lưu cột riêng, hiển thị `<pre>` · Đề xuất
Cột `questions.code_snippet`. Frontend hiển thị bằng `<pre><code>` với font monospace, giữ nguyên thụt lề. Chưa thêm thư viện Markdown hay tô màu cú pháp.

### D-013 · `quiz_results` là một lượt làm bài · Đề xuất
Tạo khi bắt đầu, cập nhật khi nộp. `user_answers` có mỗi câu một dòng, tạo lúc bắt đầu để "chụp" bộ câu ngẫu nhiên và thứ tự câu. Có thể đổi tên thành `quiz_attempts` nếu bạn thấy dễ hiểu hơn.

### D-014 · Thêm Spring Security ở Phase 7 · Đề xuất
Nếu thêm ngay từ Phase 1, Spring Security mặc định khoá mọi endpoint và sinh mật khẩu ngẫu nhiên, dễ gây rối khi mới bắt đầu. Stack vẫn giữ nguyên, chỉ lùi thời điểm thêm.

### D-015 · Database cho test · Đề xuất
Máy chưa có Docker nên chưa dùng Testcontainers. Test tích hợp chạy trên database MySQL local riêng `quiz_study_test`, không đụng dữ liệu dev. Unit test Service dùng Mockito, không cần database.

### D-016 · `docker-compose.yml` chỉ chứa MySQL, là tuỳ chọn · Đã tạo, chưa chạy được
Máy chưa cài Docker nên file này chưa được chạy thử. Cổng 3307 để không đụng MySQL80 local (3306). Image `mysql:8.0` khớp phiên bản trên máy. Mật khẩu đọc từ `.env` (không commit).

### D-017 · Ngôn ngữ trong code · Đề xuất
Tên biến/hàm/lớp/bảng bằng tiếng Anh; nội dung hiển thị cho người dùng bằng tiếng Việt; tài liệu `docs/` bằng tiếng Việt.

---

## B2. Quyết định của chủ dự án (2026-09-30)

### D-018 · Vị trí project: `D:\Learn\quiz-study` · Đã chốt (Q-01)
- Đã copy từ `G:\My Drive\HCMUTE\quiz-study` sang `D:\Learn\quiz-study` (99 file, kiểm tra SHA-256 khớp 100%).
- Bản cũ trong Google Drive **chỉ có nội dung Phase 0**, không dùng để làm tiếp; chủ dự án tự xoá khi muốn.
- Không đặt project trong thư mục được Google Drive/OneDrive đồng bộ (không hỗ trợ hard link, `node_modules` bị đồng bộ).

### D-019 · Không đưa PDF nguồn vào Git · Đã chốt (Q-02)
`.gitignore` có dòng `*.pdf`. Các file PDF vẫn nằm ở thư mục gốc trên máy và là nguồn chỉ đọc. Khi chuyển máy, phải copy PDF riêng (không đi theo Git).

### D-020 · Đáp án môn Python do Claude xác định · Đã chốt (P1, P2)
- Dấu tô (đỏ/vàng/đậm) trong các file Python là **bài làm của chủ dự án, chưa được kiểm chứng**. **Không dùng làm đáp án.**
- Claude xác định đáp án đúng cho **toàn bộ** câu Python, kể cả khoảng 100 câu tài liệu không có đáp án và các câu điền khuyết.
- Cách làm (Phase 4):
  - Câu có code: **chạy thật bằng Python 3** để lấy kết quả.
  - Câu lý thuyết: đối chiếu tài liệu chính thức của Python.
  - Ghi lý do/cách kiểm chứng cho từng câu.
- Câu lỗi đề (thiếu code, trùng nhãn, tên biến không khớp, dấu nháy cong làm code không chạy…) vẫn để `NEEDS_REVIEW` và liệt kê cho chủ dự án.
- Có thể báo những câu mà bài làm của chủ dự án khác với đáp án đúng (phục vụ việc học), nếu chủ dự án muốn.
- Môn GDQP vẫn lấy đáp án theo **chữ đỏ** trong tài liệu (file ghi "CÓ ĐÁP ÁN").

### D-021 · Các điểm chưa rõ của GDQP · Đã chốt (G1, G2, G3)
- G1: Bài 3 – Câu 6, đáp án **C**.
- G2: Bài 4 – Câu 13, đáp án **A**.
- G3: số thứ tự câu không quan trọng, quan trọng là nội dung câu hỏi và đáp án. Được đánh số lại theo thứ tự xuất hiện; số gốc giữ trong `source_label` để đối chiếu.

### D-022 · Đưa câu điền khuyết vào hệ thống · Đã chốt (Q-04, P4)
Có khoảng 60 câu Python dạng điền khuyết, nên `FILL_IN_BLANK` nằm trong phạm vi MVP. Thiết kế chi tiết (lưu nhiều chỗ trống, cách người học nhập, quy tắc so khớp đáp án) chốt khi làm schema ở Phase 2 và giao diện ở Phase 5.

### D-007, D-008, D-009 · Đã được đồng ý (2026-09-30)
- Spring Boot **4.1.1**, Java 21 (sau đổi sang Java 25, xem D-024), Maven Wrapper.
- Package gốc `com.quizstudy` (Q-11).
- Dùng **Flyway** cho schema (`spring-boot-starter-flyway` + `flyway-mysql` 12.4.0).

### D-023 · Linter frontend: Oxlint (mặc định của template) · Đã thực hiện
`create-vite` 9.2.1 dùng Oxlint thay ESLint cho template React. Giữ mặc định của template chính thức. Lệnh: `npm run lint`.

### D-024 · Backend dùng Java 25 thay Java 21 · Đã chốt (chủ dự án yêu cầu, 2026-09-30)
- `pom.xml`: `<java.version>25</java.version>`, nên code được biên dịch với `--release 25`.
- Java 25 cũng là bản LTS và được Spring Boot 4.1.1 hỗ trợ. Đã kiểm chứng: `mvnw.cmd clean verify` đạt 6/6 test, backend chạy bằng Java 25.0.4 và kết nối được MySQL.
- Máy 2: `JAVA_HOME` cấp User đặt thành `C:\Program Files\Java\jdk-25.0.4` (Oracle JDK 25.0.4). Giá trị cũ là `C:\Program Files\Eclipse Adoptium\jdk-25.0.4.101-hotspot`, cũng là JDK 25; `JAVA_HOME` cấp Machine và `PATH` vẫn trỏ bản Adoptium này.
- Hệ quả: máy gốc chỉ có JDK 21, phải cài JDK 25 trước khi build backend trên máy đó.
- Thay thế dòng Java trong D-007.

### D-025 · Nạp Mockito làm Java agent khi chạy test · Đã thực hiện (chủ dự án yêu cầu, 2026-09-30)
- Vấn đề: từ JDK 21, Mockito tự gắn agent lúc chạy test nên JVM in cảnh báo "Mockito is currently self-attaching…". Các bản JDK sau sẽ chặn cách này.
- Cách làm theo tài liệu Mockito (mục 0.3), trong `backend/pom.xml`:
  - `maven-dependency-plugin` (goal `properties`) lấy đường dẫn file jar `mockito-core`. Đây là plugin chuẩn của Apache Maven, phiên bản do Spring Boot parent quản lý (3.10.0). Không thêm thư viện nào vào ứng dụng.
  - `maven-surefire-plugin`: `argLine` = `-javaagent:${org.mockito:mockito-core:jar} -Xshare:off`.
- `-Xshare:off`: agent thêm class vào bootstrap classpath, làm JVM in cảnh báo về Class Data Sharing. Chỉ tắt CDS cho JVM chạy test; ứng dụng thật không bị ảnh hưởng.
- Kết quả: `mvnw.cmd verify` không còn cảnh báo nào.
- Lưu ý: nếu sau này thêm JaCoCo (cũng dùng `argLine`), phải đổi thành `@{argLine} -javaagent:…` để hai cấu hình không ghi đè nhau.
- Chạy test trong IDE (không qua Maven) có thể vẫn thấy cảnh báo Mockito. Không ảnh hưởng kết quả test.

---

## C. Cần bạn quyết định

Đã quyết: Q-01 → D-018 · Q-02 → D-019 · Q-04 → D-022 · Q-05 → D-020 (Claude xác định đáp án) · Q-11 → D-008 · Q-15: commit đầu tiên ngày 2026-09-30 khi Phase 1 được duyệt (chưa có repo GitHub). Q-03: G1–G3, P1, P2, P4 đã quyết; các mục còn lại vẫn mở.

| ID | Câu hỏi | Đề xuất của tôi | Cần trước |
|---|---|---|---|
| Q-03 | Các điểm còn mở trong tài liệu: G4, G5, P5–P14 | Xem [source-material-analysis.md](source-material-analysis.md) | Phase 4 |
| Q-06 | Khách chưa đăng nhập có được làm bài không? | Có (`user_id` NULL); lịch sử cá nhân chỉ khi đăng nhập | Phase 5 |
| Q-07 | Đăng nhập bằng session cookie hay JWT? | Session cookie HttpOnly + CSRF (có sẵn trong Spring Security, ít code tự viết, phù hợp SPA chạy cùng origin qua proxy). JWT khi có app mobile riêng | Phase 7 |
| Q-08 | Thang điểm | Thang 10, làm tròn 2 chữ số | Phase 5 |
| Q-09 | Chế độ luyện tập có hiện đáp án ngay sau mỗi câu? | Có ở `PRACTICE`; `EXAM` chỉ hiện sau khi nộp | Phase 5 |
| Q-10 | Công cụ trích xuất PDF | Script **Python + PyMuPDF** trong `scripts/`, chạy offline, không phải một phần của web app. Đã chứng minh đọc đúng tiếng Việt, màu chữ và highlight khi khảo sát. Lưu ý: cần cài Python cho bước này; PyMuPDF dùng giấy phép AGPL, chấp nhận được vì chỉ là công cụ nội bộ, không đóng gói vào ứng dụng. Phương án thay thế: Java + Apache PDFBox trong backend | Phase 4 |
| Q-12 | Slug/tên môn: `python` – "Nhập môn lập trình Python"; `gdqp` – "Giáo dục quốc phòng và an ninh"? | Như bên trái, chờ G4, G5, P12 | Phase 4 |
| Q-13 | Đổi thứ tự Phase 6 ↔ 7? | Giữ thứ tự; Phase 6 làm trang kết quả trước, lịch sử cá nhân hoàn thiện sau Phase 7 | Phase 6 |
| Q-14 | MySQL 8.0 đã hết hỗ trợ theo lịch của Oracle (tháng 4/2026); bản LTS hiện tại là 8.4 | Dev tiếp với 8.0.46; nâng cấp lên 8.4 LTS trước khi triển khai thật | Trước khi deploy |
| Q-15 | ~~Git: tạo commit đầu tiên ngay?~~ Đã commit (2026-09-30). Còn lại: khi nào tạo repo GitHub? | Tạo repo GitHub private khi bạn yêu cầu | Tuỳ bạn |
