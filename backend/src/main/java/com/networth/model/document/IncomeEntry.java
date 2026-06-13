package com.networth.model.document;

import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class IncomeEntry {
    private String id;
    /** SALARY | RENTAL | FREELANCE | BUSINESS | OTHER */
    private String source;
    private Double amount;
    private String currency;
    /** Server-computed via FX API */
    private Double amountInr;
    /** MONTHLY | YEARLY | QUARTERLY */
    private String frequency;
    private Instant createdAt;
    private Instant updatedAt;
}
