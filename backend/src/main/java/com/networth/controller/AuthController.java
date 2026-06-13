package com.networth.controller;

import com.networth.filter.DummyUserFilter;
import com.networth.model.document.UserDocument;
import com.networth.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(operationId = "getCurrentUser", summary = "Get current authenticated user")
    public ResponseEntity<UserDocument> getCurrentUser(HttpServletRequest request) {
        String userId = (String) request.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(userService.getById(userId));
    }

    // ── Phase 5 stubs ─────────────────────────────────────────────────────

    @GetMapping("/google")
    @Operation(operationId = "initiateGoogleLogin", summary = "Initiate Google OAuth login [Phase 5]")
    public ResponseEntity<Void> initiateGoogleLogin() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @GetMapping("/google/callback")
    @Operation(operationId = "googleOAuthCallback", summary = "Google OAuth callback [Phase 5]")
    public ResponseEntity<Void> googleCallback() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping("/logout")
    @Operation(operationId = "logout", summary = "Logout [Phase 5]")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }
}
