package com.networth.model.document;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * One document per user — holds all embedded financial data.
 * Collections are initialised to empty lists so callers never get null.
 */
@Document(collection = "financial_profiles")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FinancialProfileDocument {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    @Builder.Default private List<InvestmentEntry> investments = new ArrayList<>();
    @Builder.Default private List<AssetEntry>      assets      = new ArrayList<>();
    @Builder.Default private List<LiabilityEntry>  liabilities = new ArrayList<>();
    @Builder.Default private List<IncomeEntry>     incomes     = new ArrayList<>();
    @Builder.Default private List<ExpenseEntry>    expenses    = new ArrayList<>();

    @LastModifiedDate
    private Instant updatedAt;
}
