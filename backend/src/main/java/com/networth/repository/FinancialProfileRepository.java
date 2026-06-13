package com.networth.repository;

import com.networth.model.document.FinancialProfileDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface FinancialProfileRepository extends MongoRepository<FinancialProfileDocument, String> {
    Optional<FinancialProfileDocument> findByUserId(String userId);
}
