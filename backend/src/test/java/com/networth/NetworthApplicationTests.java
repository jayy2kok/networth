package com.networth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Verifies the Spring application context loads successfully.
 * Uses Flapdoodle embedded MongoDB (de.flapdoodle.embed.mongo.spring3x)
 * to satisfy the MongoDB dependency without a real connection.
 */
@SpringBootTest
class NetworthApplicationTests {

    @Test
    void contextLoads() {
        // If the context fails to load, this test fails — ensuring
        // wiring issues are caught before docker compose build.
    }
}
