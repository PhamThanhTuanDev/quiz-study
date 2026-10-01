package com.quizstudy.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

import com.quizstudy.entity.Answer;
import com.quizstudy.entity.Question;

/**
 * Thứ tự phương án của một câu trong một lượt làm. Xáo ngẫu nhiên nhưng cố định theo (lượt làm, câu hỏi),
 * nên tải lại trang vẫn đúng thứ tự cũ mà không phải lưu thứ tự vào database.
 * Câu có {@code shuffle_answers = FALSE} (ví dụ "Tất cả đều đúng") giữ nguyên thứ tự gốc.
 */
public final class AnswerShuffler {

    private AnswerShuffler() {
    }

    public static List<Answer> order(String attemptId, Question question) {
        List<Answer> answers = new ArrayList<>(question.getAnswers());
        if (question.isShuffleAnswers()) {
            // String.hashCode và thuật toán của java.util.Random được đặc tả cố định, nên cùng seed luôn cho
            // cùng thứ tự, kể cả sau khi khởi động lại server. Không cần ngẫu nhiên kiểu bảo mật ở đây.
            long seed = (attemptId + ":" + question.getId()).hashCode();
            Collections.shuffle(answers, new Random(seed));
        }
        return answers;
    }
}
