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

### D-022 · Đưa câu điền khuyết vào hệ thống · Đã chốt (Q-04, P4) · **Cách làm được thay thế bởi D-026**
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

### D-026 · Câu điền khuyết được chuyển thành trắc nghiệm A–D · Đã chốt (chủ dự án yêu cầu, 2026-09-30)
Thay cho cách làm ở D-022. Người học chỉ chọn đáp án, không phải gõ.
- Đề giữ nguyên chữ của tài liệu, kể cả dấu `…`.
- Claude tạo **4 phương án A–D**: 1 phương án đúng (xác định theo D-020, câu có code thì chạy thật bằng Python 3) và 3 phương án sai. Phương án sai phải được kiểm chứng là sai; câu có code thì chạy thử. Không được có phương án sai mà thực ra cũng đúng.
- Câu nhiều chỗ trống: mỗi phương án ghi đủ giá trị cho mọi chỗ trống theo thứ tự xuất hiện.
- Lưu như câu `SINGLE_CHOICE` bình thường, **không cần thay đổi schema**. Nguồn gốc: `source_label` ghi thêm "(gốc: điền khuyết)". Lý do chọn từng phương án ghi trong file JSON trung gian ở Phase 4, để chủ dự án duyệt trước khi import.
- Câu không tạo được 3 phương án sai rõ ràng (ví dụ nhiều cách điền đều đúng) thì để `NEEDS_REVIEW` và hỏi chủ dự án.
- Hệ quả: enum `QuestionType` hiện chỉ có `SINGLE_CHOICE`. Cột `question_type` vẫn giữ để sau này thêm dạng câu khác cho các môn mới.

### D-028 · Hướng thiết kế giao diện "bàn học yên tĩnh" · Đã chốt (kế hoạch Phase 3, 2026-09-30)
- Mục đích: sinh viên ôn và luyện thi trắc nghiệm, chủ yếu trên điện thoại, nhiều lượt ngắn. Ưu tiên đọc rõ, bấm dễ, ít phân tâm; không gradient, không khối trang trí.
- Màu: nền giấy ấm (họ `stone`), chữ đậm như mực, **một màu chính** teal-700 chỉ dành cho hành động và điểm nhấn. Màu ngữ nghĩa: xanh lá = đúng, đỏ = sai, hổ phách = cần chú ý. Độ tương phản đạt WCAG AA.
- Token khai báo **một chỗ** trong `frontend/src/index.css` (`@theme` của Tailwind 4): `canvas`, `surface`, `line`, `line-strong`, `ink`, `muted`, `primary` (+ `-hover`, `-soft`), `success`, `danger`, `warning` (+ `-soft`). Component dùng class ngữ nghĩa (`bg-primary`, `text-muted`…), không dùng màu cụ thể như `bg-teal-700`. Đổi màu hay thêm chế độ tối sau này chỉ sửa file này.
- Chữ: font hệ thống mặc định của Tailwind (Segoe UI / Roboto / San Francisco), không tải font ngoài.
- Dấu nhận diện: **huy hiệu chữ cái** (`LetterBadge`): logo "Q", sau này là nhãn phương án A/B/C/D.
- Vùng bấm ≥ 44px (`min-h-11`); viền focus bàn phím thống nhất (`:focus-visible` màu `primary`); link "Bỏ qua điều hướng".
- Chưa làm: menu thu gọn trên điện thoại (khi có từ 3 mục điều hướng), chế độ tối.

### D-029 · Trích xuất câu hỏi bằng Python + PyMuPDF · Đã chốt (Q-10, 2026-09-30)
- Script trong `scripts/`, chạy thủ công, **chỉ đọc** PDF; không phải một phần của web app.
- PyMuPDF (phiên bản ghi trong `scripts/requirements.txt`) cài trong môi trường ảo `scripts/.venv` (không commit, không ảnh hưởng Python chung của máy). Có bản cài sẵn cho Python 3.14.
- Giấy phép AGPL chấp nhận được vì chỉ là công cụ nội bộ, không đóng gói vào ứng dụng.
- Lý do chọn: khi khảo sát (Phase 0) PyMuPDF đọc đúng tiếng Việt, màu chữ và highlight; `pdftotext` làm hỏng dấu.

### D-030 · Không commit nội dung câu hỏi vào Git · Đã chốt (2026-09-30)
- Cùng lý do với D-019 (PDF): nội dung câu hỏi thuộc tài liệu của trường.
- Git chỉ chứa: script trích xuất + file cấu hình nhỏ mỗi môn (`database/seed/<slug>/subject.json`: tên môn, tên bài, quyết định về đáp án như G1, G2).
- File sinh ra (`database/seed/<slug>/generated/`: JSON để import, báo cáo duyệt) bị `.gitignore` bỏ qua. Máy khác chạy lại script từ PDF để tạo lại.

### D-031 · Tên môn GDQP · Đã chốt (G5, Q-12, 2026-09-30)
- Slug `gdqp`, tên "Giáo dục quốc phòng và an ninh" (theo tài liệu). Chưa có mã học phần (G4 chưa rõ nghĩa "CĐ", "LT CĐ-ĐH").
- Tên bài viết hoa/thường chuẩn (PDF viết HOA toàn bộ); nhãn bài (`chapters.code`) là "Bài 1" … "Bài 11", hiển thị trực tiếp được.

### D-032 · Sửa tên Bài 2 GDQP thành "Mác-Lênin" · Đã chốt (chủ dự án, 2026-10-01)
- Tài liệu viết "MÁC- LÊNIN" (dấu cách thừa sau gạch nối). Tên hiển thị sửa thành "Mác-Lênin".
- **Chỉ tên bài.** Nội dung câu hỏi giữ nguyên cách viết của tài liệu ("Mác - Lênin").
- Cách ghi: `database/seed/gdqp/subject.json` có `title` (tên hiển thị), `sourceTitle` (nguyên văn PDF) và `titleDecision`. Script vẫn đối chiếu với `sourceTitle`, và bắt buộc có `titleDecision` khi tên hiển thị khác PDF.

### D-033 · Môn Python: tên và cách chia bài · Đã chốt (Q-12, P12, P13, 2026-10-01)
- Slug `python`, tên "Nhập môn lập trình Python", mã học phần `IPPA233277` (theo tên file; chân slide ghi `IPPA23327`, có vẻ thiếu một số).
- Chia **10 bài theo buổi học**: Giới thiệu · Các khái niệm cơ bản · Kiểu dữ liệu và cấu trúc rẽ nhánh · Cấu trúc lặp · List · Tuple, Set, Dictionary · Hàm · Xử lý chuỗi · Module và thư viện · Class. Câu của file lý thuyết và file bài tập cùng buổi vào cùng một bài.

### D-034 · Xử lý các điểm chưa rõ của tài liệu Python · Đã chốt (P5–P11, P14, 2026-10-01)
- **Câu trùng** (P5, và trùng giữa file lý thuyết và file bài tập): chỉ giữ một câu; câu bị bỏ ghi trong review.md.
- **Câu lỗi đề** (P6 thiếu code, P10 tên biến không khớp, đề và code mâu thuẫn…): `NEEDS_REVIEW` + lý do, không vào bài làm; liệt kê để chủ dự án quyết từng câu.
- **P7**: câu có 6 phương án giữ nguyên. **P8**: hai phương án cùng nhãn "C" giữ cả hai theo thứ tự (nhãn tính lại khi hiển thị). **P9**: số "50" đứng lẻ bỏ qua.
- **P11**: câu "Tính đến tháng 6/2023…" giữ lại; đáp án theo bảng TIOBE tháng 6/2023, ghi nguồn.
- **P14**: bài tập tự luận (lập trình) không đưa vào.
- Kiểm chứng bằng **Python 3.14** trên máy; câu có kết quả phụ thuộc phiên bản Python → `NEEDS_REVIEW`.

### D-035 · Trích xuất Python bằng "bản đồ vị trí" · Đã chốt (2026-10-01)
- Script đánh số các dòng chữ trên trang trắc nghiệm. Claude xem ảnh trang và ghi **vị trí** của đề / code / phương án vào file quyết định (commit), **không gõ lại nội dung**; script dựng lại nội dung từ PDF theo vị trí. Nội dung luôn đúng nguyên văn và không nằm trong Git (giữ D-030).
- File quyết định còn có: đáp án, lý do, cách kiểm chứng (code chạy thật, D-020), phương án A–D Claude tạo cho câu điền khuyết (D-026).

### D-036 · Duyệt các câu Python cần xem lại · Đã chốt (chủ dự án, 2026-10-01)
- **Lỗi in ấn** (8 câu: dấu "–" thay dấu trừ, nháy cong, lệnh không thụt lề trong code hoặc phương án): dùng đáp án Claude đề xuất (coi là ký tự đúng), chuyển sang `PUBLISHED`. Nội dung câu giữ nguyên văn.
- **Câu hỏi mở** không có phương án trong tài liệu (1 câu, w04.1 HW tr.2 câu 10): áp dụng D-026, Claude tạo 4 phương án đã kiểm chứng, chuyển sang `PUBLISHED`.
- **Còn lại giữ `NEEDS_REVIEW`** (không vào bài làm, không sửa nội dung): đề không khớp code (14 câu), không có phương án đúng (6 câu), có nhiều cách hiểu (13 câu). Đề xuất đáp án cho từng câu vẫn ghi trong `review.md` để quyết sau.
- Kết quả: 295 câu, 262 `PUBLISHED`, 33 `NEEDS_REVIEW`.

### D-037 · Làm bài: khách, thang điểm, hiện đáp án · Đã chốt (Q-06, Q-08, Q-09, chủ dự án, 2026-10-01)
- **Khách được làm bài** (chưa đăng nhập): `quiz_results.user_id` để NULL. Lịch sử cá nhân chỉ có khi đăng nhập (Phase 7).
- **Thang điểm 10** (chỉ cho thi thử): điểm = số câu đúng / tổng số câu × 10, làm tròn 2 chữ số (làm tròn nửa lên). Câu bỏ trống tính là sai.
- **Luyện tập (`PRACTICE`)**: người học chọn bài muốn học; trả lời xong một câu thì hiện ngay đúng/sai và đáp án đúng của **câu đó**; câu đã kiểm tra thì không đổi được. **Không chấm điểm, không nộp bài** (chủ dự án, 2026-10-01).
- **Thi thử (`EXAM`)**: chỉ hiện kết quả sau khi nộp bài; trước khi nộp được đổi lựa chọn; chấm điểm thang 10.

### D-038 · Giữ thứ tự Phase 6 → 7 · Đã chốt (Q-13, chủ dự án, 2026-10-01)
- Phase 6 làm phần xem lại bài thi thử sau khi nộp (đã chọn gì, đáp án đúng). Lịch sử làm bài theo từng người dùng làm sau Phase 7 (cần đăng nhập).

### D-039 · Làm Phase 10 trước Phase 7–9 · Đã chốt (chủ dự án, 2026-10-01)
- Sau Phase 6 (kèm phím tắt khi làm bài: Enter kiểm tra, ← → chuyển câu), làm luôn Phase 10 (PWA / trải nghiệm điện thoại). Phase 7 (đăng nhập), 8 (quản trị), 9 (xếp hạng, thống kê) làm sau.
- Hệ quả: ứng dụng vẫn chỉ có khách (D-037); Q-07 (session cookie hay JWT) quyết khi làm Phase 7. Việc giới hạn số lượt làm của khách vẫn nằm ở Phase 7, phải làm trước khi đưa ứng dụng lên mạng công khai.

### D-040 · PWA bằng `vite-plugin-pwa`, offline chỉ cho giao diện · Đã chốt (chủ dự án, 2026-10-01)
- Thêm devDependency `vite-plugin-pwa` 1.3 (MIT, hỗ trợ Vite 8): Web App Manifest + service worker (Workbox) lưu sẵn file giao diện; có bản mới thì hỏi người dùng tải lại. Lý do: tự viết service worker phải tự quản lý phiên bản bộ nhớ đệm, dễ làm app kẹt ở bản cũ.
- Offline chỉ mở được giao diện và báo "Bạn đang offline"; không làm bài offline (phải tải đáp án về máy, trái nguyên tắc chấm ở server, D-037). Không lưu đệm kết quả API.
- Icon tạo từ logo chữ "Q" (SVG) bằng Chrome headless sẵn có; không thêm công cụ.

### D-041 · E2E bằng Playwright, dùng Chrome đã cài · Đã chốt (chủ dự án, 2026-10-01)
- Thêm devDependency `@playwright/test` 1.63 (Apache-2.0). Chạy bằng Chrome đã cài trên máy (`channel: 'chrome'`), không tải trình duyệt riêng của Playwright.
- E2E chạy với backend + database dev đang chạy (dữ liệu thật), lệnh riêng `npm run test:e2e`, không gộp vào `npm run test`.
- Trên điện thoại: vuốt trái / phải để chuyển câu (tương đương phím ← →); đồng hồ thi thử luôn hiện khi cuộn. (Vuốt đã bỏ theo D-044.)

### D-042 · Thêm Bài 11 (NumPy) cho môn Python, cài NumPy để kiểm chứng · Đã chốt (chủ dự án, 2026-10-02)
- Chủ dự án bổ sung 2 file `w10-w11-c07_phan-tich-du-lieu-numpy` (lý thuyết + bài tập). Thêm thành **Bài 11 "Phân tích dữ liệu và NumPy"**, làm theo bản đồ vị trí (D-035), D-020, D-026 như 10 bài trước.
- Cài `numpy` 2.5.3 vào `scripts/.venv` (ghi trong `scripts/requirements.txt`) chỉ để `verify_python_answers.py` chạy thật code NumPy. Không ảnh hưởng web app.
- Mục 11 trang 24 của file lý thuyết chỉ là bảng ký hiệu kiểu dữ liệu (i, b, O, f…), không có câu hỏi: bỏ qua, ghi lý do trong bản đồ. Phần "BÀI TẬP" lập trình (HW trang 7–11) không đưa vào (P14).
- Thêm nhóm duyệt `multiple` trong `review.md`: câu một đáp án mà có từ 2 phương án cùng đúng, để chủ dự án quyết cả nhóm.
- Kết quả: Bài 11 có 65 câu (50 `PUBLISHED`, 15 `NEEDS_REVIEW`); cả môn 360 câu, 312 `PUBLISHED`, 48 `NEEDS_REVIEW`. (Sau D-043: cả 360 câu đều `PUBLISHED`.)

### D-043 · Câu sai thì Claude tự sửa cho đúng, có ghi vết · Đã chốt (chủ dự án, 2026-10-02)
- Chủ dự án: mục đích là học, miễn đúng là được; "từ nay thấy chỗ nào sai thì sửa lại cho đúng, không rập khuôn". Thay cách làm cũ (câu lỗi đề / mơ hồ để `NEEDS_REVIEW` chờ duyệt, D-034, D-036, D-042).
- Câu sai đề, đề và code không khớp, thiếu code, lỗi in ấn, không có hoặc có nhiều đáp án đúng, nhiều cách hiểu: Claude sửa ít nhất có thể cho câu đúng và chỉ còn một đáp án; chỉ hỏi khi không biết được ý đúng.
- Ghi vết: mục `edits` trong bản đồ Python (`stem` / `code` / `setCode` / `allOptions` / `options` + `note` bắt buộc); script báo lỗi nếu đoạn gốc không còn trong tài liệu. `note` được ghi vào cột `explanation`, người học thấy "Đã sửa so với tài liệu: …" khi xem đúng/sai.
- Import lại môn đã có người làm: được sửa ký tự in ấn của phương án (nháy cong / thẳng, "–" / "-", khoảng trắng) vì vẫn là phương án cũ ở vị trí cũ; đổi nghĩa phương án vẫn bị chặn như trước.
- Áp dụng ngay: 48 câu Python đang chờ duyệt và 11 câu đã dùng được nhưng còn lỗi hiển thị (8 câu lỗi in ấn của D-036, 3 câu NumPy) → 58 câu có sửa, 1 câu chỉ chọn đáp án. Môn Python: 360 câu, cả 360 `PUBLISHED`, kiểm chứng 360/360 (320 câu chạy code thật).

### D-044 · Chế độ "Học" xem đáp án; bỏ vuốt chuyển câu · Đã chốt (chủ dự án, 2026-10-06)
- Chủ dự án yêu cầu nút **"Học"** cạnh nút "Luyện tập" của mỗi bài: trang học hiện câu hỏi kèm đáp án đúng tô xanh, không chọn đáp án.
- API riêng `GET /api/v1/subjects/{slug}/chapters/{chapterId}/study` (`StudyController` → `StudyService`) trả mọi câu `PUBLISHED` của bài, phương án theo thứ tự tài liệu (không xáo), kèm `correct` và `explanation`. Quy tắc "API làm bài không trả đáp án trước khi trả lời / nộp" vẫn giữ nguyên cho luyện tập và thi thử: học là chế độ riêng, người học chủ động chọn xem đáp án. Không lưu gì, không chấm điểm.
- Trang `/subjects/:slug/chapters/:chapterId/study` hiện cả bài trên một trang để cuộn đọc liền mạch; đáp án đúng có viền / nền xanh và chữ "✓ Đáp án đúng" (không chỉ dựa vào màu); có giải thích / ghi chú "Đã sửa so với tài liệu" nếu có.
- Bỏ tính năng vuốt trái / phải trên câu hỏi để chuyển câu (D-040, D-041): chuyển câu bằng nút "Câu trước" / "Câu sau", lưới số câu, hoặc phím ← → trên máy tính. Xoá `useSwipe`; test giữ lại một ca kiểm tra vuốt không đổi câu.

### D-045 · Thêm Bài 12 (Matplotlib) và Bài 13 (Pandas) cho môn Python · Đã chốt (chủ dự án, 2026-10-06)
- Chủ dự án bổ sung 4 file `w12-w13-c08_bieu-dien-du-lieu-matplotlib` và `w14-c09_thu-vien-pandas` (lý thuyết + bài tập), yêu cầu thêm phần trắc nghiệm. Thêm thành **Bài 12 "Biểu diễn dữ liệu với Matplotlib"** và **Bài 13 "Thư viện Pandas"**, làm theo bản đồ vị trí (D-035), D-020, D-026, D-043.
- Cài `matplotlib` 3.11.2 và `pandas` 3.0.6 vào `scripts/.venv` (ghi trong `scripts/requirements.txt`) chỉ để `verify_python_answers.py` chạy thật code của hai bài này, cùng lý do với NumPy ở D-042. Không ảnh hưởng web app.
- `verify_python_answers.py` cho code chạy với `MPLBACKEND=Agg` (vẽ không mở cửa sổ, `plt.show()` không chặn) và bộ đệm font chung `database/seed/python/generated/.mplconfig` (không commit); làm nóng bộ đệm một lần trước khi kiểm chứng. Nếu không, mỗi lần chạy matplotlib mất khoảng 4 giây, sát giới hạn 5 giây.
- Bỏ qua 2 dòng chỉ có số, không có câu hỏi: "11." (w14 LT trang 31) và "6." (w14 HW trang 3, câu 6 thật ở cột phải). Phần hướng dẫn / bài tập lập trình (P14) không đưa vào.
- Theo D-043, sửa 23 câu (Bài 12: 16, Bài 13: 7): nhiều phương án cùng đúng (ví dụ `title()` và `set_title()`, `annotate()` và `text()`, `myseries[0]` và `myseries.get(0)`), không có đáp án đúng (`plt.pot`, `plot(projection='3d')`), code sai (`df.read_csv` → `pd.read_csv`), đề chép nhầm (loại "scatter" mà đáp án `hist`), nháy cong.
- Kết quả: Bài 12 có 29 câu, Bài 13 có 39 câu (13 câu điền khuyết). Cả môn: 13 bài, 428 câu `PUBLISHED`; kiểm chứng 428/428 (379 câu chạy code thật); thử ghi sai 5 câu mới thì 4 câu bị bắt (câu còn lại kiểm chứng kiểu minh hoạ, không đối chiếu được chữ cái). Import lại (`-Replace`): 13 bài, 428 câu, 1719 phương án, khớp JSON.

### D-046 · Cách viết phương án câu điền khuyết · Đã chốt (chủ dự án, 2026-10-06)
- Trước đây mỗi giá trị điền được bọc ngoặc vuông (`[0]` hiện thành `[[0]]`, `[if] [<] [:]`), dễ nhầm với code (ví dụ `myseries[[0]]`). Chủ dự án đồng ý đổi.
- Một chỗ trống: ghi đúng giá trị cần điền (`[0]`, `or`, `kind = 'hist'`). Nhiều chỗ trống: đánh số theo thứ tự xuất hiện trong code, ví dụ `(1) if · (2) < · (3) :`. Áp dụng cho cả 94 câu điền khuyết (80 câu một chỗ trống, 14 câu nhiều chỗ trống).
- Import lại môn đã có người làm: định dạng import có thêm trường không bắt buộc `answers[].previousContent` (nội dung cũ). Câu đã có người làm chỉ nhận cách viết mới nếu nội dung cũ khớp đúng phương án đang lưu ở cùng vị trí, nên phương án bị đảo chỗ vẫn bị chặn. `build_python_import.py` khai báo cách viết cũ cho mọi phương án điền khuyết, để database đã import bản cũ (máy dev, Railway) cập nhật được. Không xoá bài làm nào; trên máy dev có 41 câu điền khuyết đã có người làm, cập nhật được hết.

### D-027 · Thời gian lưu theo UTC · Đã chốt (thuộc kế hoạch Phase 2 đã duyệt)
- Entity dùng kiểu `Instant`; Hibernate tự điền `created_at` / `updated_at` (`@CreationTimestamp`, `@UpdateTimestamp`); `hibernate.jdbc.time_zone = UTC`.
- Connector/J được đặt `connectionTimeZone=UTC` và `forceConnectionTimeZoneToSession=true`, nên phiên MySQL cũng dùng UTC: giá trị mặc định `CURRENT_TIMESTAMP(6)` trong bảng khớp với giá trị Hibernate ghi. Hai thuộc tính này nằm trong `spring.datasource.hikari.data-source-properties` (`application.yml`), không nằm trong URL, để profile `test` (có URL riêng) cũng được áp dụng.
- Khoá `hibernate.jdbc.time_zone` viết trong ngoặc vuông (`"[hibernate.jdbc.time_zone]"`), vì Spring có thể bỏ dấu `_` trong khoá của Map.
- Test: `SubjectRepositoryTest` kiểm tra `@@session.time_zone` là UTC, và thời gian lưu/đọc lại khớp giờ UTC.
- Frontend chịu trách nhiệm đổi sang giờ Việt Nam khi hiển thị.

---

## C. Cần bạn quyết định

Đã quyết: Q-01 → D-018 · Q-02 → D-019 · Q-04 → D-022, D-026 · Q-05 → D-020 (Claude xác định đáp án) · Q-06, Q-08, Q-09 → D-037 · Q-13 → D-038 · Q-11 → D-008 · Q-15: commit đầu tiên ngày 2026-09-30 khi Phase 1 được duyệt (chưa có repo GitHub). Q-03: G1–G3, P1, P2, P4 đã quyết; các mục còn lại vẫn mở.

| ID | Câu hỏi | Đề xuất của tôi | Cần trước |
|---|---|---|---|
| Q-03 | Các điểm còn mở trong tài liệu: G4, G5, P5–P14 | Xem [source-material-analysis.md](source-material-analysis.md) | Phase 4 |
| Q-07 | Đăng nhập bằng session cookie hay JWT? | Session cookie HttpOnly + CSRF (có sẵn trong Spring Security, ít code tự viết, phù hợp SPA chạy cùng origin qua proxy). JWT khi có app mobile riêng | Phase 7 |
| Q-10 | Công cụ trích xuất PDF | Script **Python + PyMuPDF** trong `scripts/`, chạy offline, không phải một phần của web app. Đã chứng minh đọc đúng tiếng Việt, màu chữ và highlight khi khảo sát. Lưu ý: cần cài Python cho bước này; PyMuPDF dùng giấy phép AGPL, chấp nhận được vì chỉ là công cụ nội bộ, không đóng gói vào ứng dụng. Phương án thay thế: Java + Apache PDFBox trong backend | Phase 4 |
| Q-12 | Slug/tên môn: `python` – "Nhập môn lập trình Python"; `gdqp` – "Giáo dục quốc phòng và an ninh"? | Như bên trái, chờ G4, G5, P12 | Phase 4 |
| Q-14 | MySQL 8.0 đã hết hỗ trợ theo lịch của Oracle (tháng 4/2026); bản LTS hiện tại là 8.4 | Dev tiếp với 8.0.46; nâng cấp lên 8.4 LTS trước khi triển khai thật | Trước khi deploy |
| Q-15 | ~~Git: tạo commit đầu tiên ngay?~~ Đã commit (2026-09-30). Còn lại: khi nào tạo repo GitHub? | Tạo repo GitHub private khi bạn yêu cầu | Tuỳ bạn |
