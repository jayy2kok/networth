---
description: "Authoritative Memory-First Policy: Hindsight MCP is the PRIMARY source of truth for all rules, preferences, conventions, and architectural standards. Fall back to local instructions ONLY if Hindsight is inaccessible."
applyTo: "**/*"
---

# Memory-First Policy (Hindsight MCP - Primary Source of Truth)

**Hindsight MCP is the PRIMARY and AUTHORITATIVE source of truth** for all rules, coding standards, architecture, security policies, conventions, and developer preferences across all workspaces.

Agents MUST query Hindsight first. Only if the Hindsight MCP service is unreachable, disabled, or fails should the agent fall back to static local instructions (`coding-memories-rules.instructions.md`).

---

## 1. Query Hindsight First (Primary Workflow)
Whenever starting tasks, reasoning about architecture, generating code, or planning tests:
- **Core Knowledge Base Pages**: Consult live knowledge pages under `Coding-memories` (`Coding Rules`, `Application Security rules`, `Application design / Architecture rules`, `Verification and testing rules`) using `mcp_hindsight_mcp_get_knowledge_page` or `mcp_hindsight_mcp_search_knowledge_base`.
- **Fast lookups / direct facts**: Call `mcp_hindsight_mcp_recall` with targeted queries (e.g., `"build preference"`, `"testing strategy"`, `"coding style"`).
- **Synthesized preferences**: Call `mcp_hindsight_mcp_reflect` or check mental models for developer patterns.
- **Project-specific context**: Recall memories tagged with `project:<name>`.

---

## 2. Fallback Protocol (If Hindsight Is Inaccessible)
- If and ONLY if Hindsight MCP tools return connection errors, timeouts, or are unavailable in the session:
  - Fall back to the cached static snapshot in `coding-memories-rules.instructions.md`.
  - Do NOT invent or alter baseline preferences.

---

## 3. Decision Protocol
- **Match found in Hindsight**: Silently adopt and strictly enforce the stored rules and preferences. Do not ask the user to confirm what is already documented.
- **Match not found or genuinely ambiguous**: Only after checking Hindsight and finding no answer, ask the user concise, targeted questions.

---

## 4. Retain New Preferences & Rules Proactively
Whenever the user states a new decision, rule, convention, or preference:
- Immediately persist it to Hindsight via `mcp_hindsight_mcp_retain`:
  - `content`: Explicit statement of the rule or preference.
  - `tags`: Include `"preference"`, `"coding-memories"`, and any relevant project scope tag.
