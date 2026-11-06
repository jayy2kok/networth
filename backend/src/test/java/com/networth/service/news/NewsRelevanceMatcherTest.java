package com.networth.service.news;

import com.networth.model.document.InvestmentEntry;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class NewsRelevanceMatcherTest {

    private final NewsRelevanceMatcher matcher = new NewsRelevanceMatcher();

    private static InvestmentEntry investment(String name, String type, String isin) {
        return InvestmentEntry.builder()
                .name(name)
                .investmentType(type)
                .isin(isin)
                .build();
    }

    @Test
    void matchesHoldingNameToken() {
        var result = matcher.match(
                "Infosys wins large AI deal",
                "The IT services company raised its revenue guidance.",
                List.of(investment("Infosys Ltd", "EQUITY", null)));

        assertTrue(result.relevant());
        assertEquals(List.of("Infosys Ltd"), result.holdings());
    }

    @Test
    void matchesIsinExactly() {
        var result = matcher.match(
                "Corporate action announced",
                "ISIN INE009A01021 will trade ex-dividend tomorrow.",
                List.of(investment("Some Company", "EQUITY", "INE009A01021")));

        assertTrue(result.relevant());
        assertEquals(List.of("Some Company"), result.holdings());
    }

    @Test
    void ignoresGenericFundWording() {
        var result = matcher.match(
                "Mutual fund industry sees inflows",
                "Investors added money to equity mutual fund schemes.",
                List.of(investment("Axis Bluechip Fund - Direct Growth", "EQUITY", null)));

        assertFalse(result.relevant());
    }

    @Test
    void mapsRateNewsToDebtHoldings() {
        var result = matcher.match(
                "RBI holds repo rate steady",
                "The central bank kept the repo rate unchanged and flagged inflation.",
                List.of(investment("SBI Corporate Bond Fund", "DEBT", null)));

        assertTrue(result.relevant());
        assertEquals(List.of("SBI Corporate Bond Fund"), result.holdings());
        assertTrue(result.topics().contains("rbi"));
    }

    @Test
    void unrelatedArticleIsDropped() {
        var result = matcher.match(
                "New smartphone launched",
                "A consumer electronics brand announced a new phone.",
                List.of(investment("Infosys Ltd", "EQUITY", null)));

        assertFalse(result.relevant());
    }
}