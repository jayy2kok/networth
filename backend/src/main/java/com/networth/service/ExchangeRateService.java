package com.networth.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;

/**
 * Fetches exchange rates from open.er-api.com with base currency INR.
 * Rates are cached for 1 hour. On failure, stale cache is used (or 1:1 fallback).
 *
 * API: https://open.er-api.com/v6/latest/INR
 * Rate interpretation:  rates["USD"] = 0.01197  → 1 INR = 0.01197 USD
 * Conversion:           amountINR = foreignAmount / rates[currency]
 */
@Service
@Slf4j
public class ExchangeRateService {

    private static final String FX_URL  = "https://open.er-api.com/v6/latest/INR";
    private static final Duration TTL   = Duration.ofHours(1);

    private final RestClient restClient;

    private volatile Map<String, Double> cachedRates = Collections.emptyMap();
    private volatile Instant lastFetched             = Instant.EPOCH;

    public ExchangeRateService() {
        this.restClient = RestClient.builder().build();
    }

    /**
     * Convert {@code amount} from {@code currency} to INR.
     * Returns {@code amount} unchanged when currency is null/INR or conversion fails.
     */
    public double toInr(double amount, String currency) {
        if (currency == null || "INR".equalsIgnoreCase(currency.trim())) return amount;
        refreshIfStale();
        Double rate = cachedRates.get(currency.toUpperCase());
        if (rate == null || rate == 0.0) {
            log.warn("No FX rate for '{}' — treating as INR.", currency);
            return amount;
        }
        return amount / rate;
    }

    private void refreshIfStale() {
        if (Duration.between(lastFetched, Instant.now()).compareTo(TTL) < 0) return;
        synchronized (this) {
            if (Duration.between(lastFetched, Instant.now()).compareTo(TTL) < 0) return;
            try {
                ExRateResponse resp = restClient.get()
                        .uri(FX_URL)
                        .retrieve()
                        .body(ExRateResponse.class);
                if (resp != null && "success".equals(resp.result()) && resp.rates() != null) {
                    cachedRates = Map.copyOf(resp.rates());
                    lastFetched = Instant.now();
                    double usdRate = cachedRates.getOrDefault("USD", 0.0);
                    double inrPerUsd = usdRate > 0 ? 1.0 / usdRate : 0;
                    log.info("FX rates refreshed (base=INR). 1 USD = ₹{}", String.format("%.2f", inrPerUsd));
                }
            } catch (Exception ex) {
                log.warn("FX refresh failed ({}). Stale rates: {} entries.", ex.getMessage(), cachedRates.size());
            }
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ExRateResponse(
            String result,
            @JsonProperty("base_code") String baseCode,
            Map<String, Double> rates
    ) {}
}
