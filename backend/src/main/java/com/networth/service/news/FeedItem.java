package com.networth.service.news;

import java.time.Instant;

public record FeedItem(String source, String title, String link, String summary, Instant publishedAt) {
}
