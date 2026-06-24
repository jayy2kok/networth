package com.networth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networth.model.document.*;
import com.networth.repository.FinancialProfileRepository;
import com.networth.repository.MutualFundTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.*;

/**
 * Orchestrates CAS PDF import:
 * 1. Forward PDF + password to the casparser-sidecar
 * 2. Parse the JSON response (folios → schemes → transactions)
 * 3. For each scheme: create or update an InvestmentEntry (source=CAS_IMPORT) in the user's profile
 * 4. Fetch live NAV from mfapi.in and compute currentValue = units × nav
 * 5. Persist transactions to mutual_fund_transactions collection (dedup via compound index)
 * 6. Return a CasImportResult summary
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CasImportService {

    private final FinancialProfileRepository profileRepository;
    private final MutualFundTransactionRepository transactionRepository;
    private final MfPricingService mfPricingService;
    private final ExchangeRateService fxService;
    private final ObjectMapper objectMapper;

    @Value("${casparser.url:http://localhost:7070}")
    private String casparserUrl;

    // ─── Public API ─────────────────────────────────────────────────────────────

    public CasImportResult importCas(String userId, MultipartFile file, String password)
            throws IOException {

        // 1. Call sidecar
        JsonNode casJson = callSidecar(file, password);

        // 2. Extract top-level meta
        String fileType  = casJson.path("file_type").asText("UNKNOWN");
        String investorName = casJson.path("investor_info").path("name").asText(null);
        JsonNode periodNode = casJson.path("statement_period");
        String periodFrom = periodNode.path("from").asText(null);
        String periodTo   = periodNode.path("to").asText(null);

        // 3. Load or create profile
        FinancialProfileDocument profile = profileRepository.findByUserId(userId)
                .orElseGet(() -> profileRepository.save(
                        FinancialProfileDocument.builder().userId(userId).build()));

        // 4. Process folios
        List<CasImportSchemeResult> schemeResults = new ArrayList<>();
        int totalTxnsAdded   = 0;
        int totalTxnsSkipped = 0;
        List<String> warnings = new ArrayList<>();

        for (JsonNode folio : casJson.path("folios")) {
            String folioNumber = folio.path("folio").asText(null);
            String amc         = folio.path("amc").asText(null);

            for (JsonNode scheme : folio.path("schemes")) {
                CasImportSchemeResult schemeResult =
                        processScheme(userId, profile, folioNumber, amc, scheme, warnings);
                schemeResults.add(schemeResult);
                totalTxnsAdded   += schemeResult.getTransactionsAdded();
                totalTxnsSkipped += schemeResult.getTransactionsSkipped();
            }
        }

        // 5. Save profile (all investments updated in-place)
        profileRepository.save(profile);

        long imported = schemeResults.stream().filter(r -> "IMPORTED".equals(r.getStatus())).count();
        long updated  = schemeResults.stream().filter(r -> "UPDATED".equals(r.getStatus())).count();

        return CasImportResult.builder()
                .fileType(fileType)
                .investorName(investorName)
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .schemesImported((int) imported)
                .schemesUpdated((int) updated)
                .transactionsAdded(totalTxnsAdded)
                .transactionsSkipped(totalTxnsSkipped)
                .schemes(schemeResults)
                .warnings(warnings)
                .build();
    }

    // ─── Private helpers ─────────────────────────────────────────────────────────

    private JsonNode callSidecar(MultipartFile file, String password) throws IOException {
        try {
            // Build multipart body
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            // File part — ByteArrayResource with getFilename() override
            byte[] bytes = file.getBytes();
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "cas.pdf";
            ByteArrayResource resource = new ByteArrayResource(bytes) {
                @Override public String getFilename() { return filename; }
            };
            body.add("file", resource);

            // Password part — plain string
            body.add("password", password);

            // Request headers — set Content-Type to multipart/form-data;
            // RestTemplate's FormHttpMessageConverter will replace this with a
            // boundary-included Content-Type automatically.
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.postForEntity(
                    casparserUrl + "/parse", requestEntity, String.class);

            return objectMapper.readTree(response.getBody());

        } catch (RestClientException e) {
            log.error("Error calling casparser sidecar: {}", e.getMessage());
            throw new CasParseException("CAS parser unavailable or returned an error: " + e.getMessage());
        }
    }

    private CasImportSchemeResult processScheme(
            String userId,
            FinancialProfileDocument profile,
            String folioNumber,
            String amc,
            JsonNode scheme,
            List<String> warnings) {

        String schemeName   = scheme.path("scheme").asText("Unknown Scheme");
        String amfiCode     = scheme.path("amfi").asText(null);
        String isin         = scheme.path("isin").asText(null);
        String rtaCode      = scheme.path("rta_code").asText(null);
        String schemeType   = scheme.path("type").asText("EQUITY");
        String closeStr     = scheme.path("close").asText("0");
        JsonNode valuation  = scheme.path("valuation");
        String costStr      = valuation.path("cost").asText("0");

        double units        = parseDouble(closeStr);
        double investedVal  = parseDouble(costStr);

        // Warn if no AMFI code
        if (amfiCode == null || amfiCode.isBlank()) {
            warnings.add("No AMFI code for scheme: " + schemeName + " (folio: " + folioNumber + ")");
        }

        // Derive investment type from CAS scheme type
        String investmentType = mapSchemeType(schemeType);
        List<String> categories = deriveCategories(schemeType);

        // Find existing investment by folio + (amfiCode or isin)
        InvestmentEntry existing = findExistingInvestment(profile, folioNumber, amfiCode, isin);
        boolean isNew = (existing == null);

        InvestmentEntry entry;
        if (isNew) {
            entry = InvestmentEntry.builder()
                    .id(UUID.randomUUID().toString())
                    .source("CAS_IMPORT")
                    .transactionsLinked(false)
                    .name(schemeName)
                    .investmentType(investmentType)
                    .currency("INR")
                    .folio(folioNumber)
                    .amfiCode(amfiCode)
                    .isin(isin)
                    .amc(amc)
                    .schemeRtaCode(rtaCode)
                    .investedValue(investedVal)
                    .units(units)
                    .categories(categories)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            profile.getInvestments().add(entry);
        } else {
            entry = existing;
            entry.setName(schemeName);
            entry.setInvestedValue(investedVal);
            entry.setUnits(units);
            entry.setAmfiCode(amfiCode);
            entry.setIsin(isin);
            entry.setAmc(amc);
            entry.setSchemeRtaCode(rtaCode);
            entry.setUpdatedAt(Instant.now());
        }

        // Fetch live NAV
        Double nav = null;
        if (amfiCode != null && !amfiCode.isBlank()) {
            nav = mfPricingService.fetchLatestNav(amfiCode);
        }

        double currentVal = 0.0;
        if (nav != null && units > 0) {
            currentVal = units * nav;
            entry.setLatestNav(nav);
            entry.setNavDate(mfPricingService.getCachedNavDate(amfiCode));
            entry.setNavUpdatedAt(mfPricingService.getCachedFetchedAt(amfiCode));
        } else if (nav == null) {
            // Fallback to CAS valuation value
            currentVal = parseDouble(valuation.path("value").asText("0"));
            if (amfiCode != null && !amfiCode.isBlank()) {
                warnings.add("Could not fetch live NAV for " + schemeName + " (amfiCode: " + amfiCode + "); using CAS valuation.");
            }
        }

        entry.setCurrentValue(currentVal);
        entry.setCurrentValueINR(fxService.toInr(currentVal, "INR"));
        entry.setInvestedValueINR(fxService.toInr(investedVal, "INR"));

        // Import transactions
        int[] txnCounts = importTransactions(userId, entry.getId(), scheme.path("transactions"));
        int txnsAdded   = txnCounts[0];
        int txnsSkipped = txnCounts[1];

        if (txnsAdded > 0) {
            entry.setTransactionsLinked(true);
        }

        return CasImportSchemeResult.builder()
                .schemeName(schemeName)
                .folio(folioNumber)
                .amfiCode(amfiCode)
                .status(isNew ? "IMPORTED" : "UPDATED")
                .units(units)
                .currentValue(currentVal)
                .transactionsAdded(txnsAdded)
                .transactionsSkipped(txnsSkipped)
                .warning(amfiCode == null ? "No AMFI code found; live pricing unavailable." : null)
                .build();
    }

    private InvestmentEntry findExistingInvestment(
            FinancialProfileDocument profile, String folio, String amfiCode, String isin) {

        for (InvestmentEntry inv : profile.getInvestments()) {
            if (!"CAS_IMPORT".equals(inv.getSource())) continue;
            boolean folioMatch = folio != null && folio.equals(inv.getFolio());
            if (!folioMatch) continue;
            if (amfiCode != null && amfiCode.equals(inv.getAmfiCode())) return inv;
            if (isin != null && isin.equals(inv.getIsin())) return inv;
        }
        return null;
    }

    private int[] importTransactions(String userId, String investmentId, JsonNode txns) {
        int added = 0, skipped = 0;
        if (txns == null || !txns.isArray()) return new int[]{0, 0};

        for (JsonNode txn : txns) {
            String date        = txn.path("date").asText(null);
            String description = txn.path("description").asText(null);
            Double amount      = nullableDouble(txn, "amount");
            Double units       = nullableDouble(txn, "units");
            Double nav         = nullableDouble(txn, "nav");
            Double balance     = nullableDouble(txn, "balance");
            String type        = mapTransactionType(txn.path("type").asText("MISC"));
            Double dividendRate = nullableDouble(txn, "dividend_rate");

            MutualFundTransactionDocument doc = MutualFundTransactionDocument.builder()
                    .investmentId(investmentId)
                    .userId(userId)
                    .date(date)
                    .description(description)
                    .amount(amount)
                    .units(units)
                    .nav(nav)
                    .balance(balance)
                    .type(type)
                    .dividendRate(dividendRate)
                    .importedAt(Instant.now())
                    .build();

            try {
                transactionRepository.save(doc);
                added++;
            } catch (org.springframework.dao.DuplicateKeyException e) {
                skipped++;
            }
        }
        return new int[]{added, skipped};
    }

    private String mapSchemeType(String casType) {
        if (casType == null) return "EQUITY";
        return switch (casType.toUpperCase()) {
            case "DEBT", "LIQUID", "OVERNIGHT", "MONEY_MARKET" -> "DEBT";
            case "HYBRID" -> "BONDS";
            default -> "EQUITY";
        };
    }

    private List<String> deriveCategories(String schemeType) {
        List<String> cats = new ArrayList<>();
        cats.add("DOMESTIC");
        if (schemeType != null) {
            String upper = schemeType.toUpperCase();
            if (upper.contains("LIQUID") || upper.contains("OVERNIGHT") || upper.contains("MONEY_MARKET")) {
                cats.add("LIQUID");
            }
        }
        return cats;
    }

    private String mapTransactionType(String casType) {
        if (casType == null) return "MISC";
        return switch (casType.toUpperCase()) {
            case "PURCHASE"            -> "PURCHASE";
            case "PURCHASE_SIP"        -> "PURCHASE_SIP";
            case "REDEMPTION"          -> "REDEMPTION";
            case "SWITCH_IN"           -> "SWITCH_IN";
            case "SWITCH_OUT"          -> "SWITCH_OUT";
            case "DIVIDEND_PAYOUT"     -> "DIVIDEND_PAYOUT";
            case "DIVIDEND_REINVESTMENT" -> "DIVIDEND_REINVESTMENT";
            case "SEGREGATION"         -> "SEGREGATION";
            case "STAMP_DUTY_TAX"      -> "STAMP_DUTY_TAX";
            case "TDS_TAX"             -> "TDS_TAX";
            case "STT_TAX"             -> "STT_TAX";
            case "REVERSAL"            -> "REVERSAL";
            default                    -> "MISC";
        };
    }

    private double parseDouble(String s) {
        if (s == null || s.isBlank()) return 0.0;
        try { return Double.parseDouble(s.replace(",", "")); }
        catch (NumberFormatException e) { return 0.0; }
    }

    private Double nullableDouble(JsonNode node, String field) {
        JsonNode val = node.path(field);
        if (val.isNull() || val.isMissingNode()) return null;
        try { return Double.parseDouble(val.asText()); }
        catch (NumberFormatException e) { return null; }
    }

    // ─── Exception ────────────────────────────────────────────────────────────────

    public static class CasParseException extends RuntimeException {
        public CasParseException(String message) { super(message); }
    }
}
