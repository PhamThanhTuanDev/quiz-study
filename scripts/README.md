# scripts/

Công cụ hỗ trợ phát triển, chạy thủ công trên máy. **Không** phải một phần của web app.
Chạy mọi lệnh bên dưới từ thư mục gốc project, trong PowerShell.

## Có sẵn

| Script | Mục đích |
|---|---|
| `setup-database.ps1` | Tạo `.env` (nếu chưa có), sinh mật khẩu cho `quiz_app`, rồi chạy [database/init/01-create-database.sql](../database/init/01-create-database.sql) bằng tài khoản `root` |
| `extract_gdqp.py` | Trích xuất câu hỏi môn GDQP từ PDF (**chỉ đọc** PDF) → `database/seed/gdqp/generated/import.json` + `review.md` |
| `import-subject.ps1` | Import một môn vào database dev từ `database/seed/<slug>/generated/import.json` |

## Tạo database (một lần mỗi máy)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-database.ps1
```

MySQL hỏi mật khẩu `root`; script không lưu mật khẩu này. Thêm `-MySqlExe "<đường dẫn>"` nếu không tìm thấy `mysql.exe`.

## Nhập câu hỏi một môn

**1. Môi trường Python (một lần mỗi máy, D-029).** Cần Python 3 (lệnh `py`). Thư viện cài vào `scripts\.venv`, không ảnh hưởng Python chung của máy:

```powershell
py -m venv scripts\.venv
scripts\.venv\Scripts\python -m pip install -r scripts\requirements.txt
```

**2. Trích xuất từ PDF.** File PDF nguồn phải nằm ở thư mục gốc project (không có trong Git, D-019).

```powershell
scripts\.venv\Scripts\python scripts\extract_gdqp.py
```

Script tự kiểm tra (số bài, số câu từng bài, đủ phương án A–D, đúng 1 đáp án, nội dung có nguyên văn trong PDF). Sai ở đâu thì **dừng, không ghi file** và liệt kê lỗi.
Kết quả nằm trong `database/seed/gdqp/generated/` (không commit, D-030). Đọc `review.md` để duyệt các câu đặc biệt.

**3. Import vào database dev** (backend không cần đang chạy):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\import-subject.ps1 -Slug gdqp
```

Môn đã có trong database thì thêm `-Replace` để thay toàn bộ bài và câu hỏi của môn đó. File có lỗi thì không ghi gì và liệt kê mọi lỗi.

Quyết định về dữ liệu (tên môn, tên bài, đáp án của câu tô đỏ không rõ) nằm trong `database/seed/<slug>/subject.json` (có commit). Sửa file này rồi chạy lại bước 2 và 3.

Nguyên tắc xử lý dữ liệu nguồn: [.claude/rules/source-material.md](../.claude/rules/source-material.md).
