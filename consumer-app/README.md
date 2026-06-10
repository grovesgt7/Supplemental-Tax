# MyTaxBill.guide — Consumer Property Tax Analyzer

A consumer-facing web app that helps California homeowners understand their
property tax bills and the supplemental tax bills that surprise most buyers.

**100% client-side.** There is no backend, no account, and no data leaves the
browser — everything is computed locally, which makes the app trivially
deployable to any static host (Netlify, Vercel, GitHub Pages, S3).

## Features

- **Supplemental tax estimator** — Just bought (or buying) a home? Enter the
  closing date, purchase price, the seller's old assessed value, and county.
  Get the expected number of supplemental bills (one vs. two), the amount of
  each, the fiscal years covered, a suggested monthly set-aside, and a plain
  English action checklist (escrow warning, homeowner's exemption, etc.).
- **Bill checker** — Received a supplemental bill? Verify the county's math,
  and compute the exact installment delinquency dates from the bill's mailing
  date (R&T § 75.52 rules), including the late-payment penalties.
- **Annual bill analyzer** — Break a regular secured bill into the 1% Prop 13
  base, voter-approved debt, and direct assessments; check assessed-value
  growth against the 2% Prop 13 cap; and quantify the homeowner's exemption
  savings if it isn't being claimed.
- **FAQ** — Straight answers to the questions new homeowners actually ask.

## Tax rules implemented

- Supplemental assessments are effective the first day of the month
  **following** the event, producing the official county proration factors
  (Jul .9167 … May .0833, Jun 1.0000).
- Events Jan 1 – May 31 generate **two** supplemental bills (the upcoming
  roll was already set on the Jan 1 lien date); events Jun 1 – Dec 31
  generate **one**. A June event's single bill covers the entire upcoming
  fiscal year.
- Supplemental due dates depend on the mailing month: July–October mailings
  follow the regular Dec 10 / Apr 10 schedule; November–June mailings are
  delinquent at the end of the month following mailing and four months later.
- Negative supplemental assessments (purchase below the prior assessed
  value) are presented as refunds.

All calculation logic lives in [`src/lib/tax.ts`](src/lib/tax.ts) with unit
tests in [`src/lib/tax.test.ts`](src/lib/tax.test.ts).

## Development

```bash
npm install
npm run dev      # dev server on http://localhost:5174
npm test         # vitest unit tests for the tax engine
npm run build    # type-check + production build to dist/
```

## Disclaimer

Educational estimates only — not tax, legal, or financial advice. Actual
rates vary by tax rate area; actual bills are determined by county assessors
and tax collectors.
