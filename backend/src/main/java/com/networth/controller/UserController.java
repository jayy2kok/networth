package com.networth.controller;

import com.networth.filter.DummyUserFilter;
import com.networth.model.document.UserDocument;
import com.networth.model.document.UserSettingsDocument;
import com.networth.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Profile")
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    @Operation(operationId = "getUserProfile", summary = "Get user profile")
    public ResponseEntity<UserDocument> getUserProfile(HttpServletRequest request) {
        String userId = (String) request.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR);
        return ResponseEntity.ok(userService.getById(userId));
    }

    @PutMapping("/profile")
    @Operation(operationId = "updateUserProfile", summary = "Update user profile")
    public ResponseEntity<UserDocument> updateUserProfile(
            HttpServletRequest request,
            @RequestBody UpdateProfileRequest body) {
        String userId = (String) request.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR);
        return ResponseEntity.ok(
                userService.updateProfile(userId, body.firstName(), body.lastName()));
    }

    /**
     * Phase 5 stub — settings update requires UserSettings schema (generated model).
     * Will be fully implemented in Phase 2.
     */
    @PutMapping("/settings")
    @Operation(operationId = "updateUserSettings", summary = "Update user settings")
    public ResponseEntity<UserDocument> updateUserSettings(
            HttpServletRequest request,
            @RequestBody UserSettingsDocument body) {
        String userId = (String) request.getAttribute(DummyUserFilter.CURRENT_USER_ID_ATTR);
        return ResponseEntity.ok(userService.updateSettings(userId, body));
    }

    record UpdateProfileRequest(String firstName, String lastName) {}
}
