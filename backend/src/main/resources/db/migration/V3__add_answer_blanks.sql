-- D-048: phương án của câu điền khuyết lưu thêm giá trị từng chỗ trống (theo thứ tự xuất hiện trong code),
-- để giao diện hiển thị mỗi chỗ trống một ô riêng. NULL với phương án thường.
-- content vẫn giữ chữ đầy đủ của phương án (import lại khớp phương án cũ theo content; trình đọc màn hình).
ALTER TABLE answers ADD COLUMN blanks JSON NULL AFTER content;
