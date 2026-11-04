package com.networth.repository;

import com.networth.model.document.McpApiKeyDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface McpApiKeyRepository extends MongoRepository<McpApiKeyDocument, String> {
    List<McpApiKeyDocument> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<McpApiKeyDocument> findByIdAndUserId(String id, String userId);
    Optional<McpApiKeyDocument> findByKeyId(String keyId);
}