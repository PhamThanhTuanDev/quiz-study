package com.quizstudy.dto;

/**
 * Một trường dữ liệu không hợp lệ. Trả về trong thuộc tính {@code errors} của lỗi 400.
 *
 * @param field   tên trường hoặc tham số trong request, ví dụ {@code name}; null nếu lỗi thuộc
 *                cả request (ràng buộc giữa nhiều trường)
 * @param message lý do, hiển thị được cho người dùng
 */
public record InvalidField(String field, String message) {
}
