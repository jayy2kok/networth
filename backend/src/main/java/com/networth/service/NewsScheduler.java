package com.networth.service;

import com.networth.repository.FinancialProfileRepository;
import com.networth.service.news.NewsIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Daily portfolio news refresh at 08:00 Asia/Kolkata.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NewsScheduler {

    private final FinancialProfileRepository profileRepository;
    private final NewsIngestionService ingestionService;

    @Scheduled(cron = "${news.refresh-cron:0 0 8 * * *}", zone = "Asia/Kolkata")
    public void refreshDaily() {
        log.info("Daily news refresh started");
        ingestionService.cleanupExpired();
        profileRepository.findAll().forEach(profile -> {
            try {
                ingestionService.ingestForUser(profile.getUserId());
            } catch (Exception e) {
                log.warn("News refresh failed for user {}: {}", profile.getUserId(), e.getMessage());
            }
        });
    }
}
