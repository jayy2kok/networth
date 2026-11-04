package com.networth.mcp.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Date;

/** Validates home-issued API keys on every MCP request; no positive cache is used. */
@Component
public class McpApiKeyFilter extends OncePerRequestFilter {
    public static final String OWNER_ID_ATTRIBUTE = "mcpOwnerId";
    private final MongoTemplate mongoTemplate;

    public McpApiKeyFilter(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/mcp");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            reject(response);
            return;
        }
        String[] parts = authorization.substring(7).split("\\.", 2);
        if (parts.length != 2) {
            reject(response);
            return;
        }
        Document key = mongoTemplate.getCollection("mcp_api_keys").find(new Document("keyId", parts[0])).first();
        if (key == null || key.getDate("revokedAt") != null || isExpired(key.getDate("expiresAt"))
                || !MessageDigest.isEqual(ascii(key.getString("secretHash")), ascii(sha256(parts[1])))) {
            reject(response);
            return;
        }
        request.setAttribute(OWNER_ID_ATTRIBUTE, key.getString("userId"));
        filterChain.doFilter(request, response);
    }

    private static boolean isExpired(Date expiresAt) {
        return expiresAt == null || !expiresAt.after(new Date());
    }

    private static byte[] ascii(String value) {
        return value == null ? new byte[0] : value.getBytes(StandardCharsets.US_ASCII);
    }

    private static String sha256(String value) {
        try {
            return Base64.getUrlEncoder().withoutPadding().encodeToString(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash MCP key", exception);
        }
    }

    private static void reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"invalid or expired MCP credential\"}");
    }
}