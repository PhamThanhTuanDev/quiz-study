package com.quizstudy.service;

import java.sql.Connection;
import java.sql.SQLException;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.quizstudy.dto.HealthResponse;
import com.quizstudy.dto.HealthStatus;

/** Kiểm tra trạng thái backend và kết nối database cho GET /api/v1/health. */
@Service
public class HealthService {

    private static final Logger log = LoggerFactory.getLogger(HealthService.class);

    /** Thời gian tối đa (giây) chờ database trả lời, để health check không bị treo lâu. */
    private static final int DATABASE_TIMEOUT_SECONDS = 2;

    private final DataSource dataSource;

    public HealthService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public HealthResponse check() {
        return new HealthResponse(HealthStatus.UP, checkDatabase());
    }

    private HealthStatus checkDatabase() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(DATABASE_TIMEOUT_SECONDS) ? HealthStatus.UP : HealthStatus.DOWN;
        } catch (SQLException e) {
            // Database không kết nối được là một trạng thái cần báo (DOWN), không phải lỗi của request.
            log.warn("Database health check failed: {}", e.getMessage());
            return HealthStatus.DOWN;
        }
    }
}
