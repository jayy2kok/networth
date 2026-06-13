package com.networth.filter;

import com.networth.model.document.UserDocument;
import com.networth.model.document.UserSettingsDocument;
import com.networth.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Phase 1–4 only.
 * Injects the hardcoded dummy user ID into every request attribute so
 * controllers can read it without any authentication token.
 *
 * Phase 5 will replace this with JwtAuthenticationFilter.
 */
@Component
@Order(1)
@Slf4j
@RequiredArgsConstructor
public class DummyUserFilter extends OncePerRequestFilter {

    /** Request attribute key consumed by controllers. */
    public static final String CURRENT_USER_ID_ATTR = "currentUserId";
    public static final String DUMMY_GOOGLE_ID = "dummy-local-dev";

    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain)
            throws ServletException, IOException {

        UserDocument user = userRepository.findByGoogleId(DUMMY_GOOGLE_ID)
                .orElseGet(this::createDummyUser);

        request.setAttribute(CURRENT_USER_ID_ATTR, user.getId());
        filterChain.doFilter(request, response);
    }

    /** Safety net: creates dummy user if DataSeeder hasn't run yet. */
    private UserDocument createDummyUser() {
        log.warn("Dummy user missing — creating on demand (DataSeeder may not have run yet)");
        return userRepository.save(
                UserDocument.builder()
                        .googleId(DUMMY_GOOGLE_ID)
                        .email("dev@networth.local")
                        .firstName("Dev")
                        .lastName("User")
                        .settings(UserSettingsDocument.builder()
                                .currencyCode("INR")
                                .retirementAge(60)
                                .expectedReturnRate(12.0)
                                .inflationRate(6.0)
                                .build())
                        .build()
        );
    }
}
