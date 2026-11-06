package com.networth.service.news;

import com.networth.config.NewsProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.util.List;
import java.util.Locale;

/**
 * Fetches and extracts readable text from a linked article.
 * Rejects non-public URLs so the analyzer cannot be used as an SSRF proxy.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ArticleReader {

    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/131.0 Safari/537.36";

    private static final List<String> PAYWALL_MARKERS = List.of(
            "subscribe to continue", "subscription required", "premium article",
            "sign in to read", "this article is for subscribers", "to continue reading",
            "already a subscriber", "unlock this article");

    private final NewsProperties properties;

    public record ArticleContent(String text, boolean paywalled) {
        public static ArticleContent unreadable() { return new ArticleContent("", false); }
    }

    public ArticleContent read(String url) {
        if (!isSafeUrl(url)) {
            log.debug("Skipping unsafe article URL: {}", url);
            return ArticleContent.unreadable();
        }
        try {
            Document doc = Jsoup.connect(url)
                    .timeout(properties.getRequestTimeoutMs())
                    .userAgent(USER_AGENT)
                    .followRedirects(false)
                    .maxBodySize(2_000_000)
                    .get();

            doc.select("script,style,nav,header,footer,aside,form,iframe,noscript,svg").remove();

            StringBuilder body = new StringBuilder();
            for (Element paragraph : doc.select("article p, main p, .article p, .story p, .content p, p")) {
                String line = paragraph.text();
                if (line.length() < 40) continue;
                if (!body.isEmpty()) body.append('\n');
                body.append(line);
            }
            String text = body.toString();

            if (text.length() < properties.getMinArticleCharacters()) {
                text = doc.body() == null ? "" : doc.body().text();
            }
            String readableText = text.trim();
            if (readableText.length() > properties.getMaxArticleCharacters()) {
                readableText = readableText.substring(0, properties.getMaxArticleCharacters());
            }

            String lowered = readableText.toLowerCase(Locale.ROOT);
            boolean paywalled = PAYWALL_MARKERS.stream().anyMatch(lowered::contains);
            return new ArticleContent(readableText, paywalled);
        } catch (Exception e) {
            log.debug("Article extraction failed for {}: {}", url, e.getMessage());
            return ArticleContent.unreadable();
        }
    }

    private boolean isSafeUrl(String rawUrl) {
        try {
            URI uri = URI.create(rawUrl);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!scheme.equals("http") && !scheme.equals("https")) return false;
            String host = uri.getHost();
            if (host == null || host.isBlank()) return false;

            for (InetAddress address : InetAddress.getAllByName(host)) {
                if (address.isAnyLocalAddress() || address.isLoopbackAddress()
                        || address.isLinkLocalAddress() || address.isSiteLocalAddress()
                        || address.isMulticastAddress()) {
                    return false;
                }
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }


}
