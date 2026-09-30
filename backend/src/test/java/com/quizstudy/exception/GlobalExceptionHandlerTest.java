package com.quizstudy.exception;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON;
import static org.springframework.http.MediaType.TEXT_PLAIN;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

// Controller giả chỉ tồn tại trong test, để gây ra từng loại lỗi mà không thêm endpoint vào ứng dụng thật.
@WebMvcTest(controllers = GlobalExceptionHandlerTest.FailingController.class)
@Import(GlobalExceptionHandlerTest.FailingController.class)
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void resourceNotFound_returns404ProblemDetail() throws Exception {
        mockMvc.perform(get("/test/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("Không tìm thấy môn học 'java'"));
    }

    @Test
    void invalidRequestBody_returns400WithEachInvalidField() throws Exception {
        mockMvc.perform(post("/test/items")
                        .contentType(APPLICATION_JSON)
                        .content("{\"name\": \"\", \"quantity\": 0}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Dữ liệu gửi lên không hợp lệ."))
                .andExpect(jsonPath("$.errors.length()").value(2))
                .andExpect(jsonPath("$.errors[?(@.field == 'name')].message").value("Tên không được để trống"))
                .andExpect(jsonPath("$.errors[?(@.field == 'quantity')].message").value("Số lượng phải từ 1 trở lên"));
    }

    @Test
    void invalidRequestParam_returns400WithInvalidParameter() throws Exception {
        mockMvc.perform(get("/test/items").param("page", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Dữ liệu gửi lên không hợp lệ."))
                .andExpect(jsonPath("$.errors.length()").value(1))
                .andExpect(jsonPath("$.errors[0].field").value("page"))
                .andExpect(jsonPath("$.errors[0].message").value("Trang phải từ 1 trở lên"));
    }

    @Test
    void unexpectedException_returns500_withoutInternalDetails() throws Exception {
        mockMvc.perform(get("/test/crash"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentType(APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Máy chủ gặp lỗi. Vui lòng thử lại sau."))
                .andExpect(content().string(not(containsString("chi tiết nội bộ"))));
    }

    /** Lỗi chuẩn của Spring MVC: thông điệp tiếng Việt lấy từ messages.properties. */
    static Stream<Arguments> springMvcErrors() {
        return Stream.of(
                arguments("JSON hỏng",
                        post("/test/items").contentType(APPLICATION_JSON).content("{không phải json"),
                        400, "Không đọc được dữ liệu gửi lên. Hãy kiểm tra định dạng JSON."),
                arguments("tham số sai kiểu", get("/test/items").param("page", "abc"),
                        400, "Giá trị của page không đúng kiểu dữ liệu."),
                arguments("thiếu tham số", get("/test/items"),
                        400, "Thiếu tham số page."),
                arguments("sai phương thức HTTP", delete("/test/items"),
                        405, "Đường dẫn này không hỗ trợ phương thức DELETE."),
                // MockMvc tự thêm charset khi nội dung là chuỗi; thông điệp lặp lại đúng kiểu client gửi.
                arguments("sai kiểu nội dung", post("/test/items").contentType(TEXT_PLAIN).content("abc"),
                        415, "Không hỗ trợ kiểu dữ liệu text/plain;charset=UTF-8."),
                arguments("URL không tồn tại", get("/api/v1/khong-ton-tai"),
                        404, "Không tìm thấy đường dẫn này."));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("springMvcErrors")
    void springMvcError_returnsProblemDetailInVietnamese(String scenario, MockHttpServletRequestBuilder request,
            int expectedStatus, String expectedDetail) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().is(expectedStatus))
                .andExpect(content().contentType(APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value(expectedDetail));
    }

    @RestController
    static class FailingController {

        @GetMapping("/test/not-found")
        void notFound() {
            throw new ResourceNotFoundException("Không tìm thấy môn học 'java'");
        }

        @GetMapping("/test/items")
        void list(@RequestParam @Min(value = 1, message = "Trang phải từ 1 trở lên") int page) {
        }

        @PostMapping("/test/items")
        void create(@Valid @RequestBody CreateItemRequest request) {
        }

        @GetMapping("/test/crash")
        void crash() {
            throw new IllegalStateException("chi tiết nội bộ không được lộ ra ngoài");
        }
    }

    record CreateItemRequest(
            @NotBlank(message = "Tên không được để trống") String name,
            @Min(value = 1, message = "Số lượng phải từ 1 trở lên") int quantity) {
    }
}
