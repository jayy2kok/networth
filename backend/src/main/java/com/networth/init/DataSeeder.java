package com.networth.init;

import com.networth.model.document.UserDocument;
import com.networth.model.document.UserSettingsDocument;
import com.networth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds the dummy development user on every startup.
 * Idempotent — skips if user already exists.
 *
 * Remove this class in Phase 5 once Google OAuth is wired.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.findByGoogleId("dummy-local-dev").isPresent()) {
            log.info("✅ Dummy user already exists — skipping seed");
            return;
        }

        UserDocument dummy = UserDocument.builder()
                .googleId("dummy-local-dev")
                .email("dev@networth.local")
                .firstName("Dev")
                .lastName("User")
                .settings(UserSettingsDocument.builder()
                        .currencyCode("INR")
                        .retirementAge(60)
                        .expectedReturnRate(12.0)
                        .inflationRate(6.0)
                        .build())
                .build();

        UserDocument saved = userRepository.save(dummy);
        log.info("✅ Dummy user seeded — id: {}", saved.getId());
    }
}
