package com.networth.model.document;

import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AssetEntry {
    private String id;
    private String name;
    /** REAL_ESTATE | VEHICLE | JEWELRY | GOLD | OTHER */
    private String type;
    private Double acquisitionCost;
    private Double currentValue;
    /** Server-computed via FX API */
    private Double currentValueINR;
    private String currency;
    /** Server-computed: ((currentValue - acquisitionCost) / acquisitionCost) * 100 */
    private Double percentChange;
    private Instant createdAt;
    private Instant updatedAt;
}
