package com.networth.service;

import com.networth.model.document.McpApiKeyDocument;
import com.networth.repository.McpApiKeyRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class McpApiKeyServiceTest {

    private final McpApiKeyRepository repository = org.mockito.Mockito.mock(McpApiKeyRepository.class);
    private final McpApiKeyService service = new McpApiKeyService(repository);

    @Test
    void createsOnlyHashedSecretAndVerifiesIt() {
        when(repository.save(any(McpApiKeyDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        McpApiKeyService.CreatedKey created = service.create("user-1", "Hermes",
                List.of("financial:summary"), Instant.now().plusSeconds(3_600));

        ArgumentCaptor<McpApiKeyDocument> captor = ArgumentCaptor.forClass(McpApiKeyDocument.class);
        org.mockito.Mockito.verify(repository).save(captor.capture());
        McpApiKeyDocument stored = captor.getValue();
        assertFalse(stored.getSecretHash().isBlank());
        assertNotEquals(created.plaintextKey(), stored.getSecretHash());

        when(repository.findByKeyId(stored.getKeyId())).thenReturn(Optional.of(stored));
        assertEquals("user-1", service.verify(created.plaintextKey(), "financial:summary").userId());
    }

    @Test
    void rejectsExpiredOrRevokedKeys() {
        when(repository.save(any(McpApiKeyDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));
        McpApiKeyService.CreatedKey created = service.create("user-1", "Hermes",
                List.of("financial:summary"), Instant.now().plusSeconds(3_600));

        McpApiKeyDocument stored = created.key();
        String keyId = created.plaintextKey().split("\\.", 2)[0];
        stored.setKeyId(keyId);
        stored.setExpiresAt(Instant.now().minusSeconds(1));
        when(repository.findByKeyId(keyId)).thenReturn(Optional.of(stored));
        assertThrows(McpApiKeyService.InvalidMcpApiKeyException.class,
                () -> service.verify(created.plaintextKey(), "financial:summary"));

        stored.setExpiresAt(Instant.now().plusSeconds(3_600));
        stored.setRevokedAt(Instant.now());
        assertThrows(McpApiKeyService.InvalidMcpApiKeyException.class,
                () -> service.verify(created.plaintextKey(), "financial:summary"));
    }
}