package com.networth.service.news;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import com.networth.config.NewsProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Calls an OpenAI-compatible chat-completions endpoint.
 * The article text is the only factual source; holdings are supplied only to
 * constrain which names may appear in the response.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NewsAiAnalyzer {

    private static final Set<String> STANCES = Set.of("BUY", "HOLD", "SELL");
    private static final Set<String> SENTIMENTS = Set.of("BULLISH", "BEARISH", "NEUTRAL");

    private final NewsProperties properties;
    private final ObjectMapper objectMapper;

    public record Analysis(String summary, String sentiment, List<NewsArticleDocumentHolder> holdings,
                           List<String> evidence, String caveats) {
        public static Analysis empty() { return new Analysis("", "NEUTRAL", List.of(), List.of(), ""); }
    }

    public record NewsArticleDocumentHolder(String holding, String stance, String hypothesis, String horizon) {
    }

    public boolean isConfigured() {
        NewsProperties.Ai ai = properties.getAi();
        return notBlank(ai.getBaseUrl()) && notBlank(ai.getModel()) && notBlank(ai.getApiKey());
    }

    public Analysis analyze(FeedItem item, String articleText, List<String> matchedHoldings) throws Exception {
        if (!isConfigured()) {
            throw new IllegalStateException("News AI endpoint is not configured");
        }

        String prompt = """
                You are an equity research analyst writing for a long-term Indian retail investor.
                Use ONLY the article text below. Do not use outside facts. If the text does not
                support a conclusion, say "Insufficient evidence" and use stance HOLD.

                Article title: %s
                Article text:
                %s

                Holdings this article may affect (use these exact names only): %s

                Return JSON with this exact shape:
                {
                  "summary": "2-3 sentence factual summary",
                  "sentiment": "BULLISH|BEARISH|NEUTRAL",
                  "affectedHoldings": [
                    {
                      "holding": "exact holding name from the list",
                      "stance": "BUY|HOLD|SELL",
                      "hypothesis": "short causal hypothesis grounded in the article",
                      "horizon": "1-5 years"
                    }
                  ],
                  "evidence": ["short direct quote or close paraphrase from the article"],
                  "caveats": "what the article does not establish"
                }

                Rules:
                - Do not invent holdings, numbers, dates, or events.
                - Limit affectedHoldings to at most 5 entries.
                - Limit evidence to at most 5 short items.
                - Long-term horizon only; no day-trading advice.
                """.formatted(item.title(), articleText, String.join(", ", matchedHoldings));

        ObjectNode request = objectMapper.createObjectNode();
        request.put("model", properties.getAi().getModel());
        request.put("temperature", properties.getAi().getTemperature());
        request.putObject("response_format").put("type", "json_object");

        ArrayNode messages = request.putArray("messages");
        messages.addObject().put("role", "system")
                .put("content", "You extract evidence-grounded investment hypotheses. Reply with JSON only.");
        messages.addObject().put("role", "user").put("content", prompt);

        String baseUrl = properties.getAi().getBaseUrl().replaceAll("/+$", "");
        HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(baseUrl + "/chat/completions"))
                .version(HttpClient.Version.HTTP_1_1)
                .timeout(Duration.ofMillis(properties.getAi().getTimeoutMs()))
                .header("Authorization", "Bearer " + properties.getAi().getApiKey())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(request)))
                .build();

        HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofMillis(properties.getAi().getTimeoutMs()))
                .build();
        long startNanos = System.nanoTime();
        HttpResponse<String> response;
        try {
            response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        } catch (java.io.IOException | InterruptedException e) {
            log.warn("News AI request failed after {} ms: {}", (System.nanoTime() - startNanos) / 1_000_000,
                e.getClass().getSimpleName());
            throw e;
        }
        log.info("News AI response: status={}, version={}, elapsedMs={}", response.statusCode(),
            response.version(), (System.nanoTime() - startNanos) / 1_000_000);
        if (response.statusCode() >= 400) {
            throw new IllegalStateException("AI endpoint returned HTTP " + response.statusCode());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String content = root.path("choices").path(0).path("message").path("content").asText("");
        if (content.isBlank()) throw new IllegalStateException("AI response was empty");

        JsonNode parsed = objectMapper.readTree(stripFences(content));
        String summary = parsed.path("summary").asText("").trim();
        String sentiment = normalise(parsed.path("sentiment").asText("NEUTRAL"), SENTIMENTS, "NEUTRAL");

        List<NewsArticleDocumentHolder> holdings = new ArrayList<>();
        JsonNode affected = parsed.path("affectedHoldings");
        if (affected.isArray()) {
            for (JsonNode node : affected) {
                String holding = node.path("holding").asText("").trim();
                if (holding.isBlank() || !matchesKnownHolding(holding, matchedHoldings)) continue;
                if (holdings.size() >= 5) break;
                holdings.add(new NewsArticleDocumentHolder(
                        holding,
                        normalise(node.path("stance").asText("HOLD"), STANCES, "HOLD"),
                        node.path("hypothesis").asText("Insufficient evidence").trim(),
                        node.path("horizon").asText("1-5 years").trim()));
            }
        }

        List<String> evidence = new ArrayList<>();
        JsonNode evidenceNode = parsed.path("evidence");
        if (evidenceNode.isArray()) {
            for (JsonNode node : evidenceNode) {
                String value = node.asText("").trim();
                if (value.isBlank()) continue;
                evidence.add(value.length() > 300 ? value.substring(0, 300) : value);
                if (evidence.size() >= 5) break;
            }
        }

        return new Analysis(summary, sentiment, holdings, evidence, parsed.path("caveats").asText("").trim());
    }

    private static boolean matchesKnownHolding(String candidate, List<String> holdings) {
        return holdings.stream().anyMatch(known -> known.equalsIgnoreCase(candidate));
    }

    private static String normalise(String value, Set<String> allowed, String fallback) {
        String upper = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        return allowed.contains(upper) ? upper : fallback;
    }

    private static String stripFences(String content) {
        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            int lastFence = trimmed.lastIndexOf("```");
            if (firstNewline >= 0 && lastFence > firstNewline) {
                return trimmed.substring(firstNewline + 1, lastFence).trim();
            }
        }
        return trimmed;
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
