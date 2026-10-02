# Quiz Study

Nền tảng web học tập và luyện thi trắc nghiệm **nhiều môn**. Hai môn đầu tiên: **Nhập môn lập trình Python** và **Giáo dục quốc phòng và an ninh**. Môn mới được thêm dưới dạng dữ liệu, không cần sửa kiến trúc.

> **Trạng thái:** đã dùng được để học: chọn môn → luyện tập từng bài (biết ngay đúng/sai) hoặc thi thử có giờ, xem lại bài làm, lượt làm gần đây. Dùng tốt trên điện thoại và cài được lên màn hình chính (PWA). Chưa có đăng nhập (Phase 7). Tiến độ: [docs/development-plan.md](docs/development-plan.md).

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Frontend | React · Vite · TypeScript · Tailwind CSS · React Router |
| Backend | Java 25 · Spring Boot (Web, Data JPA, Security, Validation) · Maven |
| Database | MySQL |
| Test | JUnit 5 · Spring Boot Test · Vitest + React Testing Library · Playwright |

```
Trình duyệt → React (Vite, TS) → REST /api/v1 → Spring Boot (Controller → Service → Repository → Entity) → MySQL
```

## Cấu trúc thư mục

```
quiz-study/
├── .claude/            # Cấu hình Claude Code: CLAUDE.md, rules/, skills/, agents/ (ECC chọn lọc)
├── frontend/           # React + Vite + TypeScript (scaffold ở Phase 1)
├── backend/            # Spring Boot (scaffold ở Phase 1)
├── database/           # Script SQL hỗ trợ, dữ liệu seed đã duyệt
├── docs/               # Tài liệu dự án
├── scripts/            # Công cụ hỗ trợ (trích xuất câu hỏi từ PDF…)
├── *.pdf               # TÀI LIỆU NGUỒN: chỉ đọc, không sửa/xoá/di chuyển
├── .env.example        # Mẫu biến môi trường (copy thành .env, không commit .env)
├── docker-compose.yml  # Tuỳ chọn: MySQL chạy bằng Docker
└── README.md
```

## Tài liệu

| File | Nội dung |
|---|---|
| [docs/source-material-analysis.md](docs/source-material-analysis.md) | Khảo sát 20 file PDF câu hỏi; điểm chưa rõ cần xác nhận |
| [docs/architecture.md](docs/architecture.md) | Kiến trúc hệ thống, cấu trúc code, quy ước API |
| [docs/database-design.md](docs/database-design.md) | Thiết kế database, ERD |
| [docs/development-plan.md](docs/development-plan.md) | Kế hoạch 10 phase |
| [docs/decisions.md](docs/decisions.md) | Các quyết định đã chốt / đề xuất / cần quyết định |
| [docs/skills.md](docs/skills.md) | Skill & agent Claude Code (ECC) đã cài và lý do |

## Yêu cầu môi trường

- Node.js 22.12+, 24.x hoặc 26+ (yêu cầu của Vitest 5), npm
- JDK 25. Không cần cài Maven: dùng Maven Wrapper `backend/mvnw.cmd`
- MySQL 8.x, cổng 3306
- Git

Chi tiết từng máy đã dùng: [docs/architecture.md](docs/architecture.md#10-môi-trường-phát-triển).

## Chạy dự án (môi trường dev, Windows)

Các lệnh dưới đây chạy trong PowerShell, tính từ thư mục gốc project.

### 1. Tạo database (một lần cho mỗi máy)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-database.ps1
```

Script sẽ:
- tạo `.env` từ `.env.example` nếu chưa có;
- sinh mật khẩu ngẫu nhiên cho user `quiz_app` và ghi vào `.env`;
- chạy [database/init/01-create-database.sql](database/init/01-create-database.sql) bằng tài khoản `root` để tạo database `quiz_study`, `quiz_study_test` và user `quiz_app`.

MySQL sẽ hỏi mật khẩu `root`. Script không lưu mật khẩu này. Chạy lại nhiều lần vẫn an toàn.

### 2. Backend (cổng 8080)

`JAVA_HOME` phải trỏ tới JDK 25. Kiểm tra bằng `echo $env:JAVA_HOME`. Nếu chưa đúng, đặt tạm cho cửa sổ PowerShell đang dùng (đường dẫn tuỳ máy):

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-25.0.4'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Mở http://localhost:8080/api/v1/health, kết quả đúng là `{"status":"UP","database":"UP"}`.

### 3. Frontend (cổng 5173)

Mở một cửa sổ PowerShell khác:

```powershell
cd frontend
npm install        # lần đầu, hoặc khi package.json thay đổi
npm run dev
```

Mở http://localhost:5173. Trang chủ hiện danh sách môn (database mới thì cần nhập câu hỏi trước, xem mục dưới). Vite chuyển các request `/api` sang backend ở cổng 8080.

### Cài lên điện thoại (PWA)

Trình duyệt chỉ cho cài khi trang chạy qua **HTTPS** (hoặc `localhost` trên chính máy đó), nên trên điện thoại hãy mở bản đã deploy, không mở bản dev qua địa chỉ IP trong mạng nhà.

- Android (Chrome): menu ⋮ → "Cài đặt ứng dụng" / "Thêm vào màn hình chính".
- iPhone (Safari): nút Chia sẻ → "Thêm vào MH chính".

Mất mạng vẫn mở được app và thấy thông báo "Bạn đang offline", nhưng không làm bài được (câu hỏi và chấm điểm nằm ở server). Có bản mới thì app hỏi trước khi tải lại.

### Nhập câu hỏi (một lần mỗi máy, hoặc khi dữ liệu thay đổi)

Database mới tạo chưa có câu hỏi. Cần file PDF nguồn ở thư mục gốc (không có trong Git), rồi:

```powershell
py -m venv scripts\.venv
scripts\.venv\Scripts\python -m pip install -r scripts\requirements.txt
scripts\.venv\Scripts\python scripts\extract_gdqp.py
powershell -ExecutionPolicy Bypass -File scripts\import-subject.ps1 -Slug gdqp
```

Giải thích từng bước: [scripts/README.md](scripts/README.md).

### Kiểm tra

| Phần | Thư mục | Lệnh |
|---|---|---|
| Frontend | `frontend/` | `npm run test` · `npm run lint` · `npm run build` |
| Backend | `backend/` | `.\mvnw.cmd verify` (cần MySQL và database `quiz_study_test`) |
| E2E (Playwright) | `frontend/` | `npm run test:e2e`: chạy luồng chính trên khung điện thoại và máy tính bằng Chrome đã cài. Tự bật backend và frontend nếu chưa chạy; cần MySQL đang chạy và đã import ít nhất một môn. Lượt làm tạo ra lúc test là dữ liệu thử trong database dev. |

## Tài liệu nguồn

Các file PDF ở thư mục gốc là tài liệu học tập gốc (câu hỏi ôn tập GDQP; slide và bài tập Python của giảng viên). Chúng là **nguồn chỉ đọc**: nội dung câu hỏi/đáp án được trích xuất sang database, file PDF không bị sửa. Câu trong tài liệu bị sai (đề, code hoặc đáp án) được sửa cho đúng khi đưa vào database, có ghi lại chỗ sửa, và người học thấy ghi chú "Đã sửa so với tài liệu" (D-043). Việc đưa các file này lên GitHub cần cân nhắc bản quyền (xem Q-02 trong [docs/decisions.md](docs/decisions.md)).
