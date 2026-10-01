package com.quizstudy.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Đồng hồ dùng chung (UTC, D-027). Service lấy giờ qua bean này để test đặt được thời gian (ví dụ hết giờ thi). */
@Configuration
public class ClockConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
