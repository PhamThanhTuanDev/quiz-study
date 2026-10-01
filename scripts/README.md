# scripts/

Công cụ hỗ trợ phát triển, chạy thủ công trên máy. **Không** phải một phần của web app.
Chạy mọi lệnh bên dưới từ thư mục gốc project, trong PowerShell.

## Có sẵn

| Script | Mục đích |
|---|---|
| `setup-database.ps1` | Tạo `.env` (nếu chưa có), sinh mật khẩu cho `quiz_app`, rồi chạy [database/init/01-create-database.sql](../database/init/01-create-database.sql) bằng tài khoản `root` |
| `extract_gdqp.py` | Trích xuất câu hỏi môn GDQP từ PDF (**chỉ đọc** PDF) → `database/seed/gdqp/generated/import.json` + `review.md` |
| `python_source.py` | Thư viện dùng chung của các script môn Python: đọc trang PDF, đánh số dòng theo cột (`L01`, `R01`…) |
| `extract_python_pages.py` | Xuất text đã đánh số dòng + ảnh của mọi trang trắc nghiệm môn Python → `database/seed/python/generated/pages/` (để lập bản đồ vị trí) |
| `build_python_import.py` | Dựng câu hỏi môn Python từ bản đồ vị trí `database/seed/python/questions/bai-NN.json` → `generated/import.json` + `review.md` |
| `verify_python_answers.py` | Kiểm chứng đáp án môn Python bằng cách **chạy thật** code (D-020, D-026) |
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

Môn đã có trong database thì thêm `-Replace` để **cập nhật** môn đó: câu khớp theo nguồn (file + nhãn) được sửa tại chỗ, câu mới được thêm, câu không còn trong file bị xoá nếu chưa ai làm, còn nếu đã có người làm thì chuyển `ARCHIVED` (không xoá). Mỗi lần import cũng tạo/cập nhật đề mặc định (mỗi bài một đề luyện tập, cả môn một đề thi thử; số câu và thời gian trong `backend/src/main/resources/application.yml`, mục `quiz.defaults`). File có lỗi, hoặc có thay đổi không làm an toàn được (ví dụ đổi số phương án của câu đã có người làm), thì không ghi gì và liệt kê mọi lỗi.

Quyết định về dữ liệu (tên môn, tên bài, đáp án của câu tô đỏ không rõ) nằm trong `database/seed/<slug>/subject.json` (có commit). Sửa file này rồi chạy lại bước 2 và 3.

## Môn Python (bản đồ vị trí, D-035)

Slide Python không trích xuất tự động được, nên mỗi câu được ghi **vị trí** (mã dòng) của đề, code, phương án trong `database/seed/python/questions/bai-NN.json`, kèm đáp án, lý do và cách kiểm chứng. Script dựng nội dung từ PDF theo vị trí đó, nên nội dung luôn nguyên văn và không nằm trong Git.

```powershell
$env:PYTHONIOENCODING = 'utf-8'
scripts\.venv\Scripts\python scripts\extract_python_pages.py      # chỉ cần khi lập hoặc sửa bản đồ
scripts\.venv\Scripts\python scripts\build_python_import.py       # thêm --allow-incomplete khi chưa đủ 10 bài
scripts\.venv\Scripts\python scripts\verify_python_answers.py     # hoặc chỉ vài câu: ... w05-hw/4/15
powershell -ExecutionPolicy Bypass -File scripts\import-subject.ps1 -Slug python -Replace
```

- `build_python_import.py` dừng và không ghi file nếu có lỗi: mã dòng sai, dòng của trang trắc nghiệm chưa được dùng (hoặc dùng hai lần), số câu không khớp, câu `PUBLISHED` không có đúng 1 đáp án.
- `verify_python_answers.py` chạy code trong tiến trình Python riêng (thư mục tạm, tối đa 5 giây). Mọi câu `PUBLISHED` phải có kiểm chứng và đều phải đạt.
- Ngoài vị trí, bản đồ có vài chỉnh sửa layout, chỉ thêm hoặc bớt khoảng trắng: `spaceBefore` (chèn một dấu cách khi chữ dính liền trên slide), `softWrap` (nối lại dòng code bị slide tự ngắt vì quá dài), `ignore` (bỏ dòng không phải câu hỏi, phải ghi lý do).

Nguyên tắc xử lý dữ liệu nguồn: [.claude/rules/source-material.md](../.claude/rules/source-material.md).
