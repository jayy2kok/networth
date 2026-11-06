package com.networth.service.news;

import com.networth.model.document.InvestmentEntry;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Decides whether a feed item is relevant to the owner's holdings.
 * Holdings are matched by distinctive name tokens plus stable identifiers
 * (ISIN, AMFI code, AMC). Macro themes are mapped from investment type.
 */
@Component
public class NewsRelevanceMatcher {

    private static final Set<String> STOPWORDS = Set.of(
            "fund", "funds", "direct", "regular", "growth", "plan", "scheme", "mutual",
            "equity", "debt", "bond", "bonds", "india", "indian", "limited", "ltd",
            "pvt", "private", "company", "the", "and", "of", "for", "with", "from",
            "portfolio", "investment", "investments", "savings", "account", "deposit",
            "fixed", "cash", "value", "current", "new", "global");

    private static final Map<String, List<String>> MACRO_TOPICS = Map.of(
            "EQUITY", List.of("nifty", "sensex", "stock market", "equity market", "fii", "dii", "sebi", "ipo", "quarterly results", "earnings"),
            "ETF", List.of("nifty", "sensex", "stock market", "equity market", "fii", "dii", "sebi", "ipo", "quarterly results", "earnings"),
            "BONDS", List.of("rbi", "repo rate", "rate cut", "rate hike", "bond yield", "inflation", "g-sec", "treasury", "interest rate"),
            "DEBT", List.of("rbi", "repo rate", "rate cut", "rate hike", "bond yield", "inflation", "g-sec", "treasury", "interest rate"),
            "FIXED_DEPOSITS", List.of("rbi", "repo rate", "rate cut", "rate hike", "inflation", "interest rate"),
            "RETIRALS", List.of("nps", "pension", "epfo", "retirement"),
            "CASH_EQUIVALENT", List.of("rupee", "dollar index", "forex", "currency")
    );

    public record Relevance(int score, List<String> holdings, List<String> topics) {
        public boolean relevant() { return score > 0; }
    }

    public Relevance match(String title, String summary, List<InvestmentEntry> investments) {
        String text = ((title == null ? "" : title) + " " + (summary == null ? "" : summary))
                .toLowerCase(Locale.ROOT);

        LinkedHashSet<String> holdings = new LinkedHashSet<>();
        LinkedHashSet<String> topics = new LinkedHashSet<>();
        int score = 0;

        for (InvestmentEntry inv : investments) {
            if (inv == null || inv.getName() == null) continue;

            int holdingScore = scoreHolding(inv, text);
            if (holdingScore > 0) {
                holdings.add(inv.getName());
                score += holdingScore;
                continue;
            }

            String type = inv.getInvestmentType() == null
                    ? "" : inv.getInvestmentType().toUpperCase(Locale.ROOT);
            List<String> keywords = MACRO_TOPICS.get(type);
            if (keywords == null) continue;

            for (String keyword : keywords) {
                if (text.contains(keyword)) {
                    topics.add(keyword);
                    score++;
                    if (holdings.size() < 5) holdings.add(inv.getName());
                    break;
                }
            }
        }

        return new Relevance(score, new ArrayList<>(holdings), new ArrayList<>(topics));
    }

    private int scoreHolding(InvestmentEntry inv, String text) {
        int score = 0;

        if (notBlank(inv.getIsin()) && text.contains(inv.getIsin().toLowerCase(Locale.ROOT))) score += 5;
        if (notBlank(inv.getAmfiCode()) && text.contains(inv.getAmfiCode().toLowerCase(Locale.ROOT))) score += 3;
        if (notBlank(inv.getAmc())) {
            for (String token : tokens(inv.getAmc())) {
                if (text.contains(token)) { score += 2; break; }
            }
        }

        List<String> tokens = tokens(inv.getName());
        int matches = 0;
        for (String token : tokens) {
            if (text.contains(token)) matches++;
        }
        if (matches > 0 && (tokens.size() <= 2 || matches >= 2 || matches == tokens.size())) {
            score += matches;
        } else if (matches == 1 && tokens.size() > 2 && tokens.get(0).length() >= 6) {
            // A distinctive leading word (e.g. "Infosys", "Havells") is enough.
            score += 1;
        }
        return score;
    }

    private static List<String> tokens(String raw) {
        if (raw == null) return List.of();
        return Arrays.stream(raw.toLowerCase(Locale.ROOT).split("[^a-z0-9]+"))
                .filter(token -> token.length() >= 4)
                .filter(token -> !STOPWORDS.contains(token))
                .distinct()
                .collect(Collectors.toList());
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
