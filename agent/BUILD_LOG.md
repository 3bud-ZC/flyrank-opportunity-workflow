# FL-07 Build Log

## Goal

Build the narrowest useful version of FlyRank Opportunity Scout that completes one search-intelligence job from approved files to a reviewable result without mid-run editing.

## Iteration 1 — Safe file boundary

I added an allowlisted input folder, CSV-only inspection, output-folder separation, and direct-child path checks. A generic file reader was rejected because it could process the wrong file or overwrite source material.

## Iteration 2 — Agent-selected parsers

I replaced filename assumptions with schema classification. The agent inspects headers and selects one approved parser for each required dataset. Unknown, duplicate, or missing schemas stop safely.

## Iteration 3 — Messy-data handling

I retained blank GSC queries as anonymized demand and added GA4 nested-JSON flattening. Malformed nested values are quarantined and counted rather than silently converted to empty data.

## Iteration 4 — Correct alignment

I aggregated GSC URL and GA4 event data separately, then used a full outer join on normalized landing-page path. The agent has no direct query-level join because GA4 does not contain the organic query dimension. GSC-only and GA4-only pages remain visible with incomplete-evidence labels.

## Iteration 5 — Explainable ranking

I implemented visible demand, ranking, CTR, engagement, intent, and business-relevance signals. Every result retains its metrics, evidence statements, recommendation, and confidence. Strong converting performers can be protected from unnecessary rewrites.

## Iteration 6 — Reusable outputs

I added JSON and Markdown reports, a terminal summary, warnings, assumptions, and a complete tool log. Every successful run creates new outputs in a separate folder.

## Cuts from FL-06

- Direct BigQuery access.
- Embeddings, HDBSCAN, UMAP, and external LLM classification.
- Predictive traffic or revenue modeling.
- Scheduled execution and notifications.
- Dashboard interface.
- Automatic content edits or publication.

These were cut to protect the ten-hour boundary and prioritize a reliable end-to-end loop. The public repository uses synthetic data only; real client exports remain confidential and local.

## Verification

The automated suite covers a successful run, missing required data, anonymized queries, malformed GA4 JSON, and unmatched landing pages. The final CLI run processes three sample files, writes both reports, and stops at the human-review boundary.
