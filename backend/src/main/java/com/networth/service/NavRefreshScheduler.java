package com.networth.service;

import com.networth.model.document.InvestmentEntry;
import com.networth.repository.FinancialProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Scheduled job that refreshes NAV for all CAS-imported mutual fund investments.
 * Runs every 6 hours. Updates currentValue = units × latestNav for each investment.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NavRefreshScheduler {

    private final FinancialProfileRepository profileRepository;
    private final MfPricingService mfPricingService;
    private final ExchangeRateService fxService;

    /**
     * Runs every 6 hours (after an initial 10-minute delay to let the app warm up).
     */
    @Scheduled(initialDelayString = "${nav.refresh.initial-delay-ms:600000}",
               fixedDelayString   = "${nav.refresh.fixed-delay-ms:21600000}")
    public void refreshAllNavs() {
        log.info("NAV refresh scheduled job started");
        int refreshed = 0, failed = 0;

        List<com.networth.model.document.FinancialProfileDocument> profiles =
                profileRepository.findAll();

        for (var profile : profiles) {
            boolean dirty = false;
            for (InvestmentEntry inv : profile.getInvestments()) {
                if (!"CAS_IMPORT".equals(inv.getSource())) continue;
                if (inv.getAmfiCode() == null || inv.getAmfiCode().isBlank()) continue;

                Double nav = mfPricingService.fetchAndCacheNav(inv.getAmfiCode());
                if (nav == null) {
                    log.warn("NAV refresh failed for schemeCode={} investment={}", inv.getAmfiCode(), inv.getId());
                    failed++;
                    continue;
                }

                double units = inv.getUnits() != null ? inv.getUnits() : 0.0;
                double newValue = units * nav;

                inv.setLatestNav(nav);
                inv.setNavDate(mfPricingService.getCachedNavDate(inv.getAmfiCode()));
                inv.setNavUpdatedAt(Instant.now());
                inv.setCurrentValue(newValue);
                inv.setCurrentValueINR(fxService.toInr(newValue, "INR"));
                inv.setUpdatedAt(Instant.now());

                refreshed++;
                dirty = true;
            }
            if (dirty) profileRepository.save(profile);
        }

        log.info("NAV refresh completed: refreshed={} failed={}", refreshed, failed);
    }

    /**
     * Refresh NAV for a single user's CAS investments (called from manual endpoint).
     */
    public NavRefreshResult refreshForUser(String userId) {
        var profileOpt = profileRepository.findByUserId(userId);
        if (profileOpt.isEmpty()) return new NavRefreshResult(0, 0, "No profile found");

        var profile = profileOpt.get();
        int refreshed = 0, failed = 0;
        boolean dirty = false;

        for (InvestmentEntry inv : profile.getInvestments()) {
            if (!"CAS_IMPORT".equals(inv.getSource())) continue;
            if (inv.getAmfiCode() == null || inv.getAmfiCode().isBlank()) continue;

            Double nav = mfPricingService.fetchAndCacheNav(inv.getAmfiCode());
            if (nav == null) { failed++; continue; }

            double units = inv.getUnits() != null ? inv.getUnits() : 0.0;
            double newValue = units * nav;
            inv.setLatestNav(nav);
            inv.setNavDate(mfPricingService.getCachedNavDate(inv.getAmfiCode()));
            inv.setNavUpdatedAt(Instant.now());
            inv.setCurrentValue(newValue);
            inv.setCurrentValueINR(fxService.toInr(newValue, "INR"));
            inv.setUpdatedAt(Instant.now());
            refreshed++;
            dirty = true;
        }

        if (dirty) profileRepository.save(profile);
        return new NavRefreshResult(refreshed, failed, "NAV refreshed for " + refreshed + " investments");
    }

    public record NavRefreshResult(int refreshedCount, int failedCount, String message) {}
}
