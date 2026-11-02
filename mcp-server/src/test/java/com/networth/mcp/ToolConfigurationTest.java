package com.networth.mcp;

import com.networth.mcp.service.PortfolioReadService;
import org.junit.jupiter.api.Test;
import java.util.Arrays;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

class ToolConfigurationTest {
    @Test
    void registersAllPortfolioTools() {
        var callbacks = new ToolConfiguration().portfolioToolCallbacks(
                new PortfolioTools(mock(PortfolioReadService.class))).getToolCallbacks();
        var names = Arrays.stream(callbacks).map(callback -> callback.getToolDefinition().name()).sorted().toList();
        assertEquals(java.util.List.of("getFinancialSummary", "getNetworthHistory", "getPortfolioHoldings"), names);
    }
}