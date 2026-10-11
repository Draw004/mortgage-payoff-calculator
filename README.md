# Carrowmont Mortgage Payoff / Home Loan Prepayment Calculator

This repository contains the seventh primary Carrowmont planning tool.

Public route: `https://carrowmont.com/mortgage-payoff-calculator/`

## Product scope

The calculator models a current mortgage / home-loan balance under transparent principal-and-interest assumptions and lets a user explore:

- recurring extra / part-prepayments;
- one-time lump-sum prepayments;
- an earlier target payoff date;
- a full early-payoff / foreclosure estimate;
- Monthly View versus Pay Cycle View for affordability presentation.

Scheduled loan repayment frequency, planning view and part-prepayment cadence are independent concepts. Recurring part-prepayment is disabled by default; when enabled, the cadence is explicitly selected by the user and is never inferred from country.

## Main files

- `index.html` - public UI and semantic content
- `styles.css` - Carrowmont UI shell + tool layout
- `locale.js` - shared country/currency catalogue
- `shared-plan-state.js` - same-origin Carrowmont plan-state contract
- `core.js` - deterministic mortgage / home-loan calculation engine
- `app.js` - UI orchestration, localization, CSV and handoffs
- `mortgage-payoff-pdf-renderer.js` - standard no-login five-page report
- `pdf-export.js` - shared canvas-to-PDF helper
- `report-standard.js` - shared seven-tool report pages
- `analytics.js` - privacy-conscious product events

## Calculation notes

The core supports monthly, fortnightly / biweekly and weekly scheduled repayments. Standard scenarios use a nominal annual rate divided by payment periods per year. Canadian fixed-rate mode uses the semi-annual compounding conversion specified in the approved CORE7 product specification.

All web, table, CSV and PDF outputs consume the same deterministic engine results. Lender-specific prepayment fees are not guessed; the user may enter known charges.

## Release discipline

This repository must be released through the Carrowmont protected-PR workflow and central QA. See the approved specification in the main-site repository:

`docs/CARROWMONT_CORE7_HOME_LOAN_MORTGAGE_PAYOFF_SPEC.md`
