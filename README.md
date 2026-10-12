# Carrowmont Mortgage / Home Loan Decision Tools

This repository contains Carrowmont's seventh primary planning tool and the Mortgage Decision Centre companion family.

Public routes:

- Payoff / prepayment calculator: `https://carrowmont.com/mortgage-payoff-calculator/`
- Mortgage Decision Centre: `https://carrowmont.com/mortgage-payoff-calculator/decision-centre.html`
- Prepayment vs Investing: `https://carrowmont.com/mortgage-payoff-calculator/prepayment-vs-investing.html`

## Product scope

The existing payoff calculator remains focused on mortgage / home-loan amortization and early repayment. It models:

- recurring extra / part-prepayments;
- one-time lump-sum prepayments;
- an earlier target payoff date;
- a full early-payoff / foreclosure estimate;
- Monthly View versus Pay Cycle View for affordability presentation.

MDC1A adds a separate decision module for a different question: if a user has extra money, how does applying it to mortgage principal compare with investing the same planned cash instead?

The MDC1A decision engine uses a common horizon and equal planned cash flow. The default horizon is the original scheduled mortgage payoff date. When the Prepay path clears the loan early, scheduled mortgage cash and continuing planned recurring extra amounts that are no longer needed by the mortgage are redirected into the modeled investment account through the common horizon. The primary decision threshold is the modeled break-even effective annual investment return.

Carrowmont does not choose an investment return, recommend investments, forecast house prices, or invent local tax / lender rules.

## Main files

Existing payoff calculator:

- `index.html` - payoff UI and semantic content
- `styles.css` - Carrowmont shared shell + payoff layout
- `locale.js` - shared country/currency catalogue
- `shared-plan-state.js` - same-origin Carrowmont plan-state contract
- `core.js` - deterministic mortgage / home-loan calculation engine
- `app.js` - payoff UI orchestration, localization, CSV and handoffs
- `mortgage-payoff-pdf-renderer.js` - standard no-login five-page payoff report

Mortgage Decision Centre / MDC1A:

- `decision-centre.html` / `decision-centre.js` / `decision-centre.css` - decision-family hub and shared decision styles
- `prepayment-vs-investing.html` / `prepayment-vs-investing.js` - MDC1A user interface and orchestration
- `prepayment-vs-investing-core.js` - deterministic equal-cash-flow decision engine layered on the unchanged mortgage core
- `prepayment-vs-investing-pdf-renderer.js` - three-page Decision Report using the same MDC1A result object
- `mortgage-decision-profile.js` - local-only, explicit-use mortgage profile (`carrowmontMortgageDecisionV1`)

Shared report / export infrastructure:

- `pdf-export.js`
- `report-standard.js`
- `analytics.js`

## Calculation notes

The underlying mortgage core supports monthly, fortnightly / biweekly and weekly scheduled repayments. Standard scenarios use a nominal annual rate divided by payment periods per year. Canadian fixed-rate mode uses the semi-annual compounding conversion specified in the approved CORE7 product specification.

MDC1A does not modify `core.js`. It consumes the existing deterministic amortization result and applies a separate equal-cash-flow comparison. This isolation is intentional so existing payoff behavior can be parity-protected.

## Privacy and state

No login or server-side storage is required. The optional Mortgage Decision Centre profile stays in the browser. Saved mortgage facts are never silently applied: the receiver shows the saved details and requires an explicit `Use these loan details` action. Clearing the mortgage profile does not clear unrelated Carrowmont locale or plan preferences.

## Release discipline

This repository must be released through the Carrowmont protected-PR workflow and central QA. MDC1A production work is controlled by:

- `draw004.github.io/docs/CARROWMONT_MDC1A_PREPAYMENT_VS_INVESTING_SPEC_FINAL.md`
- `draw004.github.io/docs/CARROWMONT_MDC1A_PREPAYMENT_VS_INVESTING_IMPLEMENTATION.md`

MDC1A repository merge order is mortgage repository first, main site second and central QA last. No workflow-file change is expected for this release.
