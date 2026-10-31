package com.networth.controller;

import com.networth.filter.DummyUserFilter;
import com.networth.service.ZerodhaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/zerodha")
@RequiredArgsConstructor
public class ZerodhaController {
    private final ZerodhaService service;

    public record SyncRequest(@NotBlank(message = "requestToken is required") String requestToken) { }

    @GetMapping("/login-url")
    public Map<String, Object> loginUrl() { return Map.of("configured", true, "loginUrl", service.getLoginUrl()); }

    @PostMapping("/sync")
    public ZerodhaService.SyncResult sync(HttpServletRequest request, @Valid @RequestBody SyncRequest body) {
        return service.syncPortfolio((String) request.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR), body.requestToken());
    }

    @ExceptionHandler(ZerodhaService.ZerodhaException.class)
    public ResponseEntity<Map<String, String>> handleZerodha(ZerodhaService.ZerodhaException e) {
        return ResponseEntity.status(e.getStatus()).body(Map.of("error", e.getMessage()));
    }
}