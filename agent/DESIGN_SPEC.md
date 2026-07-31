# FL-06 — FlyRank Opportunity Scout Design Specification

## One job

When I receive approved Google Search Console and GA4 exports, the agent converts them into a transparent, prioritized content-opportunity brief that I can review without manually inspecting every row.

The first build owns one bounded loop: inspect approved local files, select the correct parsers, validate the data, align GSC and GA4 at landing-page level, calculate explainable opportunity signals, write a ranked brief, and stop for human approval.

## User and frequency

**Primary user:** Abdullah Ragab Al Ali, software engineering student and AI/automation builder.  
**Frequency:** Weekly during active search-analysis work, or on demand when new exports are available.

## Inputs

- One GSC site-impression CSV export.
- One GSC URL-impression CSV export.
- One GA4 raw-event CSV export.
- An explicit allowlisted local input folder.
- A separate local output folder.

The public repository contains synthetic, schema-compatible files only. Confidential client exports remain in approved local storage.

## Outputs

- Dataset-health summary with row counts and anonymized-query rates.
- Ranked opportunities with demand, CTR, position, engagement, conversion, confidence, evidence, and recommended action.
- `opportunity_report.json` for machine-readable review.
- `opportunity_brief.md` for analyst review.
- A tool-event log showing what the agent inspected, selected, transformed, and wrote.

## Tools and access

1. **Folder inspector — read-only:** lists direct files inside one allowlisted input folder and rejects non-CSV inputs.
2. **Schema classifier — read-only:** chooses the approved GSC-site, GSC-URL, or GA4 parser from headers. Unknown, missing, or duplicate required schemas stop the run.
3. **CSV reader — read-only:** reads only direct children of the allowlisted folder.
4. **GA4 JSON flattener — in-memory transform:** parses approved nested fields; malformed values are quarantined and counted.
5. **Opportunity engine — local computation:** aggregates each source independently, joins only by normalized landing-page URL, and calculates visible score components.
6. **Report writer — output-only:** writes new JSON and Markdown files in a separate output folder and never overwrites source data.

## Draft instructions

You are FlyRank Opportunity Scout. Your only goal is to turn an approved local set of GSC and GA4 exports into a ranked, evidence-based content-opportunity brief.

1. Inspect only the allowlisted input folder.
2. Identify exactly one GSC site export, one GSC URL export, and one GA4 event export from their schemas.
3. Stop with a precise error if a required file, schema, or landing-page identifier is absent.
4. Preserve blank GSC queries as anonymized demand; never invent query text.
5. Flatten approved GA4 JSON fields and quarantine malformed values.
6. Aggregate each source independently and join only on normalized landing-page URL.
7. Calculate transparent demand, ranking, CTR, engagement, intent, and business-relevance signals.
8. Retain GSC-only and GA4-only pages instead of creating false matches.
9. Write auditable JSON and Markdown reports with warnings, assumptions, confidence, and a tool log.
10. Never publish or modify content. Stop for human review.

## Pre-build evaluation cases

1. Correct files complete the loop and create both reports.
2. A missing GA4 dataset stops before any output is written.
3. A blank query remains in page demand as anonymized and is excluded from semantic labeling.
4. Malformed GA4 JSON is quarantined and reported instead of silently erased.
5. GSC-only and GA4-only pages remain separate with incomplete-evidence labels.
6. Invalid numeric input stops with the exact field named.
7. A converting page with healthy CTR and engagement is protected from an unnecessary rewrite.

## Guardrails and failure behavior

- Raw and cleaned client data remain local by default.
- No external network request is made.
- Source files are read-only.
- Output cannot overwrite or sit inside the input folder.
- GSC and GA4 are never joined directly on query.
- Correlation is not presented as causation.
- Scores prioritize review and do not predict revenue or ranking impact.
- The agent cannot publish, delete, merge, redirect, deploy, or edit production content.
- Missing schemas, missing identifiers, unsafe paths, and invalid numeric values cause a safe stop.

## Platform choice

**Selected platform:** local Python command-line agent.

Python is the strongest fit for reproducible CSV processing, structured validation, transparent scoring, local confidentiality, and a complete end-to-end prototype within roughly ten build hours. A CLI also makes the raw run easy to record and audit.

**Claude Project alternative:** faster narrative synthesis, but weaker as the deterministic core for file selection, row-level validation, reproducible joins, and local confidentiality.

**n8n alternative:** useful later for scheduling and notifications, but unnecessary orchestration before the data and scoring logic are stable.

## Acceptance boundary

The build is acceptable when one command completes the loop, uses real local file connections, passes at least five evaluation cases, produces both reports, preserves the confidentiality boundary, and requires no mid-run prompt editing.
