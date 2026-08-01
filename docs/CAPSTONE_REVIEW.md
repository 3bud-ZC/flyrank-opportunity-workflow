# General AI Fluency Capstone — Reviewer Guide

## Project

**FlyRank Opportunity Intelligence Studio**  
Public product name: **FlyRank Opportunity Workflow**  
Bounded personal-agent implementation: **FlyRank Opportunity Scout**

This capstone turns approved Google Search Console and Google Analytics 4 CSV exports into a ranked, explainable content-opportunity queue. It is intentionally local-first and human-controlled.

## Four-link reviewer path

1. **Final capstone page:** https://portfolio.abud.fun/capstone/
2. **Live browser demo:** https://3bud-zc.github.io/flyrank-opportunity-workflow/
3. **Narrated demo video:** https://drive.google.com/file/d/1r4UBxmlSc0gAr8hjLZTfTA5j2GjQ15r3/view
4. **Capstone documentation:** https://app.notion.com/p/3a747bf43cf3812dbf83e9a6f614eabf

## Problem

GSC and GA4 exports contain useful evidence, but they do not directly answer which page deserves attention first, why, how confident the evidence is, or what a human should inspect before acting.

## Public workflow

1. Read GSC and GA4 CSV files locally in the browser.
2. Validate schemas and numeric fields.
3. Normalize landing-page paths.
4. Aggregate each source independently.
5. Full-outer-join the sources at landing-page level.
6. Preserve blank queries and unmatched pages.
7. Calculate transparent opportunity scores.
8. Generate recommendations and rationales.
9. Require human review before export or action.
10. Export CSV, JSON, and Markdown reports.

## Why the join is safe

GSC provides search-query evidence. GA4 does not provide the same query-level key. The workflow therefore never joins the sources directly through query text. It aligns the independently aggregated sources through the normalized landing-page path.

## Verification record

The project includes five reproducible cases:

- Successful new input
- Missing required column
- Blank anonymized query preserved
- Unmatched landing pages preserved
- Malformed numeric value rejected

Run locally:

```bash
npm install
npm test
npm run build
```

## Human-review boundary

The system does not:

- publish or rewrite pages;
- create tickets;
- infer missing query text;
- treat the score as a performance guarantee;
- approve business intent;
- upload public-demo CSV contents to a server.

A person must verify search intent, tracking quality, page content, business priority, and the final action.

## Evidence package

- Public React and TypeScript source
- Vitest verification suite
- Synthetic schema-compatible input data
- Browser-only live workflow
- CSV, JSON, and Markdown exports
- Python agent README and evaluation material under `agent/`
- Narrated end-to-end demonstration
- Permanent capstone page on the custom portfolio domain
- Final launch story

## Confidentiality boundary

The public application uses synthetic data. Real client exports must remain private, approved, and local.

## Final status

The project is public, reproducible, HTTPS-hosted, documented, tested, and ready for capstone review.
