package com.networth.model.document;

import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LiabilityEntry {
    private String id;
    private String name;
    /** HOME_LOAN | PERSONAL_LOAN | CAR_LOAN | EDUCATION_LOAN | OTHER */
    private String type;
    private Double outstandingAmount;
    private Double emi;
    private Double roi;
    /** REGULAR | OD */
    private String loanType;
    private String currency;
    private LocalDate firstEmiDate;
    private Integer tenureYears;
    private Integer remainingEmis;
    private Instant createdAt;
    private Instant updatedAt;
}
