package com.networth.model.document;

import lombok.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

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
    /** METALS | LIQUID | DOMESTIC | INTERNATIONAL */
    @Builder.Default
    private List<String> categories = new ArrayList<>();
    private Instant createdAt;
    private Instant updatedAt;
}
