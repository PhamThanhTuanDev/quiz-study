package com.quizstudy.config;

import java.io.IOException;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Khi deploy, bản build của frontend nằm trong {@code classpath:/static/} (Dockerfile chép vào) và được phục vụ
 * cùng API. Frontend là SPA: đường dẫn như {@code /subjects/python} do React Router xử lý trên trình duyệt, không
 * có file tương ứng, nên mở thẳng link hoặc tải lại trang sẽ 404 nếu chỉ phục vụ file. Các đường dẫn đó được trả
 * {@code index.html}.
 *
 * <p>Khi chạy dev (frontend ở Vite, không có {@code static/index.html}) thì không có gì thay đổi.
 */
@Configuration
public class SpaFallbackConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new IndexHtmlFallbackResolver());
    }

    static final class IndexHtmlFallbackResolver extends PathResourceResolver {

        @Override
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
            Resource file = super.getResource(resourcePath, location);
            if (file != null || isApiOrFile(resourcePath)) {
                return file;
            }
            return super.getResource("index.html", location);
        }

        /**
         * API sai đường dẫn phải vẫn trả 404 dạng Problem Details, và file tĩnh bị thiếu (ví dụ file JS của bản
         * build cũ) phải 404 thay vì nhận nhầm HTML.
         */
        private static boolean isApiOrFile(String resourcePath) {
            String lastSegment = resourcePath.substring(resourcePath.lastIndexOf('/') + 1);
            return resourcePath.equals("api") || resourcePath.startsWith("api/") || lastSegment.contains(".");
        }
    }
}
