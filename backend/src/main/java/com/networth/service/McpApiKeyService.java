package com.networth.service;

import com.networth.exception.ResourceNotFoundException;
import com.networth.model.document.McpApiKeyDocument;
import com.networth.repository.McpApiKeyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class McpApiKeyService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Set<String> ALLOWED_SCOPES = Set.of(
            "financial:summary", "portfolio:read", "history:read", "budget:read");

    private final McpApiKeyRepository repository;

    public CreatedKey create(String userId, String label, List<String> requestedScopes, Instant expiresAt) {
        if (label == null || label.isBlank()) {
            throw new IllegalArgumentException("label is required");
        }
        if (expiresAt == null || !expiresAt.isAfter(Instant.now())) {
            throw new IllegalArgumentException("expiresAt must be in the future");
        }

        List<String> scopes = requestedScopes == null || requestedScopes.isEmpty()
                ? List.of("financial:summary", "portfolio:read", "history:read", "budget:read")
                : requestedScopes.stream().distinct().toList();
        if (!ALLOWED_SCOPES.containsAll(scopes)) {
            throw new IllegalArgumentException("requested scopes are not allowed");
        }

        String keyId = "nwk_" + UUID.randomUUID().toString().replace("-", "");
        byte[] secretBytes = new byte[32];
        RANDOM.nextBytes(secretBytes);
        String secret = Base64.getUrlEncoder().withoutPadding().encodeToString(secretBytes);
        String plaintextKey = keyId + "." + secret;

        McpApiKeyDocument document = repository.save(McpApiKeyDocument.builder()
                .keyId(keyId)
                .secretHash(sha256(secret))
                .userId(userId)
                .label(label.trim())
                .scopes(scopes)
                .expiresAt(expiresAt)
                .build());
        return new CreatedKey(document, plaintextKey);
    }

    public List<McpApiKeyDocument> list(String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public void revoke(String userId, String id) {
        McpApiKeyDocument key = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("MCP API key not found: " + id));
        if (key.getRevokedAt() == null) {
            key.setRevokedAt(Instant.now());
            repository.save(key);
        }
    }

    public VerifiedKey verify(String plaintextKey, String requiredScope) {
        String[] parts = plaintextKey == null ? new String[0] : plaintextKey.split("\\.", 2);
        if (parts.length != 2) {
            throw new InvalidMcpApiKeyException();
        }
        McpApiKeyDocument key = repository.findByKeyId(parts[0])
                .orElseThrow(InvalidMcpApiKeyException::new);
        if (key.getRevokedAt() != null || !key.getExpiresAt().isAfter(Instant.now())
                || !MessageDigest.isEqual(key.getSecretHash().getBytes(StandardCharsets.US_ASCII),
                sha256(parts[1]).getBytes(StandardCharsets.US_ASCII))
                || (requiredScope != null && !key.getScopes().contains(requiredScope))) {
            throw new InvalidMcpApiKeyException();
        }
        return new VerifiedKey(key.getUserId(), key.getScopes(), key.getKeyId());
    }

    private static String sha256(String value) {
        try {
            return Base64.getUrlEncoder().withoutPadding().encodeToString(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    public record CreatedKey(McpApiKeyDocument key, String plaintextKey) { }
    public record VerifiedKey(String userId, List<String> scopes, String keyId) { }

    public static class InvalidMcpApiKeyException extends RuntimeException { }
}