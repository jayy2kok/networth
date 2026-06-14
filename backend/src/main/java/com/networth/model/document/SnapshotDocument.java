package com.networth.model.document;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

/**
 * Monthly net worth snapshot — persisted in the 'snapshots' collection.
 * One document per (userId, snapshotDate). Taking a snapshot on the same day
 * upserts / replaces the existing entry.
 *
 * Phase 4: stores a point-in-time picture of all major financial KPIs so the
 * "Net Worth Over Time" line chart has data to plot.
 */
@Document(collection = "snapshots")
@CompoundIndex(name = "user_date_idx", def = "{'userId': 1, 'snapshotDate': 1}", unique = true)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SnapshotDocument {

    @Id
    private String id;

    /** Reference to users._id */
    private String userId;

    /** The calendar date this snapshot represents (YYYY-MM-DD). */
    private LocalDate snapshotDate;

    // ── Net Worth components ────────────────────────────────────────────────
    private double totalAssets;
    private double totalLiabilities;
    private double netWorth;
    private double liquidAssets;
    private double totalInvestments;
    private double totalRealEstate;

    // ── Income & Budget ─────────────────────────────────────────────────────
    private double savingsRate;       // percent

    // ── Liabilities breakdown ───────────────────────────────────────────────
    private Map<String, Double> liabilitiesBreakdown;   // homeLoans, personalLoans, otherDebts

    // ── FIRE ────────────────────────────────────────────────────────────────
    private double fireAmount;
    private double fireDiff;
    private double runwayMonths;

    @CreatedDate
    private Instant createdAt;
}
