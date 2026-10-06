package com.quizstudy.entity;

import java.util.List;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Lưu danh sách chuỗi vào một cột JSON (ví dụ {@code ["if", "==", ":"]}). Dùng converter thay vì kiểu JSON riêng
 * của Hibernate để không phụ thuộc cách Hibernate chọn thư viện JSON. NULL giữ nguyên là NULL.
 */
@Converter
public class StringListJsonConverter implements AttributeConverter<List<String>, String> {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<String> values) {
        return values == null ? null : JSON.writeValueAsString(values);
    }

    @Override
    public List<String> convertToEntityAttribute(String json) {
        return json == null ? null : List.copyOf(JSON.readValue(json, STRING_LIST));
    }
}
