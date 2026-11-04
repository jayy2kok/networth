package com.networth.controller;

import com.networth.filter.DummyUserFilter;
import com.networth.model.document.McpApiKeyDocument;
import com.networth.service.McpApiKeyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Temporary local-only management endpoint. It uses the existing dummy owner
 * solely for the non-public host workflow until OIDC replaces that filter.
 */
@RestController
@RequestMapping("/api/mcp-keys")
@RequiredArgsConstructor
@Tag(name = "MCP API Keys")
public class McpApiKeyController {

    private final McpApiKeyService service;

    @PostMapping
    @Operation(operationId = "createMcpApiKey", summary = "Create a show-once MCP API key")
    public ResponseEntity<CreatedKeyResponse> create(HttpServletRequest request,
                                                      @Valid @RequestBody CreateKeyRequest body) {
        McpApiKeyService.CreatedKey created = service.create(userId(request), body.label(), body.scopes(), body.expiresAt());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CreatedKeyResponse(toResponse(created.key()), created.plaintextKey()));
    }

    @GetMapping
    @Operation(operationId = "listMcpApiKeys", summary = "List MCP API key metadata")
    public List<KeyResponse> list(HttpServletRequest request) {
        return service.list(userId(request)).stream().map(this::toResponse).toList();
    }

    @DeleteMapping("/{id}")
    @Operation(operationId = "revokeMcpApiKey", summary = "Revoke an MCP API key")
    public ResponseEntity<Void> revoke(HttpServletRequest request, @PathVariable String id) {
        service.revoke(userId(request), id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalidRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
    }

    private String userId(HttpServletRequest request) {
        return (String) request.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR);
    }

    private KeyResponse toResponse(McpApiKeyDocument key) {
        return new KeyResponse(key.getId(), key.getKeyId(), key.getLabel(), key.getScopes(),
                key.getCreatedAt(), key.getExpiresAt(), key.getRevokedAt());
    }

    public record CreateKeyRequest(@NotBlank String label, @NotEmpty List<String> scopes,
                                   @NotNull Instant expiresAt) { }
    public record KeyResponse(String id, String keyId, String label, List<String> scopes,
                              Instant createdAt, Instant expiresAt, Instant revokedAt) { }
    public record CreatedKeyResponse(KeyResponse key, String plaintextKey) { }
}