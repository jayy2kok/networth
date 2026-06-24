package com.networth.repository;

import com.networth.model.document.MfNavCacheDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface MfNavCacheRepository
        extends MongoRepository<MfNavCacheDocument, String> {

    Optional<MfNavCacheDocument> findBySchemeCode(String schemeCode);
}
