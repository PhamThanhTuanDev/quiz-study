package com.quizstudy.testsupport;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/** Đồng hồ cho test: đứng yên ở một thời điểm, test tự cho chạy tới (ví dụ để thử hết giờ làm bài). */
public class MutableClock extends Clock {

    private Instant now;

    public MutableClock(Instant start) {
        this.now = start;
    }

    public void advance(Duration duration) {
        now = now.plus(duration);
    }

    /** Bean đồng hồ dùng chung giữa các test trong cùng context, nên mỗi test đặt lại từ đầu. */
    public void reset(Instant start) {
        now = start;
    }

    @Override
    public Instant instant() {
        return now;
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        throw new UnsupportedOperationException("Test chỉ dùng UTC");
    }
}
