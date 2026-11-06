package com.networth.service.news;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.networth.config.NewsProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Fetches configured feeds. Supports RSS/Atom, a generic HTML link list
 * (Zerodha Pulse), and NSE's JSON corporate-actions endpoint.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FeedClient {

    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/131.0 Safari/537.36";
    private static final String NSE_ACTIONS_PAGE =
            "https://www.nseindia.com/companies-listing/corporate-filings-actions";

    private final NewsProperties properties;
    private final ObjectMapper objectMapper;

    public List<FeedItem> fetch(NewsProperties.Feed feed) {
        if (feed.getUrl() == null || feed.getUrl().isBlank()) return List.of();
        try {
            return switch (feed.getType().toUpperCase(Locale.ROOT)) {
                case "HTML" -> fetchHtmlLinks(feed);
                case "NSE_CORPORATE_ACTIONS" -> fetchNseCorporateActions(feed);
                default -> fetchRss(feed);
            };
        } catch (Exception e) {
            log.warn("News feed {} failed: {}", feed.getName(), e.getMessage());
            return List.of();
        }
    }

    private List<FeedItem> fetchRss(NewsProperties.Feed feed) throws Exception {
        Document doc = Jsoup.connect(feed.getUrl())
                .timeout(properties.getRequestTimeoutMs())
                .userAgent(USER_AGENT)
                .ignoreContentType(true)
                .parser(Parser.xmlParser())
                .get();

        List<FeedItem> items = new ArrayList<>();
        Elements entries = doc.select("item");
        if (entries.isEmpty()) entries = doc.select("entry");

        for (Element entry : entries) {
            String title = text(entry, "title");
            String link = text(entry, "link");
            if (link.isBlank()) {
                Element linkEl = entry.selectFirst("link[href]");
                if (linkEl != null) link = linkEl.attr("href");
            }
            if (title.isBlank() || link.isBlank()) continue;

            String summary = firstNonBlank(
                    text(entry, "description"), text(entry, "summary"), text(entry, "content"));
            Instant published = parseDate(firstNonBlank(
                    text(entry, "pubDate"), text(entry, "published"), text(entry, "updated")));
            items.add(new FeedItem(feed.getName(), title, link, stripHtml(summary), published));
        }
        return items;
    }

    /**
     * Zerodha Pulse is an aggregator without an RSS endpoint. Pull out its
     * article anchors, which point at the original publisher.
     */
    private List<FeedItem> fetchHtmlLinks(NewsProperties.Feed feed) throws Exception {
        Document doc = Jsoup.connect(feed.getUrl())
                .timeout(properties.getRequestTimeoutMs())
                .userAgent(USER_AGENT)
                .get();

        String feedHost = URI.create(feed.getUrl()).getHost();
        Map<String, FeedItem> items = new LinkedHashMap<>();
        for (Element anchor : doc.select("a[href]")) {
            String href = anchor.absUrl("href");
            String title = anchor.text().trim();
            if (href.isBlank() || title.length() < 40) continue;
            if (href.contains(feedHost)) continue;
            if (!href.startsWith("http")) continue;
            items.putIfAbsent(href, new FeedItem(feed.getName(), title, href, "", Instant.now()));
        }
        return new ArrayList<>(items.values());
    }

    /**
     * NSE blocks requests without a browser-like session, so warm a cookie
     * jar against the homepage before calling the JSON API.
     */
    private List<FeedItem> fetchNseCorporateActions(NewsProperties.Feed feed) throws Exception {
        CookieManager cookies = new CookieManager();
        HttpClient client = HttpClient.newBuilder()
                .cookieHandler(cookies)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(java.time.Duration.ofMillis(properties.getRequestTimeoutMs()))
                .build();

        warmNseSession(client);

        HttpRequest request = HttpRequest.newBuilder(URI.create(feed.getUrl()))
                .timeout(java.time.Duration.ofMillis(properties.getRequestTimeoutMs()))
                .header("User-Agent", USER_AGENT)
                .header("Accept", "application/json, text/plain, */*")
                .header("Accept-Language", "en-US,en;q=0.9")
                .header("Referer", NSE_ACTIONS_PAGE)
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new IllegalStateException("NSE returned HTTP " + response.statusCode());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode rows = root.isArray() ? root : root.path("data");
        List<FeedItem> items = new ArrayList<>();
        if (!rows.isArray()) return items;

        for (JsonNode row : rows) {
            String symbol = row.path("symbol").asText("");
            String company = row.path("company").asText("");
            String subject = row.path("subject").asText(row.path("purpose").asText(""));
            if (subject.isBlank()) continue;

            String title = (symbol.isBlank() ? company : symbol) + " — " + subject;
            Instant published = parseDate(firstNonBlank(
                    row.path("exDate").asText(""), row.path("recDate").asText("")));
            String summary = company.isBlank() ? subject : company + ": " + subject;
            items.add(new FeedItem(feed.getName(), title, NSE_ACTIONS_PAGE, summary,
                    published != null ? published : Instant.now()));
        }
        return items;
    }

    private void warmNseSession(HttpClient client) {
        try {
            HttpRequest warmup = HttpRequest.newBuilder(URI.create("https://www.nseindia.com/"))
                    .timeout(java.time.Duration.ofMillis(properties.getRequestTimeoutMs()))
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "text/html,application/xhtml+xml")
                    .GET()
                    .build();
            client.send(warmup, HttpResponse.BodyHandlers.discarding());
        } catch (Exception e) {
            log.debug("NSE session warm-up failed: {}", e.getMessage());
        }
    }

    private static String text(Element parent, String tag) {
        Element el = parent.selectFirst(tag);
        return el == null ? "" : el.text().trim();
    }

    private static String stripHtml(String html) {
        if (html == null || html.isBlank()) return "";
        return Jsoup.parse(html).text();
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return "";
    }

    private static Instant parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String value = raw.trim();
        try {
            return Instant.parse(value);
        } catch (Exception ignored) { /* try next format */ }
        try {
            return OffsetDateTime.parse(value).toInstant();
        } catch (Exception ignored) { /* try next format */ }
        try {
            return ZonedDateTime.parse(value, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();
        } catch (Exception ignored) { /* try next format */ }
        try {
            return ZonedDateTime.parse(value,
                    DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss Z", Locale.ENGLISH)).toInstant();
        } catch (Exception ignored) { /* unparseable date */ }
        try {
            return java.time.LocalDate.parse(value,
                    DateTimeFormatter.ofPattern("dd-MMM-yyyy", Locale.ENGLISH))
                    .atStartOfDay(java.time.ZoneId.of("Asia/Kolkata")).toInstant();
        } catch (Exception ignored) { /* unparseable date */ }
        return null;
    }
}
