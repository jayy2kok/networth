package com.networth.model.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A portfolio-relevant news item plus its grounded AI analysis.
 * One document per user/link pair; expires after the configured retention
 * window unless the owner pins it.
 */
@Document(collection = "news_articles")
@CompoundIndex(name = "user_link_unique", def = "{'userId': 1, 'link': 1}", unique = true)
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class NewsArticleDocument {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String source;
    private String title;
    private String link;
    private String summary;
    private Instant publishedAt;
    private Instant fetchedAt;
    private Instant expiresAt;

    @Builder.Default
    private Boolean pinned = false;

    private Integer relevanceScore;

    @Builder.Default
    private List<String> matchedHoldings = new ArrayList<>();

    @Builder.Default
    private List<String> matchedTopics = new ArrayList<>();

    /** PENDING | COMPLETED | NOT_CONFIGURED | PAYWALLED | FAILED */
    private String analysisStatus;

    private String analysisSummary;
    /** BULLISH | BEARISH | NEUTRAL */
    private String sentiment;

    @Builder.Default
    private List<AffectedHolding> affectedHoldings = new ArrayList<>();

    @Builder.Default
    private List<String> evidence = new ArrayList<>();

    private String caveats;
    private String errorMessage;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AffectedHolding {
        private String holding;
        /** BUY | HOLD | SELL */
        private String stance;
        private String hypothesis;
        private String horizon;
    }
}
