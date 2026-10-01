package com.quizstudy.service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

import org.springframework.stereotype.Component;

/** Rút ngẫu nhiên các câu khác nhau cho một lượt làm. */
@Component
public class QuestionDrawer {

    private final Random random;

    public QuestionDrawer() {
        this(new SecureRandom());
    }

    /** Cho test truyền vào Random có seed cố định. */
    QuestionDrawer(Random random) {
        this.random = random;
    }

    /**
     * @param candidateIds   id các câu có thể rút (không trùng)
     * @param count          số câu cần; phạm vi có ít câu hơn thì lấy hết
     * @param shuffleOrder   true: thứ tự câu ngẫu nhiên; false: giữ thứ tự id (thứ tự trong tài liệu)
     */
    public List<Long> draw(List<Long> candidateIds, int count, boolean shuffleOrder) {
        List<Long> pool = new ArrayList<>(candidateIds);
        Collections.shuffle(pool, random);
        List<Long> drawn = new ArrayList<>(pool.subList(0, Math.min(count, pool.size())));
        if (!shuffleOrder) {
            Collections.sort(drawn);
        }
        return drawn;
    }
}
