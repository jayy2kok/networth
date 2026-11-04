package com.networth.mcp.service;

import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Reads only owner-scoped, minimized financial data from Atlas. */
@Service
public class PortfolioReadService {
    private static final int MAX_LIMIT = 100;
    private final MongoTemplate mongoTemplate;

    public PortfolioReadService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public Map<String, Object> summary(String ownerId) {
        Document profile = profile(ownerId);
        List<Document> investments = documents(profile, "investments");
        List<Document> assets = documents(profile, "assets");
        List<Document> liabilities = documents(profile, "liabilities");
        double investmentTotal = sum(investments, "currentValueINR");
        double assetTotal = sum(assets, "currentValueINR");
        double liabilityTotal = sum(liabilities, "outstandingAmount");
        Map<String, Object> response = metadata(profile);
        response.put("totalInvestments", investmentTotal);
        response.put("totalAssets", investmentTotal + assetTotal);
        response.put("totalLiabilities", liabilityTotal);
        response.put("netWorth", investmentTotal + assetTotal - liabilityTotal);
        response.put("warnings", List.of("Totals use INR-valued fields only; entries without INR valuations are excluded."));
        return response;
    }

    public Map<String, Object> holdings(String ownerId, String investmentType, int limit) {
        Document profile = profile(ownerId);
        List<Map<String, Object>> results = documents(profile, "investments").stream()
                .filter(entry -> investmentType == null || investmentType.isBlank()
                        || investmentType.equalsIgnoreCase(entry.getString("investmentType")))
                .limit(normalizeLimit(limit))
                .map(entry -> Map.<String, Object>of(
                        "id", entry.getString("id"), "name", value(entry, "name"),
                        "investmentType", value(entry, "investmentType"), "currentValueINR", value(entry, "currentValueINR"),
                        "currency", value(entry, "currency"), "valuationDate", value(entry, "navDate")))
                .toList();
        Map<String, Object> response = metadata(profile);
        response.put("holdings", results);
        response.put("returned", results.size());
        response.put("warnings", List.of("Values are stored observations, not live quotes."));
        return response;
    }

    public Map<String, Object> history(String ownerId, String from, String to, int limit) {
        Query query = new Query(Criteria.where("userId").is(ownerId)).with(Sort.by("snapshotDate").ascending())
                .limit(normalizeLimit(limit));
        if (from != null && !from.isBlank()) query.addCriteria(Criteria.where("snapshotDate").gte(LocalDate.parse(from)));
        if (to != null && !to.isBlank()) query.addCriteria(Criteria.where("snapshotDate").lte(LocalDate.parse(to)));
        List<Document> snapshots = mongoTemplate.find(query, Document.class, "snapshots");
        List<Map<String, Object>> values = snapshots.stream().map(snapshot -> Map.<String, Object>of(
                "snapshotDate", value(snapshot, "snapshotDate"), "netWorth", value(snapshot, "netWorth"),
                "totalAssets", value(snapshot, "totalAssets"), "totalLiabilities", value(snapshot, "totalLiabilities")))
                .toList();
        return Map.of("schemaVersion", "1", "generatedAt", Instant.now().toString(), "snapshots", values,
                "warnings", List.of("Net-worth changes include contributions, withdrawals, and edits; they are not investment returns."));
    }

    private Document profile(String ownerId) {
        Document profile = mongoTemplate.getCollection("financial_profiles").find(new Document("userId", ownerId)).first();
        return profile == null ? new Document() : profile;
    }

    private Map<String, Object> metadata(Document profile) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("schemaVersion", "1");
        response.put("generatedAt", Instant.now().toString());
        response.put("profileUpdatedAt", value(profile, "updatedAt"));
        response.put("reportingCurrency", "INR");
        return response;
    }

    @SuppressWarnings("unchecked")
    private static List<Document> documents(Document document, String field) {
        Object value = document.get(field);
        if (!(value instanceof List<?> values)) return List.of();
        List<Document> documents = new ArrayList<>();
        for (Object element : values) if (element instanceof Document entry) documents.add(entry);
        return documents;
    }

    private static double sum(List<Document> entries, String field) {
        return entries.stream().map(entry -> entry.get(field)).filter(Number.class::isInstance)
                .mapToDouble(value -> ((Number) value).doubleValue()).sum();
    }

    private static Object value(Document document, String field) {
        Object value = document.get(field);
        return value == null ? "unknown" : value;
    }

    private static int normalizeLimit(int limit) {
        return limit <= 0 ? 50 : Math.min(limit, MAX_LIMIT);
    }
}