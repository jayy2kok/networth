package com.networth.service;

import com.networth.model.DashboardSummary;
import com.networth.model.document.SnapshotDocument;
import com.networth.repository.SnapshotRepository;
import com.networth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Phase 4: Manages financial snapshots for historical net worth tracking.
 *
 * <ul>
 *   <li>Manual snapshots via POST /api/snapshots</li>
 *   <li>Monthly auto-snapshots via @Scheduled (1st of each month at midnight)</li>
 *   <li>Deduplication: taking a snapshot on the same day replaces the existing one</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SnapshotService {

    private final SnapshotRepository  snapshotRepo;
    private final CalculationService  calculationService;
    private final UserRepository      userRepo;

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Takes a snapshot for the given user as of today.
     * If a snapshot already exists for today, it is replaced (upsert semantics).
     */
    public SnapshotDocument takeSnapshot(String userId) {
        LocalDate today = LocalDate.now();

        // Calculate current KPIs from live data
        DashboardSummary summary = calculationService.calculate(userId);

        // Build the document
        SnapshotDocument snap = buildSnapshot(userId, today, summary);

        // Upsert: delete existing same-day snapshot then re-save
        Optional<SnapshotDocument> existing =
                snapshotRepo.findByUserIdAndSnapshotDate(userId, today);
        @SuppressWarnings("null")
        String existingId = existing.map(SnapshotDocument::getId).orElse(null);
        if (existingId != null) snapshotRepo.deleteById(existingId);

        @SuppressWarnings("null")
        SnapshotDocument saved = snapshotRepo.save(snap);
        log.info("Snapshot saved for user={} date={} netWorth={}", userId, today, saved.getNetWorth());
        return saved;
    }

    /**
     * Returns all snapshots for a user, ordered oldest → newest (for the line chart).
     */
    public List<SnapshotDocument> getSnapshots(String userId) {
        return snapshotRepo.findByUserIdOrderBySnapshotDateAsc(userId);
    }

    /**
     * Returns the most recent snapshot, or empty if none exist.
     */
    public Optional<SnapshotDocument> getLatest(String userId) {
        return snapshotRepo.findTopByUserIdOrderBySnapshotDateDesc(userId);
    }

    // ── Scheduled auto-snapshot ──────────────────────────────────────────────

    /**
     * Runs at 00:05 on the 1st of every month.
     * Takes a snapshot for every registered user automatically.
     *
     * cron = "second minute hour day-of-month month day-of-week"
     */
    @Scheduled(cron = "0 5 0 1 * *")
    public void monthlyAutoSnapshot() {
        log.info("Running monthly auto-snapshot...");
        @SuppressWarnings("null")
        List<String> allUserIds = userRepo.findAll()
                .stream()
                .map(u -> u.getId())
                .filter(id -> id != null)
                .toList();

        for (String userId : allUserIds) {
            try {
                takeSnapshot(userId);
            } catch (Exception ex) {
                log.error("Auto-snapshot failed for user={}: {}", userId, ex.getMessage(), ex);
            }
        }
        log.info("Monthly auto-snapshot complete. {} users processed.", allUserIds.size());
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private static SnapshotDocument buildSnapshot(String userId,
                                                   LocalDate date,
                                                   DashboardSummary s) {
        return SnapshotDocument.builder()
                .userId(userId)
                .snapshotDate(date)
                .totalAssets(s.getTotalAssets())
                .totalLiabilities(s.getTotalLiabilities())
                .netWorth(s.getNetWorth())
                .liquidAssets(s.getLiquidAssets())
                .totalInvestments(s.getTotalInvestments())
                .totalRealEstate(s.getTotalRealEstate())
                .savingsRate(s.getSavingsRate())
                .liabilitiesBreakdown(s.getLiabilitiesBreakdown())
                .fireAmount(s.getFireAmount())
                .fireDiff(s.getFireDiff())
                .runwayMonths(s.getRunwayMonths())
                .build();
    }
}
