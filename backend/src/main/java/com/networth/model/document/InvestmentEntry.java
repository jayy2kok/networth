package com.networth.model.document;

import lombok.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Unified investment entry stored in financial_profiles.investments[].
 * Covers both manually-entered investments (source=MANUAL) and
 * CAS-imported mutual funds (source=CAS_IMPORT).
 *
 * MF-specific fields (amfiCode, isin, folio, amc, schemeRtaCode, units,
 * latestNav, navDate, navUpdatedAt) are null for MANUAL investments and
 * are suppressed from JSON output by @JsonInclude(NON_NULL).
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class InvestmentEntry {
    private String id;
    private String name;
    /** EQUITY | BONDS | DEBT | ETF | RETIRALS | FIXED_DEPOSITS | CASH_EQUIVALENT */
    private String investmentType;
    private Double investedValue;
    /** Server-computed via FX API */
    private Double investedValueINR;
    private Double currentValue;
    /** Server-computed via FX API */
    private Double currentValueINR;
    private String currency;
    /** MANUAL | CAS_IMPORT */
    @Builder.Default
    private String source = "MANUAL";
    /** True when this investment has linked MutualFundTransactionDocuments */
    @Builder.Default
    private Boolean transactionsLinked = false;
    /** METALS | LIQUID | DOMESTIC | INTERNATIONAL */
    @Builder.Default
    private List<String> categories = new ArrayList<>();
    private Instant createdAt;
    private Instant updatedAt;

    // ─── MF-specific fields (null for MANUAL investments) ────────────────────

    /** AMFI scheme code — used for mfapi.in live NAV pricing */
    private String amfiCode;
    /** ISIN code from CAS statement */
    private String isin;
    /** Folio number from CAS statement */
    private String folio;
    /** Asset Management Company name */
    private String amc;
    /** Scheme RTA code from CAS statement */
    private String schemeRtaCode;
    /** Total units currently held (closing balance from CAS) */
    private Double units;
    /** Latest NAV fetched from mfapi.in */
    private Double latestNav;
    /** Date of the latest NAV (DD-MM-YYYY format from mfapi.in) */
    private String navDate;
    /** Timestamp when the NAV was last fetched from mfapi.in */
    private Instant navUpdatedAt;
}
