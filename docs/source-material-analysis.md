# Phân tích tài liệu nguồn

> Ngày khảo sát: 2026-09-30
> Phạm vi: 20 file PDF ở thư mục gốc `quiz-study/`.
> Không file nguồn nào bị sửa, đổi tên hay di chuyển. Việc đọc PDF dùng `pdftotext` và PyMuPDF chạy trong thư mục tạm ngoài project; không cài gì vào project.

> **Cập nhật 2026-09-30: chủ dự án đã quyết một số điểm** (chi tiết D-020 → D-022 trong [decisions.md](decisions.md)):
> - **G1** Bài 3 Câu 6: đáp án **C**. **G2** Bài 4 Câu 13: đáp án **A**. **G3**: số thứ tự không quan trọng, đánh số lại được.
> - **P1**: dấu tô trong file Python là **bài làm của chủ dự án, chưa kiểm chứng**, không dùng làm đáp án.
> - **P2**: **Claude xác định đáp án đúng** cho mọi câu Python (câu có code phải chạy thật để kiểm chứng).
> - **P4**: câu điền khuyết **được đưa vào** hệ thống, dưới dạng trắc nghiệm A–D do Claude tạo phương án (D-026).
> - **P3**: giải quyết theo P2 (Claude xác định đáp án đúng).
> - Còn mở: G4, G5, P5–P14.

## 1. Tóm tắt

| Môn | Số file | Định dạng | Số câu (khảo sát) | Đáp án trong tài liệu | Giải thích |
|---|---|---|---|---|---|
| Giáo dục quốc phòng và an ninh | 1 | PDF xuất từ Word, có lớp text | 230 câu / 11 bài | Có: phương án đúng tô **chữ đỏ** | Không có |
| Nhập môn lập trình Python (IPPA233277) | 19 | PDF xuất từ PowerPoint, có lớp text | khoảng 298 câu | Một phần: in đậm, tô đỏ hoặc tô vàng; **khoảng 100 câu trắc nghiệm không có đáp án** | Không có |

Cả hai môn đều đọc được text trực tiếp (không phải ảnh scan), nên có thể trích xuất tự động. Tuy vậy vẫn phải có bước người duyệt.

---

## 2. Giáo dục quốc phòng và an ninh (GDQP)

**File:** `1.CÓ ĐÁP ÁN - CĐ HỆ THỐNG CÂU HỎI ÔN TẬP LT CĐ-ĐH.pdf`: 41 trang, Microsoft Word 2016.

### 2.1 Cấu trúc

```
CÂU HỎI ÔN TẬP
BÀI 1: <TÊN BÀI>              <- chương (in đậm, viết hoa)
Câu 1: <nội dung câu hỏi>     <- câu hỏi (in đậm); đánh số lại từ 1 trong mỗi bài
A. <phương án>                <- phương án, có thể xuống nhiều dòng
B. <phương án>
C. <phương án>                <- phương án đúng: chữ màu đỏ (#FF0000)
D. <phương án>
```

| Thành phần | Cách nhận diện |
|---|---|
| Chương | Dòng in đậm bắt đầu bằng `BÀI <số>:` (tiêu đề có thể dài 2–3 dòng) |
| Câu hỏi | Dòng bắt đầu bằng `Câu <số>:` |
| Phương án | Dòng bắt đầu bằng `A.` `B.` `C.` `D.`. Cả 230 câu đều có đúng 4 phương án |
| Đáp án | Phương án có chữ màu đỏ. Mỗi câu có đúng 1 phương án đỏ (trừ G1, G2 bên dưới) |
| Giải thích | Không có. Chữ nghiêng trong file chỉ là đoạn trích dẫn trong đề |

### 2.2 Danh sách bài

| Bài | Tên | Số câu |
|---|---|---|
| 1 | Đối tượng, nhiệm vụ, phương pháp nghiên cứu môn học | 6 |
| 2 | Quan điểm cơ bản của chủ nghĩa Mác-Lênin, tư tưởng Hồ Chí Minh về chiến tranh, quân đội và bảo vệ Tổ quốc | 30 |
| 3 | Xây dựng nền quốc phòng toàn dân, an ninh nhân dân | 26 |
| 4 | Những vấn đề cơ bản về lịch sử nghệ thuật quân sự Việt Nam | 24 |
| 5 | Xây dựng phong trào toàn dân bảo vệ an ninh Tổ quốc | 10 |
| 6 | Những vấn đề cơ bản về bảo vệ an ninh quốc gia và bảo đảm trật tự an toàn xã hội | 12 |
| 7 | Phòng, chống vi phạm pháp luật về bảo vệ môi trường | 29 |
| 8 | Phòng, chống vi phạm pháp luật về đảm bảo trật tự an toàn giao thông | 19 |
| 9 | Phòng, chống một số loại tội phạm xâm hại danh dự, nhân phẩm của người khác | 18 |
| 10 | An toàn thông tin và phòng, chống vi phạm pháp luật trên không gian mạng | 36 (xem G3) |
| 11 | An ninh phi truyền thống và các mối đe dọa an ninh phi truyền thống ở Việt Nam | 20 |
| | **Tổng** | **230** |

### 2.3 Đặc điểm ảnh hưởng tới thiết kế

- **9 câu có phương án phụ thuộc vị trí** ("Tất cả đều đúng", "Cả 3 đáp án trên", "Cả ba đáp án trên đều sai"). Nếu xáo trộn thứ tự phương án thì những câu này sai nghĩa, nên hệ thống phải tắt xáo trộn cho từng câu loại này.
- Khoảng 8 câu hỏi dạng phủ định ("CHỌN ĐÁP ÁN SAI", "Khẳng định nào sau đây là sai?").
- Khoảng 18 câu có chỗ trống "…" trong đề nhưng vẫn là trắc nghiệm 4 phương án.
- Câu bị ngắt dòng giữa chừng do layout PDF. Khi import chỉ nên chuẩn hoá khoảng trắng/xuống dòng, không sửa chữ.
- `pdftotext` làm hỏng dấu tiếng Việt; PyMuPDF đọc đúng Unicode.
- Ở Bài 9, nhãn "Câu 11:" và "Câu 12:" nằm trong khung chữ hẹp nên khi trích xuất bị tách thành từng ký tự theo chiều dọc. Nội dung câu hỏi vẫn đầy đủ. Đây là lỗi trích xuất, **không phải lỗi tài liệu**, nhưng bộ import phải xử lý.

### 2.4 Điểm chưa rõ, cần bạn xác nhận

| # | Vị trí | Vấn đề |
|---|---|---|
| G1 | Bài 3 – Câu 6 (trang 7) | Phương án C tô đỏ toàn bộ; phương án D chỉ có **dấu chấm cuối câu** màu đỏ. Khả năng cao đáp án là C, nhưng cần bạn xác nhận. |
| G2 | Bài 4 – Câu 13 (trang 13) | Chỉ hai chữ "Tấn công" trong phương án A được tô đỏ, không phải toàn bộ phương án. Cần xác nhận đáp án là A. |
| G3 | Bài 10 | Có **hai câu cùng đánh số "Câu 19"** (câu thứ hai nằm giữa Câu 20 và Câu 21), nên bài có 36 câu nhưng chỉ đánh số tới 35. Đánh số lại, hay giữ số gốc làm tham chiếu? |
| G4 | Tên file | "CĐ" và "LT CĐ-ĐH" nghĩa là gì? Bộ câu hỏi thuộc học phần nào? Điều này ảnh hưởng tới cách đặt tên môn/chương. |
| G5 | Tên môn | Hiển thị là "Giáo dục quốc phòng" hay "Giáo dục quốc phòng và an ninh" (tên dùng trong tài liệu)? |

---

## 3. Nhập môn lập trình Python (IPPA233277)

19 file PDF xuất từ PowerPoint (slide 16:9). Chân slide ghi giảng viên: GV. Phan Thị Thể.

### 3.1 Loại file và quy ước tên

- **Bài giảng (LT):** `[IPPA233277] wXX-cYY_<chủ-đề> (done).pdf`. Là slide lý thuyết; một số file có slide "TRẮC NGHIỆM" ở cuối.
- **Bài tập (HW):** `..._HW ....pdf`. Gồm "Kiến thức lý thuyết", "TRẮC NGHIỆM", "Hướng dẫn thực hiện", "Bài tập vận dụng". Phần bài tập vận dụng là bài lập trình tự luận, không phải trắc nghiệm.
- `wXX` là tuần, `cYY` là chương: c01 Giới thiệu · c02 Khái niệm cơ bản / Kiểu dữ liệu & rẽ nhánh / Cấu trúc lặp · c03 Kiểu dữ liệu phức hợp (list; tuple, set, dictionary) · c04 Hàm, Xử lý chuỗi · c05 Module/library · c06 Class.

### 3.2 Cấu trúc câu hỏi

| Thành phần | Cách nhận diện |
|---|---|
| Vùng trắc nghiệm | Slide có tiêu đề "TRẮC NGHIỆM" / "BÀI TRẮC NGHIỆM" (có thể kèm "– TUPLE", "– SET", "– DICTIONARY") |
| Câu hỏi | Dòng bắt đầu bằng `<số>.`. Slide chia **2 cột**, nên thứ tự text trích ra không theo thứ tự câu; phải tách theo cột |
| Code | Nhiều câu có đoạn code Python (font Consolas, tô màu cú pháp). Phải giữ nguyên thụt lề |
| Phương án | Thường là A–D; có câu chỉ 2–3 phương án, có câu tới A–F hoặc A–H. Nhiều phương án xếp 2–4 cột trên cùng một dòng |
| Giải thích | Không có |

Có 3 dạng câu hỏi:
1. **Trắc nghiệm một đáp án** (đa số).
2. **Trắc nghiệm có hơn một phương án được đánh dấu** (1 trường hợp, xem P3).
3. **Điền khuyết**: đề có `…`, đáp án ghi trong ngoặc vuông ngay bên dưới, ví dụ `[if] [==] [:] [else:]`. Dạng này không có phương án A–D, và có câu nhiều chỗ trống.

### 3.3 Cách đánh dấu đáp án (3 kiểu khác nhau)

| Kiểu | Cơ chế kỹ thuật | File |
|---|---|---|
| In đậm | Phương án đúng in đậm; slide đề và slide đáp án đứng liền nhau | w01 LT, w02.1 LT |
| Tô đỏ | *Highlight annotation* thêm vào PDF **sau khi xuất** (không nằm trong slide gốc) | w02.1 HW |
| Tô vàng | Khối nền vàng trong slide gốc; riêng w04.1 HW là highlight annotation thêm sau | các file còn lại |

### 3.4 Thống kê theo file

TN = trắc nghiệm, ĐK = điền khuyết.

| File | Loại | Trang TN | Số câu | Dạng | Đáp án |
|---|---|---|---|---|---|
| w01-c01_gioi-thieu (done) | LT | 8–9 | 4 | TN | In đậm (tr.9; tr.8 là bản đề giống hệt) |
| w02.1-c02_cac-khai-niem-co-ban (done) | LT | 29–30 | 8 | TN | In đậm |
| w02.1-c02_..._HW (choSV) | HW | 3–6 | 32 (đánh số 1–30) | TN | Tô đỏ: 31/32 (thiếu câu 30) |
| w02.2-c02_kieu-du-lieu_cau-truc-re-nhanh (done) | LT | – | 0 | – | – |
| w02.2-c02_..._HW (done) | HW | 3–6 | 20 | 7 ĐK + 13 TN | Tô vàng |
| w02.3-c02_cau-truc-lap (done) | LT | – | 0 | – | – |
| w02.3-c02_..._HW (done) | HW | 3–6 | 20 | 8 ĐK + 12 TN | Tô vàng |
| w03-c03_..._list (done) | LT | – | 0 | – | – |
| w03-c03_..._list_HW (done)-sv | HW | 3–7 | 41 (không có câu 19) | 8 ĐK + 33 TN | ĐK có đáp án trong `[ ]`; **33 câu TN không có đáp án** |
| w04.1-c03_..._tuple_set_dictionary (done) | LT | 11, 20, 28 | 17 | 13 ĐK + 4 TN | Tô vàng |
| w04.1-c03_..._HW (-sv-) | HW | 1–6 | 32 (Tuple 12 · Set 10 · Dict 10) | TN | Chỉ Dictionary câu 1–8 có đáp án; **24 câu không có** |
| w05-c04_ham (done) | LT | 35 | 7 | TN | Tô vàng |
| w05-c04_ham_HW-sv (done) | HW | 2–12 | 49 | 6 ĐK + 43 TN | ĐK có `[ ]`; chỉ câu 49 có đáp án; **42 câu TN không có** |
| w06-c04_xu-ly-chuoi (done) | LT | 16 | 8 | ĐK | Tô vàng |
| w06-c04_..._HW (done) | HW | 2–6 | 30 | TN | Tô vàng |
| w07-c05_..._modules-library (done) | LT | 15 | 4 | ĐK | Tô vàng |
| w07-c05_..._HW (done) | HW | 3 | 10 | TN | Tô vàng |
| w08-w09-c06_class (done) | LT | 32–33 | 6 | ĐK | Tô vàng |
| w08-w09-c06_class_HW (done) | HW | 3–6 | 10 | TN | Tô vàng |
| **Tổng** | | | **≈ 298** | ≈ 60 ĐK + ≈ 238 TN | ≈ 100 câu TN chưa có đáp án |

Số liệu này đếm được khi khảo sát (đếm tự động và xem trực tiếp từng trang); số chính xác sẽ chốt ở bước import. Chưa kiểm tra câu trùng nhau giữa file LT và file HW.

### 3.5 Điểm chưa rõ, cần bạn xác nhận

| # | Vị trí | Vấn đề |
|---|---|---|
| P1 | Các file HW | Đáp án được tô là **đáp án chính thức của giảng viên** hay **bài làm của bạn/sinh viên**? w02.1 HW và w04.1 HW dùng highlight thêm sau khi xuất PDF; tên file có "choSV", "-sv-". Nếu là bài làm cá nhân thì có thể có đáp án sai. |
| P2 | w03 HW (33 câu), w04.1 HW (24 câu), w05 HW (42 câu), w02.1 HW câu 30 | **Tài liệu không có đáp án.** Tôi không tự điền. Bạn có thể cung cấp đáp án, hoặc đồng ý để các câu này ở trạng thái nháp/chờ duyệt (không xuất hiện trong bài thi). |
| P3 | w02.2 HW câu 1 | Phương án A và B cùng được tô vàng: câu nhiều đáp án đúng hay đánh dấu nhầm? |
| P4 | ≈ 60 câu điền khuyết | Có đưa vào hệ thống không? Nếu có, người học tự gõ đáp án (so khớp chuỗi) hay dạng "lật thẻ tự kiểm tra"? Nhiều câu có nhiều chỗ trống. |
| P5 | w02.1 HW trang 5 | Số 19 và 20 xuất hiện 2 lần. Hai câu 19 cùng nội dung nhưng phương án C/D đổi chỗ; hai câu 20 là hai câu khác nhau. Ngoài ra câu 18 trùng hệt câu 16. |
| P6 | w02.1 HW câu 30 | Đề thiếu câu lệnh ("Cho biết kết quả của câu lệnh sau:" nhưng không có code) và không có đáp án. |
| P7 | w03 HW | Không có câu số 19 (nhảy từ 18 lên 20). Câu 18 có 6 phương án (A–F). |
| P8 | w04.1 LT trang 11, câu 8 | Hai phương án cùng nhãn "C" (`C. (<value>)` và `C. Đáp án khác`). |
| P9 | w05 HW trang 12 | Có số "50" đứng riêng, không có nội dung câu hỏi. |
| P10 | Tên biến giữa đề và đáp án không khớp | w07 LT câu 3 (`import mymodule` nhưng đáp án `dir(my_module)`); w08 LT câu 6 (`x = Student("Mike")` nhưng đáp án `std.printname()`); w04.1 LT trang 28 câu 2 (đề nói khoá "key", đáp án dùng `car["year"]`). Giữ nguyên hay bạn muốn sửa? |
| P11 | w01 LT câu 4 | Câu phụ thuộc thời điểm ("Tính đến tháng 6/2023, Python phổ biến thứ mấy?"). |
| P12 | Mã học phần | Tên file ghi `IPPA233277`, chân slide ghi `IPPA23327`. Dùng mã nào? |
| P13 | Chia chương | Theo `cYY` (6 chương) hay theo từng bài/tuần (12 chủ đề)? Chương c04 gồm cả "Hàm" và "Xử lý chuỗi". |
| P14 | Bài tập vận dụng (tự luận) | Không phải trắc nghiệm, nên tôi đề xuất **chưa** đưa vào hệ thống ở giai đoạn đầu. Bạn đồng ý không? |

---

## 4. Nguyên tắc xử lý dữ liệu nguồn (đề xuất)

1. File PDF gốc là **chỉ đọc**: không sửa, không đổi tên, không di chuyển khi chưa được bạn đồng ý.
2. Không tự thêm hay sửa đáp án bằng kiến thức bên ngoài. Câu thiếu đáp án hoặc đáp án còn nghi vấn được lưu với trạng thái `DRAFT` / `NEEDS_REVIEW` kèm ghi chú lý do, và không xuất hiện trong bài thi cho tới khi bạn duyệt.
3. Khi import chỉ chuẩn hoá khoảng trắng/xuống dòng do layout PDF; giữ nguyên chữ, dấu câu, kể cả lỗi chính tả gốc. Muốn sửa chỗ nào thì bạn quyết định từng trường hợp.
4. Mỗi câu hỏi lưu nguồn gốc: tên file, số trang, số câu gốc, để đối chiếu khi cần.
5. Quy trình: PDF → script trích xuất → file dữ liệu trung gian (JSON) → **bạn duyệt** → import vào MySQL. Chi tiết ở [database-design.md](database-design.md#7-dữ-liệu-trung-gian-khi-import).
6. Với GDQP, cách đánh dấu nhất quán (chữ đỏ) nên có thể trích xuất tự động gần như hoàn toàn. Với Python, đề xuất làm **bán tự động** (tự động trích xuất + người duyệt từng câu), vì slide 2 cột, có code, và cách đánh dấu không đồng nhất.
