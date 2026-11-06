package com.networth.controller;

import com.networth.filter.DummyUserFilter;
import com.networth.model.document.NewsArticleDocument;
import com.networth.service.NewsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
@Tag(name = "News Analyzer")
public class NewsController {

    private final NewsService newsService;

    private String uid(HttpServletRequest req) {
        return (String) req.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR);
    }

    @GetMapping
    @Operation(operationId = "getNews", summary = "List recent and pinned portfolio news")
    public ResponseEntity<List<NewsArticleDocument>> list(HttpServletRequest req) {
        return ResponseEntity.ok(newsService.list(uid(req)));
    }

    @PatchMapping("/{id}")
    @Operation(operationId = "pinNewsArticle", summary = "Pin or unpin a news article")
    public ResponseEntity<NewsArticleDocument> setPinned(
            HttpServletRequest req,
            @PathVariable String id,
            @RequestBody Map<String, Boolean> body) {
        boolean pinned = Boolean.TRUE.equals(body.get("pinned"));
        return ResponseEntity.ok(newsService.setPinned(uid(req), id, pinned));
    }

    @PostMapping("/refresh")
    @Operation(operationId = "refreshNews", summary = "Fetch and analyze news now")
    public ResponseEntity<Map<String, Object>> refresh(HttpServletRequest req) {
        String userId = uid(req);
        // Feed + article + AI calls can take minutes; do not hold the request.
        Thread.startVirtualThread(() -> newsService.refresh(userId));
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of("started", true));
    }
}
