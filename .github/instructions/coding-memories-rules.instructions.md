---
description: "SECONDARY FALLBACK ONLY: Stored snapshot of Hindsight Coding-memories rules. Used ONLY when Hindsight MCP is inaccessible or offline."
applyTo: "**/*"
---

# Development & Engineering Rules (Offline / Fallback Snapshot)

> **CRITICAL PRECEDENCE NOTICE**:
> **Hindsight MCP is the PRIMARY source of truth.**
> Always query live Hindsight knowledge pages under `Coding-memories` first via `mcp_hindsight_mcp_*` tools.
> **DO NOT** use this static file if Hindsight MCP is online and accessible. Use this document ONLY as an emergency offline fallback when the Hindsight MCP service is unreachable, returns connection errors, or times out.

---

## 1. Coding Rules
1. **Preferred Technology Stack**: Java / Spring Boot / React / Flutter unless explicitly specified otherwise. Follow YAGNI (You Aren't Gonna Need It) strictly; avoid premature abstractions and unneeded boilerplate.
2. **Build & Dependency Management**:
   - Always use **Maven** as the build and dependency manager for Java projects.
   - Keep dependencies up-to-date with latest stable versions.
3. **API Standards**:
   - Prefer **RESTful APIs** by default.
   - Always write and maintain **OpenAPI specifications**. Keep OpenAPI specs synchronized immediately with any API or schema modifications.
4. **Context & Scope Tracking**:
   - Always check `plan.md` or `architecture.md` for project scope, goals, and architectural guidelines. Keep these documents updated with project changes.
5. **Testing Philosophy**:
   - Prefer **integration tests and end-to-end tests** over isolated unit tests.
6. **Domain Skills & Best Practices**:
   - Apply domain-specific patterns and skills (e.g. `java-springboot`, `frontend-design`, `react-best-practices`, `flutter-expert`).
7. **Task Execution & Workflow**:
   - Divide work into small, testable tasks. Verify functionality after each task.
8. **Git & Branching Workflow**:
   - Commit regularly with meaningful, conventional commit messages.
   - Always use `feature/*` for new features and `bugfix/*` for bug fixes.
   - Never commit directly to `main` or `master` branches unless explicitly instructed.
9. **Docker**:
   - Prefer Docker for local development and testing when available.

---

## 2. Application Design & Architecture Rules
1. **Less Code is Better**: Minimize code footprint. The best code is code you don't need to write or maintain. Avoid over-engineering and speculative generalization.
2. **Single Responsibility Principle (SRP)**: Keep classes, components, modules, and methods focused on a single responsibility.
3. **Naming Conventions**: Use clear, descriptive, and unambiguous names for classes, functions, variables, and database entities.
4. **Open Source Over Proprietary**:
   - Prefer well-maintained open-source libraries and frameworks over writing custom implementations from scratch.
   - Prefer free and open-source solutions over proprietary ones unless compelling architectural requirements dictate otherwise.
5. **Containerized Environments**: Prefer dockerized solutions for both development workflows and deployment architectures.

---

## 3. Application Security Rules
1. **SQL Injection Prevention**:
   - Ensure all user inputs are strictly sanitized and validated.
   - Always use parameterized queries or prepared statements when executing database operations. Never concatenate or interpolate untrusted strings into queries.
2. **Cross-Site Scripting (XSS) Prevention**:
   - Implement strict input validation and contextual output encoding across all user-facing endpoints.
   - Use battle-tested libraries and frameworks that automatically escape and sanitize user-generated content before rendering.
3. **Credentials & Secrets Protection**:
   - **Zero Secrets in Git**: Never check in passwords, API keys, private tokens, certificates, or sensitive credentials into GitHub or any version control system.
   - Ensure local environment files (e.g., `.env`, local configuration files, secret vaults) are explicitly included in `.gitignore`.
4. **Security Audits**:
   - Proactively apply the `security-audit` skill whenever performing security reviews, audits, or pre-release checklists.

---

## 4. Verification and Testing Rules
1. **Build and Test Environment**:
   - Prefer `docker build` and `docker test` over local host builds and tests to guarantee reproducibility, dependency consistency, and isolation from host machine variance.
   - Avoid reliance on host-specific environmental quirks or cross-drive path configurations.
2. **Integration and E2E Focus**:
   - Prioritize End-to-End (E2E) and Integration testing over isolated mocked tests to validate real component interactions, data persistence, and full lifecycle behaviors.
3. **Code Coverage & Quality Gates**:
   - Maintain healthy test coverage across code modifications.
   - Require real test executions with confirmed pass counts and exported test logs/reports (e.g., JUnit XML reports).
   - Empty test suites, `NO-SOURCE` runs, or piggybacking on third-party test suites do not constitute valid test coverage.
4. **UI Visual Verification**:
   - For all UI code changes, **always perform visual verification** (e.g., browser checks or screenshots) before confirming or finalizing changes.
   - Use **Playwright** for web UI automation and regression testing.
   - Use **Appium** for Flutter mobile automation testing.
   - Use **JUnit integration tests** for backend Java and Spring Boot services.
