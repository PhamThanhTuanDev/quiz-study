# Tài liệu nguồn và dữ liệu câu hỏi

Áp dụng cho mọi việc liên quan tới file câu hỏi, import dữ liệu, nội dung câu hỏi/đáp án.

- Các file `*.pdf` ở thư mục gốc là **tài liệu nguồn, chỉ đọc**. Không sửa, xoá, đổi tên, di chuyển, ghi đè, kể cả khi "dọn dẹp" thư mục.
- Công cụ trích xuất chỉ **đọc** PDF và ghi kết quả ra file mới (JSON trung gian), không ghi vào PDF.
- Khi import chỉ được chuẩn hoá khoảng trắng/xuống dòng do layout PDF. Giữ nguyên chữ, dấu câu, lỗi chính tả, thứ tự phương án gốc.
- **Đáp án GDQP:** lấy theo chữ đỏ trong tài liệu. Không tự sửa. Đã xác nhận: Bài 3 Câu 6 là C, Bài 4 Câu 13 là A (D-021).
- **Đáp án Python (D-020):** dấu tô đỏ/vàng/đậm trong file Python là bài làm chưa kiểm chứng của chủ dự án, **không dùng làm đáp án**. Claude tự xác định đáp án đúng cho mọi câu Python (kể cả câu không có đáp án và câu điền khuyết):
  - Câu có code: **chạy thật** bằng Python 3 để lấy kết quả; không đoán.
  - Câu lý thuyết: đối chiếu tài liệu chính thức của Python.
  - Mỗi câu ghi lý do/cách kiểm chứng (ví dụ trong `review_note` hoặc file JSON trung gian).
- **Câu điền khuyết (D-026):** chuyển thành trắc nghiệm `SINGLE_CHOICE` 4 phương án A–D. Giữ nguyên đề (kể cả dấu `…`). 1 phương án đúng đã kiểm chứng + 3 phương án sai **đã kiểm chứng là sai** (có code thì chạy thử). Câu nhiều chỗ trống: mỗi phương án ghi đủ các chỗ trống theo thứ tự. `source_label` ghi thêm "(gốc: điền khuyết)"; ghi lý do từng phương án trong JSON trung gian. Không tạo được 3 phương án sai rõ ràng thì để `NEEDS_REVIEW`.
- Câu lỗi đề (thiếu code, trùng nhãn phương án, tên biến không khớp, code không chạy được do dấu nháy cong…) hoặc có hơn một cách hiểu thì để `NEEDS_REVIEW` và liệt kê cho chủ dự án quyết định.
- Số thứ tự câu gốc không quan trọng (D-021). Được đánh số lại, nhưng giữ số gốc trong `source_label`.
- Mỗi câu lưu nguồn gốc: `source_file`, `source_page`, `source_label`.
- Câu có phương án phụ thuộc vị trí ("Tất cả đều đúng", "Cả 3 đáp án trên"…) phải có `shuffle_answers = false`.
- Danh sách điểm chưa rõ đã biết: `docs/source-material-analysis.md` (G1–G5, P1–P14).
