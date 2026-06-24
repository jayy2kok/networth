package com.networth.model.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * NAV cache entry for a single AMFI mutual fund scheme.
 * Stored in `mf_nav_cache` collection — one document per schemeCode.
 * Refreshed every 6 hours by NavRefreshScheduler via mfapi.in.
 */
@Document(collection = "mf_nav_cache")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MfNavCacheDocument {

    @Id
    private String id;

    /** AMFI scheme code (unique key; maps to mfapi.in scheme_code) */
    @Indexed(unique = true)
    private String schemeCode;

    private String schemeName;
    private String fundHouse;
    private String schemeCategory;

    /** ISIN for Growth option (from mfapi.in meta) */
    private String isinGrowth;

    /** Latest NAV value */
    private Double latestNav;

    /** Date string of the latest NAV (DD-MM-YYYY from mfapi.in) */
    private String navDate;

    /** Timestamp of the last successful fetch from mfapi.in */
    private Instant fetchedAt;
}
