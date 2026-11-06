package com.networth.service;

import com.networth.exception.ResourceNotFoundException;
import com.networth.model.document.NewsArticleDocument;
import com.networth.repository.NewsArticleRepository;
import com.networth.service.news.NewsIngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NewsService {

    private final NewsArticleRepository newsRepository;
    private final NewsIngestionService ingestionService;

    public List<NewsArticleDocument> list(String userId) {
        List<NewsArticleDocument> items = new ArrayList<>();
        items.addAll(newsRepository.findByUserIdAndPinnedTrueOrderByPublishedAtDesc(userId));
        items.addAll(newsRepository.findByUserIdAndPinnedFalseAndExpiresAtAfterOrderByPublishedAtDesc(
                userId, Instant.now()));
        items.sort(Comparator.comparing(NewsArticleDocument::getPublishedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return items;
    }

    public NewsArticleDocument setPinned(String userId, String id, boolean pinned) {
        NewsArticleDocument article = newsRepository.findById(id)
                .filter(item -> userId.equals(item.getUserId()))
                .orElseThrow(() -> new ResourceNotFoundException("News article not found: " + id));
        article.setPinned(pinned);
        return newsRepository.save(article);
    }

    public int refresh(String userId) {
        ingestionService.cleanupExpired();
        return ingestionService.ingestForUser(userId);
    }
}
