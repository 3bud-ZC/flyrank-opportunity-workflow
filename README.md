# FlyRank Opportunity Workflow

A browser-only FL-04 workflow for validating, joining, scoring, reviewing, and exporting Google Search Console and GA4 opportunity data.

## Live site

`https://3bud-zc.github.io/flyrank-opportunity-workflow/`

## Final capstone review

- Capstone review page: https://portfolio.abud.fun/capstone/
- Reviewer guide: [docs/CAPSTONE_REVIEW.md](docs/CAPSTONE_REVIEW.md)
- Launch story: [docs/LAUNCH_STORY.md](docs/LAUNCH_STORY.md)
- Narrated demo: https://drive.google.com/file/d/1r4UBxmlSc0gAr8hjLZTfTA5j2GjQ15r3/view
- Capstone documentation: https://app.notion.com/p/3a747bf43cf3812dbf83e9a6f614eabf

## What it does

1. Reads a GSC CSV and a GA4 landing-page CSV locally in the browser.
2. Validates required schemas and numeric values before processing.
3. Normalizes landing-page paths and performs a full outer join.
4. Preserves blank queries and unmatched pages without inventing mappings.
5. Produces transparent opportunity scores, rationales, and recommendations.
6. Keeps human review visible before export.
7. Exports CSV, JSON, and Markdown action briefs.

No CSV content is sent to a backend, database, or third-party API.

## Five verification cases

The application includes five reproducible inputs and a one-click verification suite:

- Successful new input
- Missing required column
- Blank query preserved
- Unmatched landing pages
- Malformed numeric value

The same cases are covered by the automated Vitest suite in `src/analysis.test.ts`.

## Stack

- React
- TypeScript
- Vite
- Vitest
- GitHub Actions
- GitHub Pages

## Local development

```bash
npm install
npm test
npm run dev
```

Production verification:

```bash
npm test
npm run build
```

## Required CSV schemas

### GSC

```text
landing_page,query,clicks,impressions,ctr,position
```

### GA4

```text
landing_page,sessions,engaged_sessions,conversions
```

## Human review boundary

The workflow does not publish changes, create tickets, infer missing query text, or treat its score as a performance guarantee. A human must verify search intent, tracking quality, page content, and final priorities.

## Deployment verification

GitHub Pages was enabled with GitHub Actions on 31 July 2026. Every push to `main` runs the five-case test suite and production build before deployment.

## Assignment

FlyRank AI Internship — General AI Fluency — Week 4 — FL-04: Ship an Automation Workflow v2, extended into the final General AI Fluency impact project.

Built by Abdullah Ragab.
