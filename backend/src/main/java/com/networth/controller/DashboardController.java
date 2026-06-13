package com.networth.controller;

import com.networth.filter.DummyUserFilter;
import com.networth.model.DashboardSummary;
import com.networth.service.CalculationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Serves the computed dashboard summary.
 * GET /api/dashboard/summary — returns all calculated KPIs.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final CalculationService calculationService;

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummary> getSummary(HttpServletRequest req) {
        String userId = (String) req.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR);
        return ResponseEntity.ok(calculationService.calculate(userId));
    }
}
