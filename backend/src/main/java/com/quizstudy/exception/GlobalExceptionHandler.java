package com.quizstudy.exception;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.quizstudy.dto.InvalidField;

/**
 * Xử lý lỗi tập trung cho mọi controller. Lỗi luôn trả về theo chuẩn Problem Details (RFC 9457),
 * thông điệp ({@code detail}) bằng tiếng Việt để frontend hiển thị được.
 *
 * <p>Lớp cha {@link ResponseEntityExceptionHandler} xử lý các lỗi chuẩn của Spring MVC (sai method,
 * JSON hỏng, sai kiểu tham số…); thông điệp tiếng Việt của chúng nằm trong {@code messages.properties}.
 * Lớp này bổ sung lỗi nghiệp vụ, danh sách trường lỗi khi validate, và lỗi không lường trước.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleResourceNotFound(ResourceNotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ProblemDetail handleBusinessRule(BusinessRuleException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ProblemDetail handleInvalidRequest(InvalidRequestException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    /** Lỗi không lường trước: ghi log đầy đủ ở server, nhưng không gửi chi tiết bên trong cho client. */
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                "Máy chủ gặp lỗi. Vui lòng thử lại sau.");
    }

    /** Request body ({@code @Valid @RequestBody}) không hợp lệ: 400 kèm danh sách trường lỗi. */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<InvalidField> errors = ex.getBindingResult().getAllErrors().stream()
                .map(error -> toInvalidField(error, null))
                .toList();
        return withInvalidFields(ex, errors, headers, status, request);
    }

    /** Tham số URL / query ({@code @RequestParam}, {@code @PathVariable}) vi phạm ràng buộc: 400 kèm danh sách. */
    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(HandlerMethodValidationException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<InvalidField> errors = ex.getParameterValidationResults().stream()
                .flatMap(result -> result.getResolvableErrors().stream()
                        .map(error -> toInvalidField(error, result.getMethodParameter().getParameterName())))
                .toList();
        return withInvalidFields(ex, errors, headers, status, request);
    }

    private <E extends Exception & ErrorResponse> ResponseEntity<Object> withInvalidFields(E ex,
            List<InvalidField> errors, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        // Lấy detail tiếng Việt từ messages.properties, rồi thêm danh sách trường lỗi.
        ProblemDetail problem = ex.updateAndGetBody(getMessageSource(), LocaleContextHolder.getLocale());
        problem.setProperty("errors", errors);
        return handleExceptionInternal(ex, problem, headers, status, request);
    }

    /**
     * Lỗi gắn với một trường thì lấy tên trường đó; lỗi chung (ví dụ ràng buộc giữa nhiều trường)
     * thì dùng {@code fallbackField}, có thể là null.
     */
    private static InvalidField toInvalidField(MessageSourceResolvable error, String fallbackField) {
        String field = (error instanceof FieldError fieldError) ? fieldError.getField() : fallbackField;
        return new InvalidField(field, error.getDefaultMessage());
    }
}
