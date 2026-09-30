package com.quizstudy.exception;

/**
 * Không tìm thấy dữ liệu được yêu cầu (ví dụ môn học theo slug). Service ném lỗi này;
 * {@link GlobalExceptionHandler} chuyển thành HTTP 404. Thông điệp được hiển thị cho người dùng.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
