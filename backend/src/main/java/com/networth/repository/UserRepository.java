package com.networth.repository;

import com.networth.model.document.UserDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<UserDocument, String> {
    Optional<UserDocument> findByGoogleId(String googleId);
    Optional<UserDocument> findByEmail(String email);
}
