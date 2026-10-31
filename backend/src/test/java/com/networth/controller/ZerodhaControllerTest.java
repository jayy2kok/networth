package com.networth.controller;

import com.networth.service.ZerodhaService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ZerodhaControllerTest {
    private final ZerodhaService service = mock(ZerodhaService.class);
    private final ZerodhaController controller = new ZerodhaController(service);

    @Test
    void loginResponseIncludesConfiguredAndUrl() {
        when(service.getLoginUrl()).thenReturn("https://kite.example/login");

        var response = controller.loginUrl();

        assertEquals(true, response.get("configured"));
        assertEquals("https://kite.example/login", response.get("loginUrl"));
    }

    @Test
    void unconfiguredIntegrationReturnsServiceUnavailable() {
        var error = new ZerodhaService.ZerodhaException("Zerodha integration is not configured", 503);
        var response = controller.handleZerodha(error);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("Zerodha integration is not configured", response.getBody().get("error"));
    }
}