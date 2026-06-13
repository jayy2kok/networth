package com.networth.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

/**
 * Enables @CreatedDate and @LastModifiedDate on all MongoDB documents.
 */
@Configuration
@EnableMongoAuditing
public class MongoConfig {
}
