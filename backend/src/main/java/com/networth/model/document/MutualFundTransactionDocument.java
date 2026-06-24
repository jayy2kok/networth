package com.networth.model.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Individual mutual fund transaction parsed from a CAS statement.
 * Stored in the separate `mutual_fund_transactions` collection.
 * Linked to a parent MFInvestmentEntry via investmentId.
 *
 * Dedup key: investmentId + date + amount + units + description
 */
@Document(collection = "mutual_fund_transactions")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@CompoundIndex(name = "dedup_idx",
               def = "{'investmentId': 1, 'date': 1, 'amount': 1, 'units': 1, 'description': 1}",
               unique = true)
public class MutualFundTransactionDocument {

    @Id
    private String id;

    /** Reference to the parent MFInvestmentEntry.id in financial_profiles */
    @Indexed
    private String investmentId;

    /** userId for quick per-user queries without joining the profile */
    @Indexed
    private String userId;

    /** Transaction date (ISO date: yyyy-MM-dd) */
    private String date;

    /** Human-readable description from CAS (e.g. "Purchase - SIP") */
    private String description;

    /** Transaction amount in INR; null for non-monetary rows (stamp duty, etc.) */
    private Double amount;

    /** Units transacted; null for non-unit rows (taxes, etc.) */
    private Double units;

    /** NAV at which the transaction was executed */
    private Double nav;

    /** Running unit balance after this transaction */
    private Double balance;

    /**
     * Transaction type enum values from the API spec:
     * PURCHASE | PURCHASE_SIP | REDEMPTION | SWITCH_IN | SWITCH_OUT |
     * DIVIDEND_PAYOUT | DIVIDEND_REINVESTMENT | SEGREGATION |
     * STAMP_DUTY_TAX | TDS_TAX | STT_TAX | MISC | REVERSAL
     */
    private String type;

    /** Dividend rate (only for DIVIDEND_* types) */
    private Double dividendRate;

    /** Timestamp when this transaction was imported from CAS */
    private Instant importedAt;
}
