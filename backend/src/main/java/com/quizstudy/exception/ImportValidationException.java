package com.quizstudy.exception;

import java.util.List;

/** File import không hợp lệ. Chứa toàn bộ lỗi tìm được, để sửa một lần thay vì từng lỗi một. */
public class ImportValidationException extends RuntimeException {

    private final List<String> problems;

    public ImportValidationException(List<String> problems) {
        super("File import không hợp lệ (" + problems.size() + " lỗi): " + String.join("; ", problems));
        this.problems = List.copyOf(problems);
    }

    public List<String> getProblems() {
        return problems;
    }
}
