# TailAdmin React theme integration plan

## Approach

Integrate the free [TailAdmin React dashboard template](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard). Reuse its theme styles, layout, and applicable components rather than recreating the design; connect them to the existing net-worth pages and data. Use the [React demo](https://free-react-demo.tailadmin.com/) as the primary visual reference, and the [original demo](https://free-demo.tailadmin.com/) as a secondary reference where equivalent free React features exist.

The design direction is **refined financial operations**: TailAdmin's blue-accented navigation, light surfaces, clear financial metrics, and dark-mode counterpart. Planning DFII: **12/15** (impact 4, fit 5, feasibility 5, performance 5, consistency risk 2); validate during integration.

## Baseline and constraints

- The app already uses React 19, Vite, Tailwind CSS v4, React Router, and Recharts. `frontend/src/App.css` holds global theme tokens and custom component styles.
- `frontend/src/components/layout/PageContainer.jsx`, `Sidebar.jsx`, and `Navbar.jsx` provide the shell and mobile navigation. Keep existing routes and product branding.
- `frontend/src/hooks/useTheme.js` persists the `nw-theme` preference using `data-theme`; `frontend/src/main.jsx` bootstraps saved dark mode. Reconcile TailAdmin's theme mechanism with this contract.
- TailAdmin uses TypeScript; the existing frontend uses JavaScript. Evaluate direct reuse with minimal TypeScript configuration versus converting only selected components to JSX. Avoid a project-wide rewrite.
- Preserve Recharts, actual financial data, calculations, CRUD, imports, and existing user flows. Do not introduce demo data or demo-only navigation.

## Scope

- **In:** reuse applicable free template styles, fonts, assets, shell, and components across existing pages in light and dark modes, including responsive behavior.
- **Out:** rebuilding the theme from scratch, wholesale frontend replacement, paid/Pro features, backend/API changes, new financial features, and unrelated dependency upgrades.
- **Licensing:** confirm the license and retain required copyright and permission notices for copied template files. Verify fonts, icons, images, and other assets separately before reuse; do not assume Pro or demo assets are covered.

## Implementation checklist

1. [ ] Inspect the React template's current layout, styles, components, dependencies, license, and asset terms. Record the upstream commit, identify reusable free files, and choose the smallest workable TypeScript/JSX integration.
2. [ ] Capture baseline screenshots and check existing navigation, dashboard, forms, imports, modals, and theme switching at desktop and mobile widths. Inventory hard-coded colors and potential global CSS conflicts.
3. [ ] Bring in selected upstream theme styles, Outfit font, icons, and required dependencies, retaining attribution. Reconcile Tailwind v4 configuration and CSS resets with `frontend/src/App.css`; avoid unused template packages.
4. [ ] Integrate the template's sidebar, header, and layout into the existing shell, retaining routes, branding, responsive navigation, and accessible keyboard and focus behavior.
5. [ ] Integrate template theme switching with `useTheme.js` and `main.jsx`, preserving existing `nw-theme` preferences, system defaults, and reload behavior. Check for incorrect initial-theme flashes.
6. [ ] Apply suitable template dashboard cards and layout to `DashboardPage.jsx`, keeping existing data and Recharts. Make chart colors, tooltips, legends, and grids readable in both themes.
7. [ ] Reuse suitable template controls and styles across Investments, Assets, Liabilities, Budget, Profile, and Settings, plus shared modals, tables, forms, upload controls, and feedback states. Preserve functionality and mobile presentation.
8. [ ] Remove obsolete or conflicting styles after migration; update `docs/architecture.md` if theme architecture changes. Record imported upstream files and local adaptations for future updates.
9. [ ] Run the frontend production build and relevant existing tests; rebuild with Docker Compose if available. Check all routes and interactions in both themes at approximately 375px, 768px, and 1440px, including keyboard navigation, contrast, reduced motion, and horizontal overflow. Document untested areas.

## Acceptance criteria

- The UI uses identifiable free TailAdmin React styles and components, while retaining the application's branding and data.
- Existing routes, calculations, forms, imports, modals, and settings work without demo data or dead controls.
- Light/dark preference persists across reloads; pages remain readable, responsive, and keyboard accessible.
- The frontend build passes, third-party notices are retained as required, and imported code can be traced to an upstream commit.