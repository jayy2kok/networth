package com.networth.mcp;

import com.networth.mcp.security.McpApiKeyFilter;
import com.networth.mcp.service.PortfolioReadService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;

@Component
public class PortfolioTools {
    private final PortfolioReadService portfolioReadService;

    public PortfolioTools(PortfolioReadService portfolioReadService) {
        this.portfolioReadService = portfolioReadService;
    }

    @Tool(description = "Get the authenticated owner's current financial summary. Totals are based on stored INR values and include warnings for limitations.")
    public Map<String, Object> getFinancialSummary() {
        return portfolioReadService.summary(ownerId());
    }

    @Tool(description = "Get a bounded list of the authenticated owner's portfolio holdings. Stored values are observations and may not be live prices.")
    public Map<String, Object> getPortfolioHoldings(
            @ToolParam(description = "Optional investment type filter, such as EQUITY or ETF.", required = false) String investmentType,
            @ToolParam(description = "Maximum holdings to return, from 1 through 100.", required = false) int limit) {
        return portfolioReadService.holdings(ownerId(), investmentType, limit);
    }

    @Tool(description = "Get a bounded history of the authenticated owner's aggregate net-worth snapshots. Snapshot changes are not investment returns.")
    public Map<String, Object> getNetworthHistory(
            @ToolParam(description = "Optional inclusive start date in ISO-8601 YYYY-MM-DD format.", required = false) String from,
            @ToolParam(description = "Optional inclusive end date in ISO-8601 YYYY-MM-DD format.", required = false) String to,
            @ToolParam(description = "Maximum snapshots to return, from 1 through 100.", required = false) int limit) {
        return portfolioReadService.history(ownerId(), from, to, limit);
    }

    private String ownerId() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
        HttpServletRequest request = attributes.getRequest();
        return (String) request.getAttribute(McpApiKeyFilter.OWNER_ID_ATTRIBUTE);
    }
}