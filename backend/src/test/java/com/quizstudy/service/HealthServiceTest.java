package com.quizstudy.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.SQLException;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.quizstudy.dto.HealthResponse;
import com.quizstudy.dto.HealthStatus;

@ExtendWith(MockitoExtension.class)
class HealthServiceTest {

    @Mock
    private DataSource dataSource;

    @Mock
    private Connection connection;

    @InjectMocks
    private HealthService healthService;

    @Test
    void check_reportsDatabaseUp_whenConnectionIsValid() throws SQLException {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(true);

        HealthResponse response = healthService.check();

        assertThat(response).isEqualTo(new HealthResponse(HealthStatus.UP, HealthStatus.UP));
        verify(connection).close();
    }

    @Test
    void check_reportsDatabaseDown_whenConnectionIsNotValid() throws SQLException {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(anyInt())).thenReturn(false);

        HealthResponse response = healthService.check();

        assertThat(response).isEqualTo(new HealthResponse(HealthStatus.UP, HealthStatus.DOWN));
        verify(connection).close();
    }

    @Test
    void check_reportsDatabaseDown_whenConnectionCannotBeOpened() throws SQLException {
        when(dataSource.getConnection()).thenThrow(new SQLException("Connection refused"));

        HealthResponse response = healthService.check();

        assertThat(response).isEqualTo(new HealthResponse(HealthStatus.UP, HealthStatus.DOWN));
    }
}
