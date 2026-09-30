package com.quizstudy.command;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.quizstudy.dto.SubjectImportFile;
import com.quizstudy.dto.SubjectImportResult;
import com.quizstudy.exception.ImportValidationException;
import com.quizstudy.service.SubjectImportService;

import tools.jackson.databind.json.JsonMapper;

/**
 * Lệnh import một môn từ dòng lệnh. Chỉ chạy khi backend được khởi động với tham số {@code --import=<file>};
 * thêm {@code --replace} để thay toàn bộ nội dung của môn đã có. Cách chạy: scripts/import-subject.ps1.
 *
 * <p>Lỗi được ném ra ngoài để Spring Boot dừng với mã lỗi khác 0, nhờ vậy script gọi lệnh biết là thất bại.
 */
@Component
public class ImportCommandRunner implements ApplicationRunner {

    static final String IMPORT_OPTION = "import";
    static final String REPLACE_OPTION = "replace";

    private static final Logger log = LoggerFactory.getLogger(ImportCommandRunner.class);

    private final SubjectImportService importService;
    private final JsonMapper jsonMapper;

    public ImportCommandRunner(SubjectImportService importService, JsonMapper jsonMapper) {
        this.importService = importService;
        this.jsonMapper = jsonMapper;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!args.containsOption(IMPORT_OPTION)) {
            return;
        }
        Path file = importFile(args.getOptionValues(IMPORT_OPTION));
        boolean replace = args.containsOption(REPLACE_OPTION);
        log.info("Import môn từ {} (replace = {})", file, replace);

        SubjectImportFile content = jsonMapper.readValue(file, SubjectImportFile.class);
        try {
            SubjectImportResult result = importService.importSubject(content, replace);
            log.info("Đã import môn '{}': {} bài, {} câu ({} câu PUBLISHED){}", result.slug(), result.chapterCount(),
                    result.questionCount(), result.publishedCount(),
                    result.replacedExisting() ? ", đã thay nội dung cũ" : "");
        } catch (ImportValidationException ex) {
            log.error("Import thất bại, không ghi gì vào database. {} lỗi:", ex.getProblems().size());
            ex.getProblems().forEach(problem -> log.error("  - {}", problem));
            throw ex;
        }
    }

    private static Path importFile(List<String> values) {
        if (values.size() != 1 || values.getFirst().isBlank()) {
            throw new IllegalArgumentException("Cần đúng một đường dẫn: --import=<đường dẫn file JSON>");
        }
        Path file = Path.of(values.getFirst()).toAbsolutePath().normalize();
        if (!Files.isRegularFile(file)) {
            throw new IllegalArgumentException("Không tìm thấy file import: " + file);
        }
        return file;
    }
}
