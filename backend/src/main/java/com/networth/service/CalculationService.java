package com.networth.service;

import com.networth.model.DashboardSummary;
import com.networth.model.document.*;
import com.networth.repository.FinancialProfileRepository;
import com.networth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * All financial calculations (Sections 7.1 – 7.11 of architecture.md).
 * Reads live profile + user settings; returns a DashboardSummary POJO.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CalculationService {

    private final FinancialProfileRepository profileRepo;
    private final UserRepository             userRepo;

    public DashboardSummary calculate(String userId) {
        FinancialProfileDocument profile = profileRepo.findByUserId(userId)
                .orElse(new FinancialProfileDocument());
        UserDocument user = userRepo.findById(userId).orElse(null);
        UserSettingsDocument settings = (user != null) ? user.getSettings() : null;

        // ── 7.1  Total Assets ──────────────────────────────────────────────
        double totalInvestments = sum(profile.getInvestments(), i -> nvl(i.getCurrentValueINR()));
        double totalAssetValue  = sum(profile.getAssets(),      a -> nvl(a.getCurrentValueINR()));
        double totalAssets      = totalInvestments + totalAssetValue;

        // ── 7.2  Total Liabilities ─────────────────────────────────────────
        double totalLiabilities = sum(profile.getLiabilities(), l -> nvl(l.getOutstandingAmount()));

        // ── 7.3  Net Worth ─────────────────────────────────────────────────
        double netWorth = totalAssets - totalLiabilities;

        // ── 7.4  Liquid Assets (LIQUID category) ──────────────────────────
        double liquidAssets = profile.getInvestments().stream()
                .filter(i -> i.getCategories() != null && i.getCategories().contains("LIQUID"))
                .mapToDouble(i -> nvl(i.getCurrentValueINR()))
                .sum();

        double totalRealEstate = profile.getAssets().stream()
                .filter(a -> "REAL_ESTATE".equals(a.getType()))
                .mapToDouble(a -> nvl(a.getCurrentValueINR()))
                .sum();

        // ── 7.5  Income & Savings ─────────────────────────────────────────
        double incomePA = profile.getIncomes().stream()
                .mapToDouble(i -> nvl(i.getAmountInr()) * freqMultiplier(i.getFrequency()))
                .sum();

        double expensePA = sum(profile.getExpenses(), e -> nvl(e.getAnnualAmountINR()));

        double basicExpensePA = profile.getExpenses().stream()
                .filter(e -> "NEED".equals(e.getCategory()))
                .mapToDouble(e -> nvl(e.getAnnualAmountINR()))
                .sum();

        double savingsPA   = incomePA - expensePA;
        double savingsRate = incomePA > 0 ? (savingsPA / incomePA) * 100.0 : 0.0;

        // ── 7.6  Emergency Fund ───────────────────────────────────────────
        double monthlyExpenses    = profile.getExpenses().stream()
                .filter(e -> e.getIncludeInRunway() == null || e.getIncludeInRunway())
                .mapToDouble(e -> nvl(e.getMonthlyAmountINR()))
                .sum();
        double emergencyFundTarget = monthlyExpenses * 6.0;
        double emergencySurplus   = liquidAssets - emergencyFundTarget;

        // ── Monthly EMI ───────────────────────────────────────────────────
        double totalMonthlyEmi = sum(profile.getLiabilities(), l -> nvl(l.getEmi()));

        // ── 7.7  Runway ───────────────────────────────────────────────────
        double runwayMonths = monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : 0.0;
        double runwayYears  = runwayMonths / 12.0;

        // ── 7.8  FIRE Amount (25× rule) ───────────────────────────────────
        double annualNonSavingsExp = profile.getExpenses().stream()
                .filter(e -> !"SAVINGS".equals(e.getCategory()) && (e.getIncludeInFIRE() == null || e.getIncludeInFIRE()))
                .mapToDouble(e -> nvl(e.getAnnualAmountINR()))
                .sum();
        double fireAmount   = annualNonSavingsExp * 25.0;
        double fireDiff     = Math.max(0.0, fireAmount - netWorth);
        double fireProgress = fireAmount > 0 ? Math.min(100.0, (netWorth / fireAmount) * 100.0) : 0.0;

        // ── 7.9  Years to FIRE ────────────────────────────────────────────
        double monthlyInvestment = profile.getExpenses().stream()
                .filter(e -> "SAVINGS".equals(e.getCategory()))
                .mapToDouble(e -> nvl(e.getMonthlyAmountINR()))
                .sum();

        double expectedReturn = settings != null && settings.getExpectedReturnRate() != null
                ? settings.getExpectedReturnRate() / 100.0 : 0.12;
        double inflation = settings != null && settings.getInflationRate() != null
                ? settings.getInflationRate() / 100.0 : 0.06;

        Double yearsToFire = computeYearsToFire(fireDiff, monthlyInvestment, expectedReturn, inflation);

        // ── 7.10  Retirement Countdown ────────────────────────────────────
        int retirementAge = (settings != null && settings.getRetirementAge() != null)
                ? settings.getRetirementAge() : 60;
        Integer currentAge          = null;
        Integer retirementMonthsLeft = null;
        if (settings != null && settings.getDateOfBirth() != null && !settings.getDateOfBirth().isBlank()) {
            try {
                LocalDate dob   = LocalDate.parse(settings.getDateOfBirth());
                long ageMonths  = ChronoUnit.MONTHS.between(dob, LocalDate.now());
                currentAge      = (int) (ageMonths / 12);
                retirementMonthsLeft = (retirementAge * 12) - (int) ageMonths;
            } catch (Exception ex) {
                log.debug("Cannot parse DOB '{}': {}", settings.getDateOfBirth(), ex.getMessage());
            }
        }

        // ── 7.11  Investment Category Breakdown ───────────────────────────
        Map<String, Double> investmentByCategory = new LinkedHashMap<>();
        for (String cat : List.of("DOMESTIC", "INTERNATIONAL", "LIQUID", "METALS")) {
            double val = profile.getInvestments().stream()
                    .filter(i -> i.getCategories() != null && i.getCategories().contains(cat))
                    .mapToDouble(i -> nvl(i.getCurrentValueINR()))
                    .sum();
            investmentByCategory.put(cat, val);
        }

        // ── Expense Category Breakdown ────────────────────────────────────
        Map<String, Double> expenseByCategory = new LinkedHashMap<>();
        for (String cat : List.of("NEED", "WANT", "SAVINGS")) {
            double val = profile.getExpenses().stream()
                    .filter(e -> cat.equals(e.getCategory()))
                    .mapToDouble(e -> nvl(e.getAnnualAmountINR()))
                    .sum();
            expenseByCategory.put(cat, val);
        }

        // ── Liabilities Breakdown ─────────────────────────────────────────
        Map<String, Double> liabilitiesBreakdown = new LinkedHashMap<>();
        liabilitiesBreakdown.put("homeLoans", profile.getLiabilities().stream()
                .filter(l -> "HOME_LOAN".equals(l.getType()))
                .mapToDouble(l -> nvl(l.getOutstandingAmount())).sum());
        liabilitiesBreakdown.put("personalLoans", profile.getLiabilities().stream()
                .filter(l -> "PERSONAL_LOAN".equals(l.getType()))
                .mapToDouble(l -> nvl(l.getOutstandingAmount())).sum());
        liabilitiesBreakdown.put("otherDebts", profile.getLiabilities().stream()
                .filter(l -> !List.of("HOME_LOAN", "PERSONAL_LOAN").contains(l.getType()))
                .mapToDouble(l -> nvl(l.getOutstandingAmount())).sum());

        return DashboardSummary.builder()
                .totalAssets(totalAssets)
                .totalLiabilities(totalLiabilities)
                .netWorth(netWorth)
                .totalInvestments(totalInvestments)
                .totalAssetValue(totalAssetValue)
                .totalRealEstate(totalRealEstate)
                .liquidAssets(liquidAssets)
                .incomePA(incomePA)
                .expensePA(expensePA)
                .basicExpensePA(basicExpensePA)
                .savingsPA(savingsPA)
                .savingsRate(savingsRate)
                .monthlyExpenses(monthlyExpenses)
                .totalMonthlyEmi(totalMonthlyEmi)
                .emergencyFundTarget(emergencyFundTarget)
                .emergencySurplus(emergencySurplus)
                .runwayMonths(runwayMonths)
                .runwayYears(runwayYears)
                .fireAmount(fireAmount)
                .fireDiff(fireDiff)
                .fireProgress(fireProgress)
                .yearsToFire(yearsToFire)
                .retirementAge(retirementAge)
                .currentAge(currentAge)
                .retirementMonthsLeft(retirementMonthsLeft)
                .investmentByCategory(investmentByCategory)
                .expenseByCategory(expenseByCategory)
                .liabilitiesBreakdown(liabilitiesBreakdown)
                .build();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static double nvl(Double v) { return v != null ? v : 0.0; }

    @FunctionalInterface
    interface ToDouble<T> { double apply(T t); }

    private static <T> double sum(List<T> list, ToDouble<T> fn) {
        if (list == null) return 0.0;
        return list.stream().mapToDouble(fn::apply).sum();
    }

    private static double freqMultiplier(String freq) {
        if (freq == null) return 12;
        return switch (freq.toUpperCase()) {
            case "YEARLY"    -> 1;
            case "QUARTERLY" -> 4;
            default          -> 12;
        };
    }

    /**
     * FV = PMT × [((1+r)^n − 1) / r]  →  solve for n.
     * n = log(1 + FV·r / PMT) / log(1+r)
     * Returns null if inputs insufficient to compute.
     */
    private static Double computeYearsToFire(double fireDiff, double monthlyPmt,
                                              double annualReturn, double annualInflation) {
        if (fireDiff <= 0) return 0.0;           // already at FIRE
        if (monthlyPmt <= 0) return null;        // no savings, can't project

        double realAnnual  = (1 + annualReturn) / (1 + annualInflation) - 1;
        double realMonthly = Math.pow(1 + realAnnual, 1.0 / 12) - 1;

        if (realMonthly <= 0) {
            // Zero real rate: simple linear time
            double months = fireDiff / monthlyPmt;
            return months / 12.0;
        }

        double inner = 1.0 + (fireDiff * realMonthly / monthlyPmt);
        if (inner <= 0) return null;             // impossible maths
        double n = Math.log(inner) / Math.log(1 + realMonthly);
        return n / 12.0;
    }
}
