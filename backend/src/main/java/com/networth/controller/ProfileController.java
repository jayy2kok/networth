package com.networth.controller;

import com.networth.filter.DummyUserFilter;
import com.networth.model.document.*;
import com.networth.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
@Tag(name = "Financial Profile")
public class ProfileController {

    private final ProfileService profileService;

    private String uid(HttpServletRequest req) {
        return (String) req.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR);
    }

    // ─── Profile ─────────────────────────────────────────────────────────────

    @GetMapping
    @Operation(operationId = "getFinancialProfile", summary = "Get full financial profile")
    public ResponseEntity<FinancialProfileDocument> getProfile(HttpServletRequest req) {
        return ResponseEntity.ok(profileService.getOrCreate(uid(req)));
    }

    // ─── Investments ─────────────────────────────────────────────────────────

    @PostMapping("/investments")
    @Operation(operationId = "createInvestment", summary = "Add an investment")
    public ResponseEntity<FinancialProfileDocument> addInvestment(
            HttpServletRequest req, @RequestBody InvestmentEntry body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(profileService.addInvestment(uid(req), body));
    }

    @PutMapping("/investments/{id}")
    @Operation(operationId = "updateInvestment", summary = "Update an investment")
    public ResponseEntity<FinancialProfileDocument> updateInvestment(
            HttpServletRequest req, @PathVariable String id, @RequestBody InvestmentEntry body) {
        return ResponseEntity.ok(profileService.updateInvestment(uid(req), id, body));
    }

    @DeleteMapping("/investments/{id}")
    @Operation(operationId = "deleteInvestment", summary = "Delete an investment")
    public ResponseEntity<FinancialProfileDocument> deleteInvestment(
            HttpServletRequest req, @PathVariable String id) {
        return ResponseEntity.ok(profileService.deleteInvestment(uid(req), id));
    }

    // ─── Assets ──────────────────────────────────────────────────────────────

    @PostMapping("/assets")
    @Operation(operationId = "createAsset", summary = "Add an asset")
    public ResponseEntity<FinancialProfileDocument> addAsset(
            HttpServletRequest req, @RequestBody AssetEntry body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(profileService.addAsset(uid(req), body));
    }

    @PutMapping("/assets/{id}")
    @Operation(operationId = "updateAsset", summary = "Update an asset")
    public ResponseEntity<FinancialProfileDocument> updateAsset(
            HttpServletRequest req, @PathVariable String id, @RequestBody AssetEntry body) {
        return ResponseEntity.ok(profileService.updateAsset(uid(req), id, body));
    }

    @DeleteMapping("/assets/{id}")
    @Operation(operationId = "deleteAsset", summary = "Delete an asset")
    public ResponseEntity<FinancialProfileDocument> deleteAsset(
            HttpServletRequest req, @PathVariable String id) {
        return ResponseEntity.ok(profileService.deleteAsset(uid(req), id));
    }

    // ─── Liabilities ─────────────────────────────────────────────────────────

    @PostMapping("/liabilities")
    @Operation(operationId = "createLiability", summary = "Add a liability")
    public ResponseEntity<FinancialProfileDocument> addLiability(
            HttpServletRequest req, @RequestBody LiabilityEntry body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(profileService.addLiability(uid(req), body));
    }

    @PutMapping("/liabilities/{id}")
    @Operation(operationId = "updateLiability", summary = "Update a liability")
    public ResponseEntity<FinancialProfileDocument> updateLiability(
            HttpServletRequest req, @PathVariable String id, @RequestBody LiabilityEntry body) {
        return ResponseEntity.ok(profileService.updateLiability(uid(req), id, body));
    }

    @DeleteMapping("/liabilities/{id}")
    @Operation(operationId = "deleteLiability", summary = "Delete a liability")
    public ResponseEntity<FinancialProfileDocument> deleteLiability(
            HttpServletRequest req, @PathVariable String id) {
        return ResponseEntity.ok(profileService.deleteLiability(uid(req), id));
    }

    // ─── Incomes ─────────────────────────────────────────────────────────────

    @PostMapping("/incomes")
    @Operation(operationId = "createIncome", summary = "Add an income source")
    public ResponseEntity<FinancialProfileDocument> addIncome(
            HttpServletRequest req, @RequestBody IncomeEntry body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(profileService.addIncome(uid(req), body));
    }

    @PutMapping("/incomes/{id}")
    @Operation(operationId = "updateIncome", summary = "Update an income source")
    public ResponseEntity<FinancialProfileDocument> updateIncome(
            HttpServletRequest req, @PathVariable String id, @RequestBody IncomeEntry body) {
        return ResponseEntity.ok(profileService.updateIncome(uid(req), id, body));
    }

    @DeleteMapping("/incomes/{id}")
    @Operation(operationId = "deleteIncome", summary = "Delete an income source")
    public ResponseEntity<FinancialProfileDocument> deleteIncome(
            HttpServletRequest req, @PathVariable String id) {
        return ResponseEntity.ok(profileService.deleteIncome(uid(req), id));
    }

    // ─── Expenses ────────────────────────────────────────────────────────────

    @PostMapping("/expenses")
    @Operation(operationId = "createExpense", summary = "Add an expense")
    public ResponseEntity<FinancialProfileDocument> addExpense(
            HttpServletRequest req, @RequestBody ExpenseEntry body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(profileService.addExpense(uid(req), body));
    }

    @PutMapping("/expenses/{id}")
    @Operation(operationId = "updateExpense", summary = "Update an expense")
    public ResponseEntity<FinancialProfileDocument> updateExpense(
            HttpServletRequest req, @PathVariable String id, @RequestBody ExpenseEntry body) {
        return ResponseEntity.ok(profileService.updateExpense(uid(req), id, body));
    }

    @DeleteMapping("/expenses/{id}")
    @Operation(operationId = "deleteExpense", summary = "Delete an expense")
    public ResponseEntity<FinancialProfileDocument> deleteExpense(
            HttpServletRequest req, @PathVariable String id) {
        return ResponseEntity.ok(profileService.deleteExpense(uid(req), id));
    }
}
