package com.networth.model.document;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ExpenseEntry {
    private String id;
    private String name;
    /** NEED | WANT | SAVINGS */
    private String category;
    private Double amount;
    /** MONTHLY | YEARLY | QUARTERLY */
    private String frequency;
    private String currency;
    /** Server-computed: normalised to monthly INR */
    private Double monthlyAmountINR;
    /** Server-computed: normalised to annual INR */
    private Double annualAmountINR;
    private Boolean isProjected;
}
