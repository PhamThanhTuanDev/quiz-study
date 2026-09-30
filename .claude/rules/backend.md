---
paths:
  - "backend/**"
---
# Quy ước backend (Spring Boot)

## Kiến trúc tầng
- `controller/`: `@RestController`. Map URL `/api/v1/...`, `@Valid` request DTO, gọi **một** Service, trả `ResponseEntity<DTO>`. Không chứa nghiệp vụ, không gọi Repository.
- `service/`: nghiệp vụ và `@Transactional` (đọc thì `readOnly = true`). Không phụ thuộc HTTP (không `HttpServletRequest`, không status code).
- `repository/`: interface Spring Data JPA. Truy vấn phức tạp dùng `@Query` với tham số bind, **không** nối chuỗi SQL.
- `entity/`: `@Entity` ánh xạ đúng bảng trong `docs/database-design.md`. Không serialize Entity ra JSON.
- `dto/`: dùng Java `record` cho request/response. `mapper/`: chuyển Entity ↔ DTO viết tay (không thêm MapStruct/Lombok khi chưa được duyệt).
- `exception/`: exception nghiệp vụ (ví dụ `ResourceNotFoundException`) và một `@RestControllerAdvice` trả `ProblemDetail`.

## Quy tắc
- Inject bằng constructor (field `final`), không dùng `@Autowired` trên field.
- Enum lưu `@Enumerated(EnumType.STRING)`.
- Quan hệ JPA mặc định `LAZY`; tránh N+1 (dùng `JOIN FETCH` / `@EntityGraph` khi cần).
- **Không trả `Answer.isCorrect` trong API làm bài** trước khi nộp. Chấm điểm trong Service.
- Không hard-code môn học; nhận diện môn bằng `slug`/`id` từ dữ liệu.
- Cấu hình nhạy cảm (URL, user, password DB) lấy từ biến môi trường, ví dụ `${DB_PASSWORD}`. Không ghi giá trị thật vào `application.yml`.
- Không log mật khẩu, token, hay nội dung request nhạy cảm.
- Lỗi trả Problem Details, `detail` bằng tiếng Việt:
  - Ràng buộc Bean Validation luôn ghi `message` tiếng Việt, ví dụ `@NotBlank(message = "Tên không được để trống")`.
  - Lỗi chuẩn của Spring MVC: thông điệp trong `src/main/resources/messages.properties` (khoá `problemDetail.<tên exception>`).
  - Service báo không tìm thấy bằng `ResourceNotFoundException`; không tự tạo response lỗi trong controller.

## Test
- Unit test Service: JUnit 5 + Mockito.
- Test Controller: `@WebMvcTest` + MockMvc.
- Test Repository / tích hợp: database test riêng, không dùng database dev.
- Tên test mô tả hành vi, ví dụ `submitAttempt_countsOnlyCorrectAnswers()`.
- Chạy `mvnw.cmd verify` sau khi thay đổi.
