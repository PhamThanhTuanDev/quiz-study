-- =====================================================================
-- Quiz Study: tạo database và tài khoản ứng dụng trên MySQL local.
--
-- Chạy bằng scripts/setup-database.ps1 (tài khoản root). Không chạy trực tiếp file này:
-- __QUIZ_APP_PASSWORD__ là placeholder, script thay bằng DB_PASSWORD trong .env lúc chạy
-- và không ghi mật khẩu thật ra file nào.
--
-- Chạy lại nhiều lần vẫn an toàn: không xoá dữ liệu, chỉ đồng bộ mật khẩu và quyền.
-- Bảng do Flyway tạo khi backend khởi động (backend/src/main/resources/db/migration/).
-- =====================================================================

-- Database cho chạy ứng dụng (dev) và database riêng cho test tích hợp.
CREATE DATABASE IF NOT EXISTS quiz_study
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS quiz_study_test
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Tài khoản riêng cho backend, không dùng root.
CREATE USER IF NOT EXISTS 'quiz_app'@'localhost' IDENTIFIED BY '__QUIZ_APP_PASSWORD__';
-- CREATE USER IF NOT EXISTS bỏ qua user đã có; ALTER USER giúp mật khẩu luôn khớp với .env.
ALTER USER 'quiz_app'@'localhost' IDENTIFIED BY '__QUIZ_APP_PASSWORD__';

-- Chỉ có quyền trên hai database của dự án (Flyway cần quyền tạo/sửa bảng).
GRANT ALL PRIVILEGES ON quiz_study.* TO 'quiz_app'@'localhost';
GRANT ALL PRIVILEGES ON quiz_study_test.* TO 'quiz_app'@'localhost';
