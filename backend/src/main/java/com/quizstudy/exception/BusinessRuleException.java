package com.quizstudy.exception;

/**
 * Yêu cầu hợp lệ nhưng trái quy tắc nghiệp vụ ở trạng thái hiện tại, ví dụ lưu đáp án khi bài đã nộp,
 * hoặc đổi đáp án đã kiểm tra trong chế độ luyện tập. {@link GlobalExceptionHandler} chuyển thành HTTP 409.
 * Thông điệp được hiển thị cho người dùng.
 */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
