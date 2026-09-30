# backend/

REST API **Java 25 + Spring Boot 4.1.1** (Web, Data JPA, Validation, Flyway; Security từ Phase 7), build bằng **Maven Wrapper**.

> **Trạng thái:** Phase 1. Đã có endpoint `GET /api/v1/health` (`HealthController` → `HealthService`) và test. Cách chạy: [README gốc](../README.md#2-backend-cổng-8080).

## Cấu trúc dự kiến

Package gốc `com.quizstudy` (D-008).

```
backend/
├── pom.xml
├── mvnw, mvnw.cmd, .mvn/          # Maven Wrapper
└── src/
    ├── main/java/com/quizstudy/
    │   ├── QuizStudyApplication.java
    │   ├── config/                # Cấu hình Spring
    │   ├── controller/            # @RestController: nhận request, trả DTO
    │   ├── service/               # Nghiệp vụ, @Transactional
    │   ├── repository/            # Spring Data JPA
    │   ├── entity/                # @Entity
    │   ├── dto/                   # record request/response
    │   ├── mapper/                # Entity <-> DTO
    │   └── exception/             # Exception + @RestControllerAdvice
    ├── main/resources/
    │   ├── application.yml        # Không chứa mật khẩu thật; dùng biến môi trường
    │   └── db/migration/          # Migration Flyway (D-009)
    └── test/java/com/quizstudy/
```

Luồng: **Controller → Service → Repository → Entity**.
Quy ước: [.claude/rules/backend.md](../.claude/rules/backend.md) · Kiến trúc: [docs/architecture.md](../docs/architecture.md)
