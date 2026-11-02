# Hermes MCP setup

This implementation provides the plan's first client target: Hermes. It is a **read-only** portfolio MCP service. It does not fetch market news, schedule Hermes, or send alerts; those remain Hermes responsibilities.

## Local development

1. Set `MONGO_URI` in the root `.env` to the remote MongoDB connection URI, including the database name, then start the Networth services. Optionally set `MCP_MONGO_URI` to a separate read-only URI for the same database; otherwise the MCP service uses `MONGO_URI`.
2. Open **Settings → MCP access**, create a `Hermes` key, and copy the displayed secret once.
3. Run the standalone service with `MONGO_URI` pointing to the same database:

   Set `MONGO_URI` in your shell to the remote URI, then run `mvn spring-boot:run` from `mcp-server/`. Do not commit or share the URI if it contains credentials.

4. Configure Hermes to use `http://localhost:8080/mcp` with an `Authorization: Bearer <copied-key>` header. Store the key in Hermes' secret store, never in a prompt, URL, config committed to Git, or log.

## Oracle deployment template

`deploy/oracle/` contains deployment templates only. Before deploying:

- Set a stable DuckDNS name and obtain a valid TLS certificate.
- Build and publish an immutable `mcp-server` image; set its reference in the private `.env` file.
- Create a distinct Atlas reader role for the MCP service. It needs reads only on `financial_profiles`, `snapshots`, and `mcp_api_keys`; it must not write or create indexes.
- Allow-list only Oracle's and the home server's current egress IPs in Atlas. Do not use `0.0.0.0/0`.
- Keep the MCP application port private; expose only Nginx HTTPS.
- Test a real Hermes connection, tool discovery, rejection of expired/revoked credentials, and no-write DB permissions before enabling schedules.

## Current limitation

Key management currently follows the requested local-host workflow and uses the existing `DummyUserFilter`. **Do not expose `/api/mcp-keys` beyond the trusted home network.** Replace dummy identity with verified Google OIDC before enabling key management for multiple users or public access.