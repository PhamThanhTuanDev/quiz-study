package com.quizstudy.exception;

/**
 * Dữ liệu gửi lên sai mà Bean Validation không kiểm tra được vì cần đối chiếu với database, ví dụ phương án
 * được chọn không thuộc câu hỏi. {@link GlobalExceptionHandler} chuyển thành HTTP 400.
 * Thông điệp được hiển thị cho người dùng.
 */
public class InvalidRequestException extends RuntimeException {

    public InvalidRequestException(String message) {
        super(message);
    }
}
