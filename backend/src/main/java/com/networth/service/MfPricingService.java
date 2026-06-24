package com.networth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networth.model.document.MfNavCacheDocument;
import com.networth.repository.MfNavCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/**
 * Fetches and caches mutual fund NAV data from mfapi.in.
 *
 * API used:
 *   GET https://api.mfapi.in/mf/{schemeCode}/latest
 *     → { "meta": { "scheme_name", "fund_house", "scheme_category", ... },
 *         "data": [ { "date": "20-06-2025", "nav": "892.4560" }, ... ] }
 *
 *   GET https://api.mfapi.in/mf/search?q={query}
 *     → [ { "schemeCode": 125497, "schemeName": "..." }, ... ]
 *
 * Cache TTL: 6 hours (controlled by NavRefreshScheduler for batch refresh,
 * and here for on-demand fetches during CAS import).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MfPricingService {

    private static final long CACHE_TTL_HOURS = 6;

    private final MfNavCacheRepository navCacheRepository;
    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${mfapi.base-url:https://api.mfapi.in}")
    private String mfApiBaseUrl;

    /**
     * Returns the latest NAV for the given AMFI scheme code.
     * Uses cache if the entry is less than 6 hours old; otherwise fetches fresh.
     *
     * @param schemeCode AMFI scheme code (e.g. "125497")
     * @return latest NAV, or null if not found / fetch failed
     */
    public Double fetchLatestNav(String schemeCode) {
        if (schemeCode == null || schemeCode.isBlank()) return null;

        // Check cache
        Optional<MfNavCacheDocument> cached = navCacheRepository.findBySchemeCode(schemeCode);
        if (cached.isPresent()) {
            MfNavCacheDocument cache = cached.get();
            if (cache.getFetchedAt() != null &&
                    cache.getFetchedAt().isAfter(Instant.now().minus(CACHE_TTL_HOURS, ChronoUnit.HOURS))) {
                log.debug("NAV cache hit: schemeCode={} nav={}", schemeCode, cache.getLatestNav());
                return cache.getLatestNav();
            }
        }

        return fetchAndCacheNav(schemeCode);
    }

    /**
     * Force-fetches from mfapi.in regardless of cache state and updates the cache.
     */
    public Double fetchAndCacheNav(String schemeCode) {
        if (schemeCode == null || schemeCode.isBlank()) return null;

        try {
            RestClient client = restClientBuilder.baseUrl(mfApiBaseUrl).build();
            String json = client.get()
                    .uri("/mf/{code}/latest", schemeCode)
                    .retrieve()
                    .body(String.class);

            if (json == null) return null;

            JsonNode root = objectMapper.readTree(json);
            JsonNode meta = root.path("meta");
            JsonNode dataArr = root.path("data");

            if (dataArr.isEmpty()) {
                log.warn("mfapi.in returned empty data for schemeCode={}", schemeCode);
                return null;
            }

            JsonNode latest = dataArr.get(0);
            String navStr = latest.path("nav").asText(null);
            String navDate = latest.path("date").asText(null);
            if (navStr == null) return null;

            double nav = Double.parseDouble(navStr);

            // Upsert cache
            MfNavCacheDocument cacheDoc = navCacheRepository.findBySchemeCode(schemeCode)
                    .orElseGet(() -> MfNavCacheDocument.builder().schemeCode(schemeCode).build());

            cacheDoc.setSchemeName(meta.path("scheme_name").asText(null));
            cacheDoc.setFundHouse(meta.path("fund_house").asText(null));
            cacheDoc.setSchemeCategory(meta.path("scheme_category").asText(null));
            cacheDoc.setIsinGrowth(meta.path("isin_growth").asText(null));
            cacheDoc.setLatestNav(nav);
            cacheDoc.setNavDate(navDate);
            cacheDoc.setFetchedAt(Instant.now());
            navCacheRepository.save(cacheDoc);

            log.info("NAV fetched: schemeCode={} nav={} date={}", schemeCode, nav, navDate);
            return nav;

        } catch (RestClientException e) {
            log.error("HTTP error fetching NAV for schemeCode={}: {}", schemeCode, e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("Error fetching/parsing NAV for schemeCode={}: {}", schemeCode, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Returns the cached nav date string for a scheme (DD-MM-YYYY), or null.
     */
    public String getCachedNavDate(String schemeCode) {
        return navCacheRepository.findBySchemeCode(schemeCode)
                .map(MfNavCacheDocument::getNavDate)
                .orElse(null);
    }

    /**
     * Returns the cached navUpdatedAt for a scheme, or null.
     */
    public Instant getCachedFetchedAt(String schemeCode) {
        return navCacheRepository.findBySchemeCode(schemeCode)
                .map(MfNavCacheDocument::getFetchedAt)
                .orElse(null);
    }
}
