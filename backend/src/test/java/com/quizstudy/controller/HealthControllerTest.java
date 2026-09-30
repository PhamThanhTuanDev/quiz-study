package com.quizstudy.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.quizstudy.dto.HealthResponse;
import com.quizstudy.dto.HealthStatus;
import com.quizstudy.service.HealthService;

@WebMvcTest(HealthController.class)
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private HealthService healthService;

    @Test
    void getHealth_returnsStatusFromService() throws Exception {
        when(healthService.check()).thenReturn(new HealthResponse(HealthStatus.UP, HealthStatus.UP));

        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.database").value("UP"));
    }

    @Test
    void getHealth_returnsOkWithDatabaseDown_whenDatabaseIsUnavailable() throws Exception {
        // Backend vẫn trả lời được, nên HTTP 200; trạng thái database nằm trong body.
        when(healthService.check()).thenReturn(new HealthResponse(HealthStatus.UP, HealthStatus.DOWN));

        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.database").value("DOWN"));
    }
}
