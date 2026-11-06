package com.networth.service.news;

import com.networth.config.NewsProperties;
import com.networth.model.document.FinancialProfileDocument;
import com.networth.model.document.InvestmentEntry;
import com.networth.model.document.NewsArticleDocument;
import com.networth.repository.FinancialProfileRepository;
import com.networth.repository.NewsArticleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Fetches all configured feeds, keeps only portfolio-relevant items,
 * extracts article text, and runs the bounded AI analysis.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NewsIngestionService {

    private final NewsProperties properties;
    private final FeedClient feedClient;
    private final ArticleReader articleReader;
    private final NewsRelevanceMatcher relevanceMatcher;
    private final NewsAiAnalyzer aiAnalyzer;
    private final NewsArticleRepository newsRepository;
    private final FinancialProfileRepository profileRepository;

    public int ingestForUser(String userId) {
        FinancialProfileDocument profile = profileRepository.findByUserId(userId).orElse(null);
        if (profile == null) return 0;

        List<InvestmentEntry> investments = profile.getInvestments();
        if (investments == null || investments.isEmpty()) {
            log.info("News ingestion skipped for user {} — no investments", userId);
            return 0;
        }

        Map<String, FeedItem> candidates = new LinkedHashMap<>();
        for (NewsProperties.Feed feed : properties.getFeeds()) {
            if (!feed.isEnabled()) continue;
            for (FeedItem item : feedClient.fetch(feed)) {
                if (item.title().isBlank() || item.link().isBlank()) continue;
                candidates.putIfAbsent(item.link(), item);
            }
        }

        Instant now = Instant.now();
        Instant oldestAllowed = now.minus(properties.getRetentionDays(), ChronoUnit.DAYS);
        java.util.Set<String> existingLinks = newsRepository.findByUserId(userId).stream()
                .map(NewsArticleDocument::getLink)
                .collect(java.util.stream.Collectors.toSet());
        int created = 0;
        int aiCalls = 0;

        for (FeedItem item : candidates.values()) {
            if (created >= properties.getMaxArticlesPerRun() * 3) break;
            if (existingLinks.contains(item.link())) continue;

            NewsRelevanceMatcher.Relevance relevance =
                    relevanceMatcher.match(item.title(), item.summary(), investments);
            if (!relevance.relevant()) continue;

            Instant publishedAt = item.publishedAt() != null ? item.publishedAt() : now;
            if (publishedAt.isBefore(oldestAllowed)) continue;

            NewsArticleDocument document = NewsArticleDocument.builder()
                    .userId(userId)
                    .source(item.source())
                    .title(item.title())
                    .link(item.link())
                    .summary(item.summary())
                    .publishedAt(publishedAt)
                    .fetchedAt(now)
                    .expiresAt(publishedAt.plus(properties.getRetentionDays(), ChronoUnit.DAYS))
                    .pinned(false)
                    .relevanceScore(relevance.score())
                    .matchedHoldings(relevance.holdings())
                    .matchedTopics(relevance.topics())
                    .analysisStatus("PENDING")
                    .build();

            boolean shouldAnalyze = aiAnalyzer.isConfigured()
                    && aiCalls < properties.getMaxArticlesPerRun();

            if (shouldAnalyze) {
                aiCalls++;
                analyse(document, item, relevance.holdings());
            } else {
                document.setAnalysisStatus(aiAnalyzer.isConfigured() ? "PENDING" : "NOT_CONFIGURED");
                document.setAnalysisSummary(item.summary());
                if (!aiAnalyzer.isConfigured()) {
                    document.setCaveats("AI analysis is not configured. Showing the feed summary only.");
                }
            }

            try {
                newsRepository.save(document);
                created++;
            } catch (DuplicateKeyException e) {
                log.debug("News item already stored for user {}: {}", userId, item.link());
            }
        }

        log.info("News ingestion for user {}: {} stored, {} AI calls", userId, created, aiCalls);
        return created;
    }

    private void analyse(NewsArticleDocument document, FeedItem item, List<String> holdings) {
        ArticleReader.ArticleContent content = articleReader.read(item.link());

        if (content.paywalled()) {
            document.setAnalysisStatus("PAYWALLED");
            document.setAnalysisSummary(item.summary());
            document.setErrorMessage("Article is paywalled; analysis unavailable.");
            return;
        }
        if (content.text().length() < properties.getMinArticleCharacters()) {
            document.setAnalysisStatus("FAILED");
            document.setAnalysisSummary(item.summary());
            document.setErrorMessage("Article content could not be extracted.");
            return;
        }

        try {
            NewsAiAnalyzer.Analysis analysis = aiAnalyzer.analyze(item, content.text(), holdings);
            document.setAnalysisStatus("COMPLETED");
            document.setAnalysisSummary(analysis.summary());
            document.setSentiment(analysis.sentiment());
            document.setEvidence(analysis.evidence());
            document.setCaveats(analysis.caveats());
            document.setAffectedHoldings(analysis.holdings().stream()
                    .map(holding -> NewsArticleDocument.AffectedHolding.builder()
                            .holding(holding.holding())
                            .stance(holding.stance())
                            .hypothesis(holding.hypothesis())
                            .horizon(holding.horizon())
                            .build())
                    .toList());
        } catch (Exception e) {
            log.warn("News analysis failed for {}: {}", item.link(), e.getMessage());
            document.setAnalysisStatus("FAILED");
            document.setAnalysisSummary(item.summary());
            document.setErrorMessage("AI analysis failed: " + e.getMessage());
        }
    }

    public void cleanupExpired() {
        long deleted = newsRepository.deleteByPinnedFalseAndExpiresAtBefore(Instant.now());
        if (deleted > 0) log.info("Deleted {} expired news articles", deleted);
    }
}
