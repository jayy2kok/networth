package com.networth.model;

import lombok.*;
import java.util.Map;

/**
 * Computed dashboard summary returned by CalculationService.
 * Not persisted — calculated on every request from the live financial profile.
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class DashboardSummary {

    // ── Net Worth components ───────────────────────────────────────────────
    double totalAssets;
    double totalLiabilities;
    double netWorth;
    double totalInvestments;
    double totalAssetValue;
    double totalRealEstate;
    double liquidAssets;

    // ── Income & Expenses ─────────────────────────────────────────────────
    double incomePA;
    double expensePA;
    double basicExpensePA;      // NEED category only
    double savingsPA;
    double savingsRate;         // percent
    double monthlyExpenses;
    double totalMonthlyEmi;

    // ── Emergency Fund ────────────────────────────────────────────────────
    double emergencyFundTarget;  // monthlyExpenses × 6
    double emergencySurplus;     // liquidAssets - emergencyFundTarget

    // ── Runway ────────────────────────────────────────────────────────────
    double runwayMonths;
    double runwayYears;

    // ── F.I.R.E. ──────────────────────────────────────────────────────────
    double fireAmount;           // 25 × annual non-savings expenses
    double fireDiff;             // fireAmount - netWorth (≥ 0)
    double fireProgress;         // 0–100 %
    Double yearsToFire;          // null if cannot be computed

    // ── User / retirement ─────────────────────────────────────────────────
    int retirementAge;
    Integer currentAge;
    Integer retirementMonthsLeft;

    // ── Breakdowns ────────────────────────────────────────────────────────
    Map<String, Double> investmentByCategory;   // DOMESTIC, INTERNATIONAL, LIQUID, METALS
    Map<String, Double> expenseByCategory;      // NEED, WANT, SAVINGS (annual INR)
    Map<String, Double> liabilitiesBreakdown;   // homeLoans, personalLoans, otherDebts
}
