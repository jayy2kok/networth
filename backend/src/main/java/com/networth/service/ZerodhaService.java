package com.networth.service;

import com.networth.model.document.FinancialProfileDocument;
import com.networth.model.document.InvestmentEntry;
import com.networth.repository.FinancialProfileRepository;
import com.zerodhatech.kiteconnect.KiteConnect;
import com.zerodhatech.kiteconnect.kitehttp.exceptions.KiteException;
import com.zerodhatech.models.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ZerodhaService {
    private final FinancialProfileRepository repository;
    private final MongoTemplate mongoTemplate;
    @Value("${kite.api-key:}") private String apiKey;
    @Value("${kite.api-secret:}") private String apiSecret;

    public String getLoginUrl() {
        requireConfiguration();
        try (KiteConnect kite = createClient(apiKey)) {
            return kite.getLoginURL();
        }
    }

    KiteConnect createClient(String key) { return new KiteConnect(key); }

    public record SyncResult(int equitiesCount, int mutualFundsCount, double cashBalance,
                             double totalInvestedValue, double totalCurrentValue, Instant syncedAt) { }

    public SyncResult syncPortfolio(String userId, String requestToken) {
        requireConfiguration();
        List<InvestmentEntry> imported = new ArrayList<>();
        Instant now = Instant.now();
        try (KiteConnect kite = createClient(apiKey)) {
            User session = kite.generateSession(requestToken, apiSecret);
            if (session == null || session.accessToken == null || session.accessToken.isBlank()) {
                throw new ZerodhaException("Zerodha authentication failed", 502);
            }
            kite.setAccessToken(session.accessToken);
            List<Holding> holdings = kite.getHoldings();
            List<MFHolding> funds = kite.getMFHoldings();
            Margin margin = kite.getMargins("equity");
            if (holdings == null || funds == null || margin == null) {
                throw new ZerodhaException("Incomplete response from Zerodha", 502);
            }
            String cashText = margin.available != null && margin.available.cash != null
                    ? margin.available.cash : margin.net;
            double cash = Double.parseDouble(cashText);
            if (!Double.isFinite(cash)) throw new IllegalArgumentException();
            for (Holding h : holdings) {
                String symbol = h.tradingSymbol.toUpperCase(Locale.ROOT);
                boolean gold = symbol.startsWith("SGB") || symbol.contains("GOLD") || symbol.contains("SILVER");
                boolean international = symbol.contains("MON100") || symbol.contains("NASDAQ") || symbol.contains("S&P500");
                boolean etf = symbol.contains("BEES") || symbol.contains("ETF") || gold || international;
                String type = symbol.startsWith("SGB") ? "BONDS" : etf ? "ETF" : "EQUITY";
                InvestmentEntry entry = investment(h.tradingSymbol, type, h.quantity * h.averagePrice, h.quantity * h.lastPrice, now);
                entry.setUnits((double) h.quantity);
                if (gold) entry.getCategories().add("METALS");
                entry.setIsin(h.isin);
                imported.add(entry);
            }
            for (MFHolding f : funds) {
                InvestmentEntry entry = investment(f.fund, "EQUITY", f.quantity * f.averagePrice, f.quantity * f.lastPrice, now);
                entry.setUnits(f.quantity);
                entry.setLatestNav(f.lastPrice);
                entry.setFolio(f.folio);
                imported.add(entry);
            }
            imported.add(investment("Zerodha Trading Balance", "CASH_EQUIVALENT", cash, cash, now));
            double invested = imported.stream().mapToDouble(InvestmentEntry::getInvestedValue).sum();
            double current = imported.stream().mapToDouble(InvestmentEntry::getCurrentValue).sum();

            FinancialProfileDocument profile = repository.findByUserId(userId)
                    .orElseGet(() -> FinancialProfileDocument.builder().userId(userId).build());
            List<InvestmentEntry> merged = new ArrayList<>();
            if (profile.getInvestments() != null) {
                profile.getInvestments().stream().filter(i -> !"ZERODHA".equals(i.getSource())).forEach(merged::add);
            }
            merged.addAll(imported);
            mongoTemplate.upsert(Query.query(Criteria.where("userId").is(userId)),
                    new Update().set("investments", merged).set("updatedAt", now), FinancialProfileDocument.class);
            return new SyncResult(holdings.size(), funds.size(), cash, invested, current, now);
        } catch (KiteException e) {
            throw new ZerodhaException(e.code == 403 || e.code == 401 ? "Zerodha authentication failed" : "Zerodha service request failed", e.code == 403 || e.code == 401 ? 401 : 502);
        } catch (java.io.IOException | org.json.JSONException e) {
            throw new ZerodhaException("Zerodha service request failed", 502);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ZerodhaException("Invalid response from Zerodha", 502);
        }
    }

    private InvestmentEntry investment(String name, String type, double invested, double current, Instant now) {
        if (name == null || name.isBlank() || !Double.isFinite(invested) || !Double.isFinite(current)) throw new IllegalArgumentException();
        return InvestmentEntry.builder().id(UUID.randomUUID().toString()).name(name).investmentType(type)
                .categories(new ArrayList<>(List.of("LIQUID", "DOMESTIC"))).investedValue(invested).investedValueINR(invested)
                .currentValue(current).currentValueINR(current).currency("INR").source("ZERODHA")
                .createdAt(now).updatedAt(now).build();
    }

    private void requireConfiguration() {
        if (apiKey == null || apiKey.isBlank() || apiSecret == null || apiSecret.isBlank())
            throw new ZerodhaException("Zerodha integration is not configured", 503);
    }

    public static class ZerodhaException extends RuntimeException {
        private final int status;
        public ZerodhaException(String message, int status) { super(message); this.status = status; }
        public int getStatus() { return status; }
    }
}