# FlyRank Opportunity Scout

A local-first, bounded personal agent built for FlyRank General AI Fluency Week 5.

The agent converts one approved GSC site export, one GSC URL export, and one GA4 raw-event export into a ranked, evidence-based content-opportunity brief. It inspects file schemas, selects the approved parsers, applies validation and confidentiality guardrails, preserves anonymized queries, flattens approved GA4 JSON fields, joins evidence only by landing-page URL, and writes auditable JSON and Markdown outputs.

## Confidentiality boundary

The public samples are synthetic and schema-compatible. Real FlyRank/Flewd client exports must remain in approved local storage and must not be committed, uploaded, or placed in public prompts.

## Run

```bash
python agent/flyrank_agent.py --input agent/sample_data --output agent/output
```

Outputs:

- `agent/output/opportunity_report.json`
- `agent/output/opportunity_brief.md`

## Test

```bash
python -m unittest discover -s agent/tests -v
```

The five tests cover a successful run, a missing dataset, anonymized queries, malformed GA4 JSON, and unmatched landing pages.

## Agent boundary

The agent may inspect approved local files, select among allowlisted parsing tools, recover from non-blocking malformed nested JSON, create reports, and stop safely when required schemas are absent. It cannot publish, edit, redirect, delete, deploy, or modify production content. Every recommendation requires human review.
