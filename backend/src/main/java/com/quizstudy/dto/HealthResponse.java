package com.quizstudy.dto;

/**
 * Kết quả của GET /api/v1/health.
 *
 * @param status   trạng thái của chính backend
 * @param database trạng thái kết nối tới MySQL
 */
public record HealthResponse(HealthStatus status, HealthStatus database) {
}
