# Personal Net Worth Calculator — Architecture Document

## 1. Overview

A full-stack web application that helps users track their personal net worth, track investment categories (METALS, LIQUID, DOMESTIC, INTERNATIONAL), manage assets, liabilities, budget expenses, and calculate F.I.R.E. (Financial Independence, Retire Early) goals — replacing the current Excel-based workflow.

### Reference: User's Excel Layout

The existing Excel tracker has six key sections that this app will replicate and enhance:

| Excel Section | App Equivalent |
|---|---|
| Asset Allocation (Ideal vs Current %) | Investment categories pie chart (METALS, LIQUID, DOMESTIC, INTERNATIONAL) |
| Investment Data (instrument-level) | Investments module with cost vs market value |
| Liability/Loans (EMI, ROI, tenure) | Loans module with amortization tracking |
| Expense Details (Need/Want/Savings 65/15/20) | Budget module with projected vs actuals |
| Asset Data (acquisition cost vs market value) | Assets module with multi-currency appreciation tracking |
| Summary Dashboard (Net Worth, FIRE, Runway) | Main Dashboard with charts and KPIs |
| — | User Profile (name, DOB, login email) |

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React (Vite) | React 19, Vite 6 |
| UI Charts | Recharts | Latest |
| Styling | Tailwind CSS v4 | CSS-first config (`@theme`) |
| Backend | Java Spring Boot | 3.x (Java 21 LTS) |
| Build Tool | Maven | Latest |
| Database | MongoDB | 7.x |
| Authentication | Google OAuth 2.0 (via Spring Security) | — |
| Containerization | Docker + Docker Compose | — |

---

## 3. System Architecture

```mermaid
graph TB
    subgraph Docker Compose
        subgraph Frontend["Frontend Container (Port 5050)"]
            React["React App (Vite)"]
            Nginx["Nginx (Production)"]
        end

        subgraph Backend["Backend Container (Port 6060)"]
            Spring["Spring Boot 3.x"]
            JWT["JWT Auth Filter"]
            REST["REST API"]
            CalcService["Calculation Service"]
            CASCtrl["CAS Import Controller"]
            MFService["MF Pricing Service"]
            Scheduler["NAV Refresh Scheduler (6h)"]
        end

        subgraph CASParser["CAS Parser Sidecar (Port 7070)"]
            FastAPI["FastAPI App"]
            Parser["casparser library"]
        end

        subgraph DB["MongoDB Container (Port 27017)"]
            Users["users collection"]
            Profiles["financial_profiles collection"]
            Snapshots["snapshots collection"]
            NavCache["mf_nav_cache collection"]
        end
    end

    MFAPI["api.mfapi.in (External)"]

    User["👤 User"] --> React
    React --> REST
    REST --> JWT
    JWT --> CalcService
    CalcService --> DB
    React -->|"POST /api/cas/import"| CASCtrl
    CASCtrl -->|"POST /parse (PDF+password)"| FastAPI
    CASCtrl --> DB
    MFService -->|"GET /mf/code/latest"| MFAPI
    Scheduler -->|"every 6h"| MFService
    MFService --> DB
    React -->|"OAuth Redirect"| Google["Google OAuth 2.0"]
    Google -->|"Auth Code"| Spring
```

### Authentication Flow

1. User clicks "Sign in with Google" on the frontend
2. Frontend redirects to Google OAuth consent screen
3. Google returns authorization code to backend callback URL
4. Backend exchanges code for tokens, creates/updates user in MongoDB
5. Backend issues a JWT token to the frontend
6. Frontend stores JWT and sends it with every API request

---

## 4. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string googleId UK
        string email UK
        string firstName
        string lastName
        string avatarUrl
        object settings
        datetime createdAt
        datetime updatedAt
    }

    USER_SETTINGS {
        string dateOfBirth
        string currencyCode
        int retirementAge
        double expectedReturnRate
        double inflationRate
    }

    FINANCIAL_PROFILE {
        ObjectId _id PK
        ObjectId userId FK
        datetime updatedAt
    }

    INVESTMENT {
        string id PK
        string name
        string investmentType
        double investedValue
        double currentValue
        double currentValueINR
        string currency
        boolean transactionsLinked
        array categories
        datetime createdAt
        datetime updatedAt
    }

    ASSET {
        string id PK
        string name
        string type
        double acquisitionCost
        double currentValue
        double currentValueINR
        string currency
        double percentChange
        datetime createdAt
        datetime updatedAt
    }

    LIABILITY {
        string id PK
        string name
        string type
        double outstandingAmount
        double emi
        double roi
        string loanType
        string currency
        date firstEmiDate
        int tenureYears
        int remainingEmis
        datetime createdAt
        datetime updatedAt
    }

    INCOME {
        string id PK
        string source
        double amount
        string currency
        double amountInr
        string frequency
        datetime createdAt
        datetime updatedAt
    }

    EXPENSE {
        string id PK
        string name
        string category
        double amount
        string frequency
        string currency
        double monthlyAmountINR
        double annualAmountINR
        boolean isProjected
    }

    SNAPSHOT {
        ObjectId _id PK
        ObjectId userId FK
        date snapshotDate
        double totalAssets
        double totalLiabilities
        double netWorth
        double liquidAssets
        double totalInvestments
        double totalRealEstate
        object liabilitiesBreakdown
        double fireAmount
        double fireDiff
        int runwayMonths
        double savingsRate
        datetime createdAt
    }

    MF_INVESTMENT {
        string amfiCode
        string isin
        string folio
        string amc
        string schemeRtaCode
        double units
        double latestNav
        string navDate
        datetime navUpdatedAt
    }

    MUTUAL_FUND_TRANSACTION {
        string id PK
        string investmentId FK
        date date
        string description
        double amount
        double units
        double nav
        double balance
        string type
        datetime importedAt
    }

    MF_NAV_CACHE {
        string id PK
        string schemeCode UK
        string schemeName
        string fundHouse
        string schemeCategory
        string isinGrowth
        double latestNav
        string navDate
        datetime fetchedAt
    }

    USER ||--|| FINANCIAL_PROFILE : "has one"
    USER ||--o{ SNAPSHOT : "has many"
    USER ||--|| USER_SETTINGS : "has one"
    FINANCIAL_PROFILE ||--o{ INVESTMENT : "contains"
    FINANCIAL_PROFILE ||--o{ ASSET : "contains"
    FINANCIAL_PROFILE ||--o{ LIABILITY : "contains"
    FINANCIAL_PROFILE ||--o{ INCOME : "contains"
    FINANCIAL_PROFILE ||--o{ EXPENSE : "contains"
    INVESTMENT ||--|{ MF_INVESTMENT : "specializes"
    MF_INVESTMENT ||--o{ MUTUAL_FUND_TRANSACTION : "has many"
```

### ERD Notes

- **USER ↔ FINANCIAL_PROFILE**: One-to-one relationship. Each user has exactly one financial profile.
- **USER ↔ SNAPSHOT**: One-to-many. A user accumulates monthly snapshots for historical tracking.
- **USER ↔ USER_SETTINGS**: One-to-one. Embedded sub-document storing personal settings (DOB, currency, retirement age, expected return rate, inflation rate) with sensible defaults.
- **FINANCIAL_PROFILE** embeds all sub-entities (investments, assets, liabilities, incomes, expenses) as nested arrays within a single MongoDB document — this avoids JOINs and keeps reads fast.
- **INVESTMENT, ASSET, LIABILITY, INCOME, EXPENSE** each have a UUID `id` field for client-side identification and targeted CRUD operations within the embedded arrays.
- **Multi-currency support**: Investment, Asset, Liability, Income, and Expense entities include a `currency` field with server-computed INR equivalents.
- **MF_INVESTMENT ↔ INVESTMENT**: Specialization (subclass). CAS-imported mutual fund investments extend `INVESTMENT` with MF-specific fields (`amfiCode`, `isin`, `folio`, `units`, `latestNav`). Generated as `MFInvestment extends Investment` via OpenAPI `allOf`. The `source` field is `CAS_IMPORT`.
- **MUTUAL_FUND_TRANSACTION**: Stored in a separate `mutual_fund_transactions` collection (not embedded in `financial_profiles`). Linked to the parent MF investment via `investmentId`. The `transactionsLinked` boolean on `INVESTMENT` indicates whether an investment has associated transaction records. Contains individual transaction records parsed from CAS statements (SIP, redemption, switch, dividend, etc.).
- **MF_NAV_CACHE**: Separate collection caching latest NAV data from [mfapi.in](https://api.mfapi.in/). Refreshed every 6 hours by `NavRefreshScheduler`. Keyed by `schemeCode` (AMFI code).

---

## 5. Data Model (MongoDB Collections)

### 5.1 `users`

```json
{
  "_id": "ObjectId",
  "googleId": "string (unique)",
  "email": "string (unique)",
  "firstName": "string",
  "lastName": "string",
  "avatarUrl": "string",
  "settings": {
    "dateOfBirth": "string (YYYY-MM-DD)",
    "currencyCode": "INR",
    "retirementAge": 60,
    "expectedReturnRate": 12.0,
    "inflationRate": 6.0
  },
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 5.2 `financial_profiles`

One document per user — the core financial data.

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users)",

  "investments": [
    {
      "id": "uuid",
      "name": "Mutual funds",
      "investmentType": "EQUITY",
      "investedValue": 3059347,
      "currentValue": 3502997,
      "currentValueINR": 3502997,
      "currency": "INR",
      "categories": ["DOMESTIC", "LIQUID"],
      "createdAt": "ISODate",
      "updatedAt": "ISODate"
    },
    {
      "id": "uuid",
      "name": "NPS",
      "investmentType": "RETIRALS",
      "investedValue": 1154709,
      "currentValue": 1289244,
      "currentValueINR": 1289244,
      "currency": "INR",
      "categories": ["DOMESTIC"],
      "createdAt": "ISODate",
      "updatedAt": "ISODate"
    },
    {
      "id": "uuid",
      "name": "US Equity Fund",
      "investmentType": "EQUITY",
      "investedValue": 9988,
      "currentValue": 9988,
      "currentValueINR": 948243,
      "currency": "USD",
      "categories": ["INTERNATIONAL", "LIQUID"],
      "createdAt": "ISODate",
      "updatedAt": "ISODate"
    }
  ],

  "assets": [
    {
      "id": "uuid",
      "name": "Ganga Kalash (Flat)",
      "type": "REAL_ESTATE",
      "acquisitionCost": 4600000,
      "currentValue": 7500000,
      "currentValueINR": 7500000,
      "currency": "INR",
      "percentChange": 63.0,
      "createdAt": "ISODate",
      "updatedAt": "ISODate"
    },
    {
      "id": "uuid",
      "name": "Farm (Land)",
      "type": "REAL_ESTATE",
      "acquisitionCost": 1200000,
      "currentValue": 1200000,
      "currentValueINR": 1200000,
      "currency": "INR",
      "percentChange": 0.0,
      "createdAt": "ISODate",
      "updatedAt": "ISODate"
    }
  ],

  "liabilities": [
    {
      "id": "uuid",
      "name": "BoI",
      "type": "HOME_LOAN",
      "outstandingAmount": 9650297,
      "emi": 76432,
      "roi": 7.1,
      "loanType": "OD",
      "currency": "INR",
      "firstEmiDate": "2025-11-21",
      "tenureYears": 20,
      "remainingEmis": 233,
      "createdAt": "ISODate",
      "updatedAt": "ISODate"
    },
    {
      "id": "uuid",
      "name": "HSBC 220",
      "type": "HOME_LOAN",
      "outstandingAmount": 1842780,
      "emi": 22022,
      "roi": 7.25,
      "loanType": "REGULAR",
      "currency": "INR",
      "firstEmiDate": null,
      "tenureYears": null,
      "remainingEmis": null,
      "createdAt": "ISODate",
      "updatedAt": "ISODate"
    }
  ],

  "incomes": [
    {
      "id": "uuid",
      "source": "SALARY",
      "amount": 588260,
      "currency": "INR",
      "amountInr": 588260,
      "frequency": "MONTHLY",
      "createdAt": "ISODate",
      "updatedAt": "ISODate"
    },
    {
      "id": "uuid",
      "source": "RENTAL",
      "amount": 25000,
      "currency": "INR",
      "amountInr": 25000,
      "frequency": "MONTHLY",
      "createdAt": "ISODate",
      "updatedAt": "ISODate"
    }
  ],

  "expenses": [
    {
      "id": "uuid",
      "name": "Home Loan EMI",
      "category": "NEED",
      "amount": 126389,
      "frequency": "MONTHLY",
      "currency": "INR",
      "monthlyAmountINR": 126389,
      "annualAmountINR": 1516660,
      "isProjected": true
    },
    {
      "id": "uuid",
      "name": "CAR + Driver",
      "category": "NEED",
      "amount": 100000,
      "frequency": "MONTHLY",
      "currency": "INR",
      "monthlyAmountINR": 100000,
      "annualAmountINR": 1200000,
      "isProjected": true
    },
    {
      "id": "uuid",
      "name": "Groceries",
      "category": "NEED",
      "amount": 21000,
      "frequency": "MONTHLY",
      "currency": "INR",
      "monthlyAmountINR": 21000,
      "annualAmountINR": 252000,
      "isProjected": true
    },
    {
      "id": "uuid",
      "name": "Travel",
      "category": "WANT",
      "amount": 100000,
      "frequency": "YEARLY",
      "currency": "INR",
      "monthlyAmountINR": 8333,
      "annualAmountINR": 100000,
      "isProjected": true
    }
  ],
  "updatedAt": "ISODate"
}
```

### 5.3 `snapshots` (for historical tracking)

Monthly snapshots for net worth over time chart.

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users)",
  "snapshotDate": "ISODate",
  "totalAssets": 32837412,
  "totalLiabilities": 13555512,
  "netWorth": 32837412,
  "liquidAssets": 7733096,
  "totalInvestments": 16447513,
  "totalRealEstate": 20500000,
  "totalLiabilitiesBreakdown": {
    "homeLoans": 13555512,
    "personalLoans": 0,
    "otherDebts": 0
  },
  "fireAmount": 62340000,
  "fireDiff": 29502588,
  "runwayMonths": 48,
  "savingsRate": 26.7,
  "createdAt": "ISODate"
}
```

### 5.4 `mf_nav_cache` (NAV caching)

Separate collection for caching mutual fund NAV data from [mfapi.in](https://api.mfapi.in/). One document per AMFI scheme code.

```json
{
  "_id": "ObjectId",
  "schemeCode": "125497",
  "schemeName": "HDFC Top 100 Fund - Direct Plan - Growth",
  "fundHouse": "HDFC Mutual Fund",
  "schemeCategory": "Equity Scheme - Large Cap Fund",
  "isinGrowth": "INF179K01BB2",
  "latestNav": 892.456,
  "navDate": "20-06-2025",
  "fetchedAt": "ISODate"
}
```

> [!NOTE]
> The `mf_nav_cache` collection has a unique index on `schemeCode`. Entries are refreshed every 6 hours by `NavRefreshScheduler`. The cache prevents excessive API calls to mfapi.in (free, rate-limited API). TTL-based eviction is not used — stale entries are overwritten on refresh.

### 5.5 `mutual_fund_transactions` (CAS transaction history)

Separate collection storing individual mutual fund transactions parsed from CAS statements. Linked to `MFInvestment` entries via `investmentId`. The parent investment's `transactionsLinked` boolean is set to `true` when transactions exist.

```json
{
  "_id": "ObjectId",
  "investmentId": "uuid (ref: financial_profiles.investments[].id)",
  "userId": "ObjectId (ref: users)",
  "date": "2024-04-15",
  "description": "Purchase - SIP",
  "amount": 5000.00,
  "units": 5.603,
  "nav": 892.456,
  "balance": 105.603,
  "type": "PURCHASE_SIP",
  "dividendRate": null,
  "importedAt": "ISODate"
}
```

> [!NOTE]
> Stored as a separate collection (not embedded in `financial_profiles`) to avoid document bloat — a user with 20 MF schemes and 50+ transactions each would push the profile document too large. Indexed on `investmentId` and `userId` for fast lookups. Duplicate detection during CAS re-import uses composite key: `investmentId + date + amount + units + description`.

---

## 6. API Design (REST Endpoints)

### 6.1 Authentication

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/auth/google` | Initiate Google OAuth login |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/logout` | Logout and invalidate session |
| GET | `/api/auth/me` | Get current user info |

### 6.2 User Profile & Settings

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/profile` | Get user profile (name, email, avatar, settings) |
| PUT | `/api/users/profile` | Update first name, last name |
| PUT | `/api/users/settings` | Update DOB, currency code, retirement age, expected return rate, inflation rate (returns `UserSettings`) |

### 6.3 Financial Profile

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profile` | Get full financial profile |
| POST | `/api/profile/investments` | Add an investment |
| PUT | `/api/profile/investments/{id}` | Update an investment |
| DELETE | `/api/profile/investments/{id}` | Delete an investment |
| POST | `/api/profile/assets` | Add an asset |
| PUT | `/api/profile/assets/{id}` | Update an asset |
| DELETE | `/api/profile/assets/{id}` | Delete an asset |
| POST | `/api/profile/liabilities` | Add a liability/loan |
| PUT | `/api/profile/liabilities/{id}` | Update a liability/loan |
| DELETE | `/api/profile/liabilities/{id}` | Delete a liability/loan |
| POST | `/api/profile/incomes` | Add an income source |
| PUT | `/api/profile/incomes/{id}` | Update an income source |
| DELETE | `/api/profile/incomes/{id}` | Delete an income source |
| POST | `/api/profile/expenses` | Add an expense item |
| PUT | `/api/profile/expenses/{id}` | Update an expense item |
| DELETE | `/api/profile/expenses/{id}` | Delete an expense item |

### 6.4 Dashboard / Calculations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | Computed summary (net worth, FIRE, runway, etc.) |

### 6.5 Snapshots (Historical)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/snapshots` | Take a manual snapshot of current state |
| GET | `/api/snapshots` | Get all snapshots (for net worth over time chart) |
| GET | `/api/snapshots/latest` | Get most recent snapshot |

### 6.6 Mutual Funds (CAS Import & Live Pricing)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/cas/import` | Upload CAS PDF (multipart + password) → parse and import MF holdings |
| GET | `/api/investments/{id}/transactions` | Get transaction history for a CAS-imported investment |
| POST | `/api/investments/refresh-nav` | Manually trigger NAV refresh for all CAS-imported investments |

> [!NOTE]
> CAS import accepts `multipart/form-data` with a PDF file and password (PAN). The backend forwards the PDF to the CAS Parser sidecar (`POST http://casparser-sidecar:7070/parse`), processes the JSON response, fetches live NAVs from mfapi.in, and creates/updates `MFInvestment` entries with associated `MutualFundTransaction` records.

---

## 7. Calculation Logic

### 7.1 Total Assets

```
Total Assets = Sum(all investment currentValueINR) + Sum(all asset currentValueINR)
```

### 7.2 Total Liabilities

```
Total Liabilities = Sum(all liability outstandingAmounts)
```

### 7.3 Net Worth

```
Net Worth = Total Assets - Total Liabilities
```

### 7.4 Liquid Assets

Liquid assets include investments tagged with the LIQUID category:

```
Liquid Assets = Sum(currentValueINR) where investment.categories contains LIQUID
```

> **Note**: Investments tagged as RETIRALS (NPS, EPF) should typically not be tagged LIQUID since they are locked until retirement.

### 7.5 Income & Savings (Per Annum)

```
Income PA = Sum(all income amountInr × frequencyMultiplier)
Savings PA = Income PA - Total Expenses PA
Basic Expense PA = Sum(expense annualAmountINR where category = NEED)
```

### 7.6 Emergency Surplus / Deficit

```
Emergency Fund Target = Monthly Expenses × 6  (6 months of expenses)
Emergency Surplus/Deficit = Liquid Assets - Emergency Fund Target
```

### 7.7 Runway (Preparedness for Loss of Income)

```
Monthly Expenses = Sum(all expense monthlyAmountINR)
Runway (months) = Liquid Assets ÷ Monthly Expenses
Runway (years) = Runway (months) ÷ 12
```

### 7.8 F.I.R.E. Amount (25x Rule)

```
Annual Expenses = Sum(all expense annualAmountINR) - Sum(expense annualAmountINR where category = SAVINGS)
FIRE Amount = Annual Expenses × 25
FIRE Diff = FIRE Amount - Net Worth
```

### 7.9 Years to FIRE

```
Monthly Investment = Total monthly savings (from expenses categorized as SAVINGS)
Real Rate of Return = ((1 + expectedReturnRate) / (1 + inflationRate)) - 1

Using Future Value of Annuity formula:
FV = PMT × [((1 + r)^n - 1) / r]

Where:
  FV = FIRE Diff (amount still needed)
  PMT = Monthly Investment
  r = Real Rate of Return (monthly)

Solve for n (months), then convert to years.
```

### 7.10 Retirement Countdown

Retirement age is configurable via the Dashboard (quick edit) or Settings page:

```
Retirement (months left) = (Retirement Age - Current Age) × 12
```

### 7.11 Investment Category Breakdown

```
For each category in [METALS, LIQUID, DOMESTIC, INTERNATIONAL]:
  Category Value = Sum(currentValueINR) where investment.categories contains category
  Category % = Category Value / Total Investment Value × 100

Note: An investment can belong to multiple categories (e.g., DOMESTIC + LIQUID),
so category totals may exceed total investment value.
```

---

## 8. Frontend Architecture

### 8.1 Project Structure

```
frontend/
├── public/
├── src/
│   ├── assets/              # Static assets, fonts
│   ├── components/
│   │   ├── common/          # Button, Input, Card, Modal, Toggle
│   │   ├── charts/          # PieChart, BarChart, GaugeChart, LineChart
│   │   ├── layout/          # Navbar, Sidebar, Footer, PageContainer
│   │   └── forms/           # InvestmentForm, LoanForm, ExpenseForm, etc.
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── InvestmentsPage.jsx
│   │   ├── AssetsPage.jsx
│   │   ├── LiabilitiesPage.jsx
│   │   ├── BudgetPage.jsx
│   │   ├── ProfilePage.jsx
│   │   └── SettingsPage.jsx
│   ├── hooks/               # useAuth, useProfile, useDashboard, useTheme
│   ├── context/             # AuthContext, ThemeContext
│   ├── services/            # api.js (Axios instance), auth.js, profile.js
│   ├── utils/               # formatCurrency, calculations, constants
│   ├── App.jsx
│   ├── App.css              # Tailwind v4 @theme tokens + custom styles
│   └── main.jsx
├── Dockerfile
├── nginx.conf
├── package.json
└── vite.config.js
```

### 8.2 Tailwind CSS v4 Theme Configuration

Tailwind v4 uses CSS-first configuration with `@theme` directive:

```css
/* App.css */
@import "tailwindcss";

@theme {
  /* Gold accent palette */
  --color-accent: #D4A017;
  --color-accent-hover: #B8860B;
  --color-accent-light: #F0C040;
  --color-accent-glow: #FFD700;

  /* Semantic colors */
  --color-success: #10B981;
  --color-danger: #EF4444;
  --color-warning: #F59E0B;

  /* Surface colors (light mode defaults) */
  --color-surface-primary: #FFFFFF;
  --color-surface-secondary: #F8F9FA;
  --color-surface-card: #FFFFFF;

  /* Text colors */
  --color-text-primary: #1A1D27;
  --color-text-secondary: #6B7280;

  /* Border */
  --color-border: #E5E7EB;

  /* Border radius */
  --radius-card: 12px;
  --radius-input: 8px;

  /* Font */
  --font-sans: 'Inter', sans-serif;
}

/* Dark mode overrides */
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface-primary: #0F1117;
    --color-surface-secondary: #1A1D27;
    --color-surface-card: #1E2130;
    --color-text-primary: #F0F0F5;
    --color-text-secondary: #9CA3AF;
    --color-border: #2D3148;
    --color-accent: #F0C040;
    --color-accent-hover: #FFD700;
  }
}

/* Also support manual toggle via data attribute */
[data-theme="dark"] {
  --color-surface-primary: #0F1117;
  --color-surface-secondary: #1A1D27;
  --color-surface-card: #1E2130;
  --color-text-primary: #F0F0F5;
  --color-text-secondary: #9CA3AF;
  --color-border: #2D3148;
  --color-accent: #F0C040;
  --color-accent-hover: #FFD700;
}
```

### 8.3 Pages & Layout

#### Dashboard Page (Home)

The primary view — replicates and enhances the Excel "Summary" section.
Includes an **inline-editable Retirement Age** field for quick adjustments.

```
┌─────────────────────────────────────────────────────────┐
│  Navbar [Logo] [Dashboard|Investments|Assets|...]  [🌙] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Net Worth│ │ Income PA│ │Savings PA│ │ Runway   │   │
│  │₹3.28 Cr  │ │₹74.7 L   │ │₹19.9 L   │ │ 4 Years  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  ┌─────────────────────────┐ ┌────────────────────────┐ │
│  │  Net Worth Over Time    │ │  Investment Categories │ │
│  │  (Line Chart)           │ │  (Pie Chart)           │ │
│  │  📈                     │ │  🥧 DOMESTIC/INTL/     │ │
│  └─────────────────────────┘ │     METALS/LIQUID       │ │
│                               └────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────┐ ┌────────────────────────┐ │
│  │  F.I.R.E. Progress     │ │  Expense Breakdown     │ │
│  │  (Gauge / Progress)    │ │  Need/Want/Savings     │ │
│  │  ₹6.23Cr target        │ │  (Stacked Bar)         │ │
│  │  53% achieved          │ │                        │ │
│  │                        │ │                        │ │
│  │  Retire at: [40] ✏️    │ │                        │ │
│  │  62 months left        │ │                        │ │
│  └─────────────────────────┘ └────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Profile Page (NEW)
- Google avatar, first name, last name, date of birth
- Email (read-only, from Google)
- Editable fields: first name, last name, DOB

#### Investments Page
- Table of all investments (name, type, invested value, current value, currency, gain/loss %)
- Add/Edit/Delete investment modal
- Subtotals by category (METALS, LIQUID, DOMESTIC, INTERNATIONAL)
- Investment categories pie chart

#### Assets Page
- Table of all assets: real estate, vehicles, jewelry, etc.
- Acquisition cost vs current value with multi-currency support and % change
- Add/Edit/Delete asset modal

#### Liabilities Page
- Table of all loans (name, outstanding, EMI, ROI, type, tenure, remaining EMIs)
- Add/Edit/Delete loan modal
- Total EMI per month, total outstanding

#### Budget Page
- Expense items table with category (Need/Want/Savings), amount, frequency, and currency
- Server-computed monthly and annual INR amounts
- Projected vs Actuals comparison
- Income details section (source, amount, currency, frequency)

#### Settings Page
- Personal info (age, retirement age, expected return, inflation rate)
- Currency code preference (ISO 4217, e.g. INR, USD) — symbol rendered by frontend via Intl API
- Theme toggle (light/dark)

---

## 9. Backend Architecture

### 9.1 Project Structure

> [!IMPORTANT]
> The `model/generated/` package is **auto-generated at build time** by the `openapi-generator-maven-plugin` from [`networth-api.yaml`](file:///d:/git/networth/api/networth-api.yaml). These classes are **never hand-edited** — they live under `target/generated-sources/` and are added to the compile source root automatically. Each hand-written DTO in `model/dto/` **extends** its generated counterpart to layer on persistence annotations (e.g., `@Document`, `@Id`), computed fields, and MongoDB-specific logic.

```
backend/
├── api/
│   └── networth-api.yaml                  # OpenAPI 3.0 spec (single source of truth)
├── src/main/java/com/networth/
│   ├── NetworthApplication.java
│   ├── config/
│   │   ├── SecurityConfig.java            # Spring Security + OAuth2
│   │   ├── CorsConfig.java
│   │   ├── MongoConfig.java
│   │   └── JwtConfig.java
│   ├── controller/
│   │   ├── AuthController.java
│   │   ├── UserController.java
│   │   ├── ProfileController.java
│   │   ├── DashboardController.java
│   │   └── SnapshotController.java
│   ├── service/
│   │   ├── AuthService.java
│   │   ├── ProfileService.java
│   │   ├── CalculationService.java        # All financial calculations
│   │   ├── SnapshotService.java
│   │   └── UserService.java
│   ├── model/
│   │   ├── generated/                     # ⚡ AUTO-GENERATED — do not edit
│   │   │   ├── Investment.java
│   │   │   ├── Asset.java
│   │   │   ├── Liability.java
│   │   │   ├── Income.java
│   │   │   ├── Expense.java
│   │   │   ├── UserProfile.java
│   │   │   ├── UserSettings.java
│   │   │   ├── FinancialProfile.java
│   │   │   ├── DashboardSummary.java
│   │   │   ├── Snapshot.java
│   │   │   ├── AuthResponse.java
│   │   │   └── ErrorResponse.java
│   │   └── dto/                           # Hand-written — extends generated models
│   │       ├── UserProfileDto.java        # extends generated.UserProfile
│   │       ├── FinancialProfileDto.java   # extends generated.FinancialProfile
│   │       ├── InvestmentDto.java         # extends generated.Investment
│   │       ├── AssetDto.java              # extends generated.Asset
│   │       ├── LiabilityDto.java          # extends generated.Liability
│   │       ├── IncomeDto.java             # extends generated.Income
│   │       ├── ExpenseDto.java            # extends generated.Expense
│   │       ├── SnapshotDto.java           # extends generated.Snapshot
│   │       └── DashboardSummaryDto.java   # extends generated.DashboardSummary
│   ├── repository/
│   │   ├── UserRepository.java
│   │   ├── FinancialProfileRepository.java
│   │   └── SnapshotRepository.java
│   ├── security/
│   │   ├── JwtTokenProvider.java
│   │   ├── JwtAuthenticationFilter.java
│   │   └── OAuth2SuccessHandler.java
│   └── exception/
│       ├── GlobalExceptionHandler.java
│       └── ResourceNotFoundException.java
├── src/main/resources/
│   ├── application.yml
│   └── application-dev.yml
├── Dockerfile
└── pom.xml
```

#### Code Generation Strategy

| Aspect | Detail |
|---|---|
| **Plugin** | `openapi-generator-maven-plugin` (bound to `generate-sources` phase) |
| **Input** | `${project.basedir}/api/networth-api.yaml` |
| **Output** | `target/generated-sources/openapi/com/networth/model/generated/` |
| **Generator** | `java` with `library=native`, `useJakartaEe=true` |
| **Generated content** | Model classes only (`<generateModels>true</generateModels>`, `<generateApis>false</generateApis>`) |
| **Inheritance** | Each DTO in `model/dto/` extends its generated equivalent and adds `@Document`, `@Id`, computed fields |

Example DTO extending generated model:

```java
package com.networth.model.dto;

import com.networth.model.generated.Investment;
import org.springframework.data.annotation.Id;
import lombok.*;

@Data
@EqualsAndHashCode(callSuper = true)
public class InvestmentDto extends Investment {
    // All fields (name, investmentType, investedValue, currentValue, etc.)
    // are inherited from the auto-generated Investment class.
    // Add only persistence or computed fields here:
    @Id
    private String id;
}
```

### 9.2 Key Dependencies & Build Plugins (pom.xml)

```xml
<!-- Core -->
spring-boot-starter-web
spring-boot-starter-data-mongodb
spring-boot-starter-security
spring-boot-starter-oauth2-client
spring-boot-starter-validation

<!-- JWT -->
io.jsonwebtoken:jjwt-api:0.12.x
io.jsonwebtoken:jjwt-impl:0.12.x
io.jsonwebtoken:jjwt-jackson:0.12.x

<!-- Utility -->
org.projectlombok:lombok
org.springdoc:springdoc-openapi-starter-webmvc-ui  (Swagger UI)

<!-- Code Generation (needed at compile time for generated models) -->
jackson-databind-nullable              (for OpenAPI nullable fields)
jakarta.validation:jakarta.validation-api
jakarta.annotation:jakarta.annotation-api

<!-- Test -->
spring-boot-starter-test
de.flapdoodle.embed:de.flapdoodle.embed.mongo.spring3x
```

#### OpenAPI Generator Maven Plugin

```xml
<plugin>
  <groupId>org.openapitools</groupId>
  <artifactId>openapi-generator-maven-plugin</artifactId>
  <version>7.x</version>
  <executions>
    <execution>
      <goals><goal>generate</goal></goals>
      <configuration>
        <inputSpec>${project.basedir}/api/networth-api.yaml</inputSpec>
        <generatorName>java</generatorName>
        <library>native</library>
        <generateModels>true</generateModels>
        <generateApis>false</generateApis>
        <generateSupportingFiles>false</generateSupportingFiles>
        <modelPackage>com.networth.model.generated</modelPackage>
        <configOptions>
          <useJakartaEe>true</useJakartaEe>
          <openApiNullable>true</openApiNullable>
          <serializationLibrary>jackson</serializationLibrary>
        </configOptions>
      </configuration>
    </execution>
  </executions>
</plugin>
```

> [!NOTE]
> Running `mvn compile` (or any downstream phase) auto-generates model classes into `target/generated-sources/openapi/`. IDE should mark this as a generated-sources root for autocomplete.

---

## 10. Docker Setup

### 10.1 docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "5050:80"
    depends_on:
      - backend
    environment:
      - VITE_API_BASE_URL=http://localhost:6060/api

  backend:
    build: ./backend
    ports:
      - "6060:6060"
    depends_on:
      - mongodb
    environment:
      - SPRING_DATA_MONGODB_URI=mongodb://mongodb:27017/networth
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - JWT_SECRET=${JWT_SECRET}
      - FRONTEND_URL=http://localhost:5050
      - CASPARSER_URL=http://casparser-sidecar:7070
      - MFAPI_BASE_URL=https://api.mfapi.in

  casparser-sidecar:
    build: ./casparser-sidecar
    ports:
      - "7070:7070"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7070/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

### 10.2 Frontend Dockerfile

```dockerfile
# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 10.3 Backend Dockerfile

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline
COPY src ./src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 6060
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 11. Security Considerations

1. **All API endpoints** (except `/api/auth/*`) require a valid JWT token
2. **CORS** configured to allow only the frontend origin
3. **Input validation** using Jakarta Bean Validation on all DTOs
4. **MongoDB injection prevention** via Spring Data MongoDB (parameterized queries)
5. **JWT tokens** expire after 24 hours; refresh token support can be added later
6. **Environment secrets** stored in `.env` file (not committed to git)

---

## 12. Responsive Design Strategy

| Breakpoint | Layout |
|---|---|
| `≥ 1200px` (Desktop) | 2-column dashboard, sidebar navigation |
| `768px – 1199px` (Tablet) | 2-column dashboard, collapsible sidebar |
| `< 768px` (Mobile) | Single column, bottom navigation bar, stacked cards |

- All tables become scrollable cards on mobile
- Charts resize responsively using Recharts' `ResponsiveContainer`
- Touch-friendly input controls (larger tap targets)
- Tailwind v4 responsive utilities (`sm:`, `md:`, `lg:`, `xl:`)

---

## 13. Phased Implementation Plan

> [!IMPORTANT]
> **Security is deferred to Phase 5.** Until then, the app operates with a single hardcoded dummy user — no login screen, no JWT, no OAuth. All APIs assume this dummy user and skip authentication. This lets the team build and validate all core features without auth complexity.

### Dummy User Strategy (Phases 1–4)

- On first startup, a seed script (or `ApplicationRunner`) creates a default user in MongoDB:
  ```json
  {
    "googleId": "dummy-local-dev",
    "email": "dev@networth.local",
    "firstName": "Dev",
    "lastName": "User",
    "settings": { "currencyCode": "INR", "retirementAge": 60, "expectedReturnRate": 12.0, "inflationRate": 6.0 }
  }
  ```
- A `DummyUserFilter` (or Spring interceptor) injects this user into the `SecurityContext` / request attribute for every request — no token required.
- Frontend skips login page and lands directly on Dashboard.
- Phase 5 replaces `DummyUserFilter` with real `JwtAuthenticationFilter` + OAuth flow.

---

### Phase 1 — Foundation (Backend + Frontend Skeleton)

1. Initialize Spring Boot project with MongoDB (no Security/OAuth yet)
2. Auto-generate model classes from `networth-api.yaml` via `openapi-generator-maven-plugin`
3. Create `User` document + `DummyUserFilter` (seed dummy user on startup)
4. Initialize React (Vite) project with Tailwind CSS v4 and design tokens
5. Build app shell: Navbar, Sidebar, routing (no login page)
6. Set up Docker Compose (frontend + backend + MongoDB)
7. Verify end-to-end: Frontend → REST API → MongoDB (dummy user, no auth)

### Phase 2 — Core Data Entry (CRUD)

1. Financial Profile model & repository (all embedded entities)
2. CRUD APIs for investments, assets, liabilities, incomes, expenses
3. React forms for each data section (Investments, Assets, Loans, Budget)
4. Profile page (first name, last name, DOB)
5. Settings page (personal info, currency, theme)

### Phase 2.5 — Mutual Fund CAS Import & Live Pricing

1. **CAS Parser sidecar**: Create `casparser-sidecar/` with FastAPI app wrapping `casparser` library, Dockerfile, add to `docker-compose.yml`
2. **OpenAPI schema updates**: Add `MFInvestment` (allOf Investment), `MutualFundTransaction`, `CasImportResult` schemas → regenerate models
3. **Data model**: Create `MFInvestmentEntry extends InvestmentEntry`, `MutualFundTransactionEntry`, `MfNavCacheDocument` (separate collection)
4. **MfPricingService**: Implement mfapi.in client (fetch latest NAV, search by ISIN), NAV caching in `mf_nav_cache` collection
5. **CasImportService**: Orchestrate CAS parsing (call sidecar), scheme matching (AMFI/ISIN), investment creation/merge, transaction dedup
6. **NavRefreshScheduler**: `@Scheduled(fixedRate = 6h)` job to refresh all CAS-imported investment NAVs
7. **CasImportController**: `POST /api/cas/import`, `GET /api/investments/{id}/transactions`, `POST /api/investments/refresh-nav`
8. **Frontend CAS Drop Zone**: Drag-and-drop PDF upload component with password input
9. **Frontend Import Flow**: "Import CAS" button on InvestmentsPage, import modal with progress and results
10. **Frontend Transaction History**: Drill-down modal showing transaction table per MF investment
11. **Visual distinction**: Auto-priced badge, last NAV update timestamp, read-only current value for CAS imports

### Phase 3 — Dashboard & Calculations

1. `CalculationService` (net worth, FIRE, runway, category breakdowns)
2. Dashboard Summary API
3. Dashboard page with KPI cards
4. Charts: Investment Categories Pie, Expense Breakdown Bar, FIRE Gauge
5. Inline-editable Retirement Age on dashboard

### Phase 4 — Historical Tracking & Polish

1. Snapshot model & APIs
2. Net Worth Over Time line chart
3. Monthly auto-snapshot (Spring `@Scheduled`)
4. Light/Dark theme toggle with Tailwind dark mode
5. Responsive polish for mobile
6. Error handling, loading states, empty states

### Phase 5 — Google OAuth & Security Integration

1. Add Spring Security + OAuth2 client dependencies
2. Implement `SecurityConfig.java` (OAuth2 login, JWT filter chain, CORS)
3. Implement `JwtTokenProvider`, `JwtAuthenticationFilter`, `OAuth2SuccessHandler`
4. Replace `DummyUserFilter` with real JWT auth filter
5. Build Login page with Google Sign-In button
6. Wire callback flow: Google → backend → JWT → frontend storage
7. Add `@AuthenticationPrincipal` to all controllers (replace dummy user injection)
8. Protect all `/api/**` routes (except `/api/auth/**`)
9. Test end-to-end: Login → JWT → Protected API → Logout
10. Remove dummy user seed script and `DummyUserFilter`
