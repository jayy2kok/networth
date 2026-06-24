package com.networth.controller;

import com.networth.filter.DummyUserFilter;
import com.networth.model.document.CasImportResult;
import com.networth.model.document.MutualFundTransactionDocument;
import com.networth.repository.MutualFundTransactionRepository;
import com.networth.service.CasImportService;
import com.networth.service.NavRefreshScheduler;
import com.networth.service.NavRefreshScheduler.NavRefreshResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Mutual Funds")
public class CasImportController {

    private final CasImportService casImportService;
    private final MutualFundTransactionRepository transactionRepository;
    private final NavRefreshScheduler navRefreshScheduler;

    private String uid(HttpServletRequest req) {
        return (String) req.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR);
    }

    // ─── POST /api/cas/import ────────────────────────────────────────────────

    @PostMapping(value = "/api/cas/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(operationId = "importCAS", summary = "Import mutual fund holdings from CAS PDF")
    public ResponseEntity<?> importCas(
            HttpServletRequest req,
            @RequestPart("file")     MultipartFile file,
            @RequestPart("password") String password) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "File is empty"));
        }

        try {
            CasImportResult result = casImportService.importCas(uid(req), file, password);
            return ResponseEntity.ok(result);
        } catch (CasImportService.CasParseException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Failed to read uploaded file: " + e.getMessage()));
        }
    }

    // ─── GET /api/investments/{id}/transactions ──────────────────────────────

    @GetMapping("/api/investments/{id}/transactions")
    @Operation(operationId = "getInvestmentTransactions",
               summary = "Get transaction history for a mutual fund investment")
    public ResponseEntity<List<MutualFundTransactionDocument>> getTransactions(
            @PathVariable String id,
            @RequestParam(required = false, defaultValue = "ALL") String type) {

        List<MutualFundTransactionDocument> txns;
        if ("ALL".equalsIgnoreCase(type)) {
            txns = transactionRepository.findByInvestmentIdOrderByDateDesc(id);
        } else {
            txns = transactionRepository.findByInvestmentIdAndTypeOrderByDateDesc(id, type.toUpperCase());
        }
        return ResponseEntity.ok(txns);
    }

    // ─── POST /api/investments/refresh-nav ──────────────────────────────────

    @PostMapping("/api/investments/refresh-nav")
    @Operation(operationId = "refreshNav",
               summary = "Manually trigger NAV refresh for all CAS-imported investments")
    public ResponseEntity<NavRefreshResult> refreshNav(HttpServletRequest req) {
        NavRefreshResult result = navRefreshScheduler.refreshForUser(uid(req));
        return ResponseEntity.ok(result);
    }
}
