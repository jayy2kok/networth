package com.networth.repository;

import com.networth.model.document.NewsArticleDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface NewsArticleRepository extends MongoRepository<NewsArticleDocument, String> {

    List<NewsArticleDocument> findByUserId(String userId);

    List<NewsArticleDocument> findByUserIdAndPinnedTrueOrderByPublishedAtDesc(String userId);

    List<NewsArticleDocument> findByUserIdAndPinnedFalseAndExpiresAtAfterOrderByPublishedAtDesc(
            String userId, Instant now);

    long deleteByPinnedFalseAndExpiresAtBefore(Instant cutoff);
}
