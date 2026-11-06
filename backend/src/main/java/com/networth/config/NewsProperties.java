package com.networth.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * News analyzer configuration. All values are environment-overridable.
 * AI analysis is skipped when no API key is configured.
 */
@Data
@Component
@ConfigurationProperties(prefix = "news")
public class NewsProperties {

    /** Retention window for unpinned articles. */
    private int retentionDays = 7;

    /** Hard cap on AI calls per ingestion run (cost guard). */
    private int maxArticlesPerRun = 20;

    /** Hard cap on characters sent to the model per article. */
    private int maxArticleCharacters = 6000;

    /** Minimum extracted characters before an article is considered readable. */
    private int minArticleCharacters = 300;

    private int requestTimeoutMs = 15000;

    private List<Feed> feeds = new ArrayList<>();

    private Ai ai = new Ai();

    @Data
    public static class Feed {
        private String name;
        /** RSS | HTML | NSE_CORPORATE_ACTIONS */
        private String type = "RSS";
        private String url;
        private boolean enabled = true;
    }

    @Data
    public static class Ai {
        private String baseUrl = "";
        private String model = "";
        private String apiKey = "";
        private double temperature = 0.2;
        private int timeoutMs = 60000;
    }
}
