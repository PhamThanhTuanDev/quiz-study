# Tài liệu nguồn và dữ liệu câu hỏi

Áp dụng cho mọi việc liên quan tới file câu hỏi, import dữ liệu, nội dung câu hỏi/đáp án.

- Các file `*.pdf` ở thư mục gốc là **tài liệu nguồn, chỉ đọc**. Không sửa, xoá, đổi tên, di chuyển, ghi đè, kể cả khi "dọn dẹp" thư mục.
- Công cụ trích xuất chỉ **đọc** PDF và ghi kết quả ra file mới (JSON trung gian), không ghi vào PDF.
- Tài liệu đúng thì giữ nguyên chữ, dấu câu, thứ tự phương án gốc (chỉ chuẩn hoá khoảng trắng/xuống dòng do layout PDF).
- **Câu sai thì sửa cho đúng (D-043, chủ dự án yêu cầu: mục đích là học, miễn đúng):** đề hoặc code sai / không khớp nhau, thiếu code, ký tự in ấn làm code không chạy (nháy cong, "–", thụt lề), không có phương án đúng, có từ 2 phương án cùng đúng, hơn một cách hiểu → Claude tự sửa đề / code / phương án cho đúng và chỉ còn một đáp án, **không** để `NEEDS_REVIEW` chờ duyệt.
  - Sửa ít nhất có thể, giữ ý của câu gốc. Có nhiều phương án đúng thì thay phương án thừa bằng một phương án sai đã kiểm chứng (hoặc thêm phương án "Cả A và B" và tắt xáo trộn).
  - Ghi vết từng chỗ sửa: môn Python dùng mục `edits` trong bản đồ (`database/seed/python/questions/*.json`, xem `scripts/README.md`); `note` hiện cho người học trong phần giải thích ("Đã sửa so với tài liệu: …").
  - Sau khi sửa vẫn kiểm chứng như bình thường (câu có code chạy thật trên nội dung đã sửa).
  - Chỉ hỏi chủ dự án khi không thể biết ý đúng của câu.
- **Đáp án GDQP:** lấy theo chữ đỏ trong tài liệu. Đã xác nhận: Bài 3 Câu 6 là C, Bài 4 Câu 13 là A (D-021). Chỉ sửa khi chắc chắn tài liệu sai, ghi vết như trên.
- **Đáp án Python (D-020):** dấu tô đỏ/vàng/đậm trong file Python là bài làm chưa kiểm chứng của chủ dự án, **không dùng làm đáp án**. Claude tự xác định đáp án đúng cho mọi câu Python (kể cả câu không có đáp án và câu điền khuyết):
  - Câu có code: **chạy thật** bằng Python 3 để lấy kết quả; không đoán.
  - Câu lý thuyết: đối chiếu tài liệu chính thức của Python.
  - Mỗi câu ghi lý do/cách kiểm chứng (ví dụ trong `reason` / `verify` của bản đồ).
- **Câu điền khuyết (D-026):** chuyển thành trắc nghiệm `SINGLE_CHOICE` 4 phương án A–D. Giữ nguyên đề (kể cả dấu `…`). 1 phương án đúng đã kiểm chứng + 3 phương án sai **đã kiểm chứng là sai** (có code thì chạy thử). Một chỗ trống: phương án ghi đúng giá trị cần điền (không bọc ngoặc). Câu nhiều chỗ trống: mỗi phương án ghi đủ các chỗ trống theo thứ tự, đánh số `(1) … · (2) …` (D-046); file import kèm `blanks` (giá trị từng chỗ trống) để giao diện hiện mỗi chỗ trống một ô (D-048). `source_label` ghi thêm "(gốc: điền khuyết)"; ghi lý do từng phương án trong JSON trung gian.
- **Câu Claude tự soạn (D-049)** từ tài liệu chủ dự án đưa (ví dụ file tóm tắt .docx): ghi đủ nội dung trong `database/seed/python/authored/bai-NN.json`, 4 phương án khác nhau, phương án sai lấy từ nhầm lẫn hay gặp; câu có code kiểm chứng kiểu `output` (chạy thật, chỉ đáp án khớp kết quả); lý do hiện cho người học. File tài liệu gốc vẫn là nguồn chỉ đọc, không đưa lên Git.
- Trùng nhãn phương án (hai phương án cùng ghi "C.") thì giữ cả, nhãn tính lại khi hiển thị (D-034).
- Số thứ tự câu gốc không quan trọng (D-021). Được đánh số lại, nhưng giữ số gốc trong `source_label`.
- Mỗi câu lưu nguồn gốc: `source_file`, `source_page`, `source_label`.
- Câu có phương án phụ thuộc vị trí ("Tất cả đều đúng", "Cả 3 đáp án trên"…) phải có `shuffle_answers = false`.
- Danh sách điểm chưa rõ đã biết: `docs/source-material-analysis.md` (G1–G5, P1–P14).
