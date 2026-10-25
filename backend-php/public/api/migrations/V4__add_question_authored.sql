-- D-053: đánh dấu câu soạn thêm, không lấy từ tài liệu nguồn của môn (ví dụ câu Claude tự soạn từ file tóm tắt,
-- D-049), để giao diện hiện nhãn "Câu tự soạn" cho người học phân biệt với câu của tài liệu.
ALTER TABLE questions ADD COLUMN is_authored BOOLEAN NOT NULL DEFAULT FALSE AFTER review_note;

-- Câu đã import trước migration này: câu trích từ tài liệu đều có số trang, chỉ câu tự soạn (D-049) không có
-- trang. Các lần import sau ghi rõ trường "authored" trong file import.
UPDATE questions SET is_authored = TRUE WHERE source_page IS NULL;
