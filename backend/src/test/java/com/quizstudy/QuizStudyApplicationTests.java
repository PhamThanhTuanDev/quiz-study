package com.quizstudy;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

// Test này khởi động toàn bộ ứng dụng nên cần MySQL; profile "test" dùng database quiz_study_test.
@SpringBootTest
@ActiveProfiles("test")
class QuizStudyApplicationTests {

	@Test
	void contextLoads() {
	}

}
