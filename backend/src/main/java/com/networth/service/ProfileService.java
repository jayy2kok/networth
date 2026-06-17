package com.networth.service;

import com.networth.exception.ResourceNotFoundException;
import com.networth.model.document.*;
import com.networth.repository.FinancialProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileService {

    private final FinancialProfileRepository profileRepository;
    private final ExchangeRateService fxService;

    // ─── Profile ─────────────────────────────────────────────────────────────

    public FinancialProfileDocument getOrCreate(String userId) {
        return profileRepository.findByUserId(userId)
                .orElseGet(() -> profileRepository.save(
                        FinancialProfileDocument.builder().userId(userId).build()));
    }

    // ─── Investments ─────────────────────────────────────────────────────────

    public FinancialProfileDocument addInvestment(String userId, InvestmentEntry inv) {
        inv.setId(UUID.randomUUID().toString());
        inv.setCreatedAt(Instant.now());
        inv.setUpdatedAt(Instant.now());
        enrichInvestment(inv);
        FinancialProfileDocument p = getOrCreate(userId);
        p.getInvestments().add(inv);
        return profileRepository.save(p);
    }

    public FinancialProfileDocument updateInvestment(String userId, String id, InvestmentEntry updated) {
        FinancialProfileDocument p = getOrCreate(userId);
        List<InvestmentEntry> list = p.getInvestments();
        for (int i = 0; i < list.size(); i++) {
            if (id.equals(list.get(i).getId())) {
                updated.setId(id);
                updated.setCreatedAt(list.get(i).getCreatedAt());
                updated.setUpdatedAt(Instant.now());
                enrichInvestment(updated);
                list.set(i, updated);
                return profileRepository.save(p);
            }
        }
        throw new ResourceNotFoundException("Investment not found: " + id);
    }

    public FinancialProfileDocument deleteInvestment(String userId, String id) {
        FinancialProfileDocument p = getOrCreate(userId);
        p.getInvestments().removeIf(inv -> id.equals(inv.getId()));
        return profileRepository.save(p);
    }

    private void enrichInvestment(InvestmentEntry inv) {
        double current = inv.getCurrentValue() != null ? inv.getCurrentValue() : 0.0;
        double invested = inv.getInvestedValue() != null ? inv.getInvestedValue() : 0.0;
        inv.setCurrentValueINR(fxService.toInr(current, inv.getCurrency()));
        inv.setInvestedValueINR(fxService.toInr(invested, inv.getCurrency()));
    }

    // ─── Assets ──────────────────────────────────────────────────────────────

    public FinancialProfileDocument addAsset(String userId, AssetEntry asset) {
        asset.setId(UUID.randomUUID().toString());
        asset.setCreatedAt(Instant.now());
        asset.setUpdatedAt(Instant.now());
        enrichAsset(asset);
        FinancialProfileDocument p = getOrCreate(userId);
        p.getAssets().add(asset);
        return profileRepository.save(p);
    }

    public FinancialProfileDocument updateAsset(String userId, String id, AssetEntry updated) {
        FinancialProfileDocument p = getOrCreate(userId);
        List<AssetEntry> list = p.getAssets();
        for (int i = 0; i < list.size(); i++) {
            if (id.equals(list.get(i).getId())) {
                updated.setId(id);
                updated.setCreatedAt(list.get(i).getCreatedAt());
                updated.setUpdatedAt(Instant.now());
                enrichAsset(updated);
                list.set(i, updated);
                return profileRepository.save(p);
            }
        }
        throw new ResourceNotFoundException("Asset not found: " + id);
    }

    public FinancialProfileDocument deleteAsset(String userId, String id) {
        FinancialProfileDocument p = getOrCreate(userId);
        p.getAssets().removeIf(a -> id.equals(a.getId()));
        return profileRepository.save(p);
    }

    private void enrichAsset(AssetEntry asset) {
        double current = asset.getCurrentValue() != null ? asset.getCurrentValue() : 0.0;
        double acq     = asset.getAcquisitionCost() != null ? asset.getAcquisitionCost() : 0.0;
        asset.setCurrentValueINR(fxService.toInr(current, asset.getCurrency()));
        double pct = acq > 0 ? ((current - acq) / acq) * 100.0 : 0.0;
        asset.setPercentChange(Math.round(pct * 100.0) / 100.0);
    }

    // ─── Liabilities ─────────────────────────────────────────────────────────

    public FinancialProfileDocument addLiability(String userId, LiabilityEntry lia) {
        lia.setId(UUID.randomUUID().toString());
        lia.setCreatedAt(Instant.now());
        lia.setUpdatedAt(Instant.now());
        FinancialProfileDocument p = getOrCreate(userId);
        p.getLiabilities().add(lia);
        return profileRepository.save(p);
    }

    public FinancialProfileDocument updateLiability(String userId, String id, LiabilityEntry updated) {
        FinancialProfileDocument p = getOrCreate(userId);
        List<LiabilityEntry> list = p.getLiabilities();
        for (int i = 0; i < list.size(); i++) {
            if (id.equals(list.get(i).getId())) {
                updated.setId(id);
                updated.setCreatedAt(list.get(i).getCreatedAt());
                updated.setUpdatedAt(Instant.now());
                list.set(i, updated);
                return profileRepository.save(p);
            }
        }
        throw new ResourceNotFoundException("Liability not found: " + id);
    }

    public FinancialProfileDocument deleteLiability(String userId, String id) {
        FinancialProfileDocument p = getOrCreate(userId);
        p.getLiabilities().removeIf(l -> id.equals(l.getId()));
        return profileRepository.save(p);
    }

    // ─── Incomes ─────────────────────────────────────────────────────────────

    public FinancialProfileDocument addIncome(String userId, IncomeEntry income) {
        income.setId(UUID.randomUUID().toString());
        income.setCreatedAt(Instant.now());
        income.setUpdatedAt(Instant.now());
        enrichIncome(income);
        FinancialProfileDocument p = getOrCreate(userId);
        p.getIncomes().add(income);
        return profileRepository.save(p);
    }

    public FinancialProfileDocument updateIncome(String userId, String id, IncomeEntry updated) {
        FinancialProfileDocument p = getOrCreate(userId);
        List<IncomeEntry> list = p.getIncomes();
        for (int i = 0; i < list.size(); i++) {
            if (id.equals(list.get(i).getId())) {
                updated.setId(id);
                updated.setCreatedAt(list.get(i).getCreatedAt());
                updated.setUpdatedAt(Instant.now());
                enrichIncome(updated);
                list.set(i, updated);
                return profileRepository.save(p);
            }
        }
        throw new ResourceNotFoundException("Income not found: " + id);
    }

    public FinancialProfileDocument deleteIncome(String userId, String id) {
        FinancialProfileDocument p = getOrCreate(userId);
        p.getIncomes().removeIf(inc -> id.equals(inc.getId()));
        return profileRepository.save(p);
    }

    private void enrichIncome(IncomeEntry income) {
        double amount = income.getAmount() != null ? income.getAmount() : 0.0;
        income.setAmountInr(fxService.toInr(amount, income.getCurrency()));
    }

    // ─── Expenses ────────────────────────────────────────────────────────────

    public FinancialProfileDocument addExpense(String userId, ExpenseEntry expense) {
        expense.setId(UUID.randomUUID().toString());
        enrichExpense(expense);
        FinancialProfileDocument p = getOrCreate(userId);
        p.getExpenses().add(expense);
        return profileRepository.save(p);
    }

    public FinancialProfileDocument updateExpense(String userId, String id, ExpenseEntry updated) {
        FinancialProfileDocument p = getOrCreate(userId);
        List<ExpenseEntry> list = p.getExpenses();
        for (int i = 0; i < list.size(); i++) {
            if (id.equals(list.get(i).getId())) {
                updated.setId(id);
                enrichExpense(updated);
                list.set(i, updated);
                return profileRepository.save(p);
            }
        }
        throw new ResourceNotFoundException("Expense not found: " + id);
    }

    public FinancialProfileDocument deleteExpense(String userId, String id) {
        FinancialProfileDocument p = getOrCreate(userId);
        p.getExpenses().removeIf(exp -> id.equals(exp.getId()));
        return profileRepository.save(p);
    }

    private void enrichExpense(ExpenseEntry expense) {
        double amountInr = fxService.toInr(
                expense.getAmount() != null ? expense.getAmount() : 0.0,
                expense.getCurrency());
        String freq = expense.getFrequency() != null ? expense.getFrequency().toUpperCase() : "MONTHLY";
        switch (freq) {
            case "YEARLY" -> {
                expense.setAnnualAmountINR(amountInr);
                expense.setMonthlyAmountINR(amountInr / 12.0);
            }
            case "QUARTERLY" -> {
                expense.setAnnualAmountINR(amountInr * 4.0);
                expense.setMonthlyAmountINR(amountInr * 4.0 / 12.0);
            }
            default -> { // MONTHLY
                expense.setMonthlyAmountINR(amountInr);
                expense.setAnnualAmountINR(amountInr * 12.0);
            }
        }
    }
}
