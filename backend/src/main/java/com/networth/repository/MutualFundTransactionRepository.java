package com.networth.repository;

import com.networth.model.document.MutualFundTransactionDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MutualFundTransactionRepository
        extends MongoRepository<MutualFundTransactionDocument, String> {

    /** All transactions for a single investment, ordered by date descending */
    List<MutualFundTransactionDocument> findByInvestmentIdOrderByDateDesc(String investmentId);

    /** All transactions for a single investment filtered by type, date descending */
    List<MutualFundTransactionDocument> findByInvestmentIdAndTypeOrderByDateDesc(
            String investmentId, String type);

    /** All transactions for a user (used when cascading deletes) */
    List<MutualFundTransactionDocument> findByUserId(String userId);

    /** Delete all transactions for an investment (called when deleting a CAS-imported investment) */
    void deleteByInvestmentId(String investmentId);
}
