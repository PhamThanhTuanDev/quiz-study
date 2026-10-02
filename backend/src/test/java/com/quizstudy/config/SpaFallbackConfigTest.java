package com.quizstudy.config;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.quizstudy.controller.HealthController;
import com.quizstudy.service.HealthService;

/** Bản deploy phục vụ frontend từ classpath:/static/ (ở đây là src/test/resources/static/index.html). */
@WebMvcTest(HealthController.class)
class SpaFallbackConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private HealthService healthService;

    @Test
    void appRoute_returnsIndexHtml_soReactRouterCanShowThePage() throws Exception {
        mockMvc.perform(get("/subjects/python"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("spa-index")));
    }

    @Test
    void existingFile_isServedAsItIs() throws Exception {
        mockMvc.perform(get("/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("spa-index")));
    }

    @Test
    void unknownApiPath_stillReturnsProblemDetails404() throws Exception {
        mockMvc.perform(get("/api/v1/khong-co"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Không tìm thấy đường dẫn này."));
    }

    @Test
    void missingFile_returns404_insteadOfIndexHtml() throws Exception {
        mockMvc.perform(get("/assets/khong-co.js"))
                .andExpect(status().isNotFound());
    }
}
