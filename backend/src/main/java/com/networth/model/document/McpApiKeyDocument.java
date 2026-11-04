package com.networth.model.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/**
 * Verification record for an MCP API key. The plaintext secret is deliberately
 * never persisted: it is only returned when a key is created.
 */
@Document(collection = "mcp_api_keys")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class McpApiKeyDocument {

    @Id
    private String id;

    @Indexed(unique = true)
    private String keyId;

    private String secretHash;
    private String userId;
    private String label;
    private List<String> scopes;
    private Instant expiresAt;
    private Instant revokedAt;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}