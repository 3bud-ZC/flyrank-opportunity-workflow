# FlyRank Opportunity Scout

A local-first, bounded personal agent built for the FlyRank General AI Fluency track.

The agent converts approved Google Search Console and GA4 exports into a ranked, evidence-based content-opportunity brief. It inspects file schemas, selects the approved local parsers, applies validation and confidentiality guardrails, preserves anonymized queries, flattens approved GA4 JSON fields, joins evidence only by landing-page URL, and writes auditable JSON and Markdown outputs.

## Who it is for

The first user is a content or technical SEO operator who needs a repeatable way to compare search visibility with on-site behavior without manually joining exports or inventing a false query-to-session relationship.

## Confidentiality boundary

The public samples are synthetic and schema-compatible. Real FlyRank/Flewd client exports must remain in approved local storage and must not be committed, uploaded, or placed in public prompts.

The agent does not require a cloud API, does not transmit the input files, and does not publish or modify production content.

## Required input files

Place exactly one approved file for each dataset in the input directory:

- GSC site-impression export
- GSC URL export
- GA4 raw-event export

The included `agent/sample_data` directory contains synthetic files that reproduce the expected schemas without exposing client data.

## Setup

Requirements:

- Python 3.11 or newer
- No third-party Python packages

Clone the repository and run from the repository root:

```bash
git clone https://github.com/3bud-ZC/flyrank-opportunity-workflow.git
cd flyrank-opportunity-workflow
python agent/flyrank_agent.py --input agent/sample_data --output agent/output
```

## Outputs

A successful run writes:

- `agent/output/opportunity_report.json`
- `agent/output/opportunity_brief.md`

The JSON file is the structured audit record. The Markdown file is the human-readable brief.

## Architecture

```text
Approved local CSV files
        |
        v
Schema inspection and dataset selection
        |
        v
GSC aggregation -------- GA4 JSON flattening and aggregation
        |                              |
        +----------- normalized landing-page join --------+
                                                        |
                                                        v
                                          Transparent scoring rules
                                                        |
                                                        v
                                      JSON report + Markdown brief
                                                        |
                                                        v
                                               Mandatory human review
```

## Core design decision

GSC and GA4 are not joined through the search query.

GSC explains search demand and visibility. GA4 explains what happened after a visitor entered the site. The two sources are aggregated independently and aligned only through the normalized landing-page path. Unmatched pages are preserved instead of being discarded or falsely paired.

## Tool behavior

The bounded agent can:

- inspect allowlisted local files;
- identify the expected dataset from its schema;
- aggregate approved GSC fields;
- flatten approved nested GA4 JSON fields;
- quarantine malformed nested JSON without inventing values;
- normalize and join landing-page paths;
- calculate transparent opportunity scores;
- write JSON and Markdown reports;
- stop safely when a required dataset is absent.

It cannot:

- publish or edit production content;
- redirect or delete pages;
- deploy code;
- access unrestricted files;
- claim a recommendation was implemented;
- expose confidential source data.

## Evaluation

Run the complete evaluation suite:

```bash
python -m unittest discover -s agent/tests -v
```

Five automated cases are included:

1. **Successful end-to-end run** — writes both reports and a non-empty tool log.
2. **Missing required dataset** — stops before creating output.
3. **Blank query** — preserves the row as anonymized demand.
4. **Malformed GA4 JSON** — quarantines the invalid nested value.
5. **Unmatched landing pages** — preserves GSC-only and GA4-only pages without a false join.

Current expected result:

```text
Ran 5 tests
OK
```

## Example run

```bash
python agent/flyrank_agent.py --input agent/sample_data --output agent/output
```

Expected evidence in the terminal:

- selected input files;
- parser and validation steps;
- normalized page join;
- generated opportunity count;
- output paths;
- mandatory human-review reminder.

## Known limitations

- Dataset detection depends on the expected export schemas.
- The scoring model is deterministic and intentionally simple; it is not a learned ranking model.
- The agent cannot prove business impact until a human applies a recommendation and measures the result.
- GA4 nested fields outside the allowlisted structures are not interpreted.
- Landing-page normalization cannot guarantee that two semantically different URLs are equivalent.
- The public evaluation uses synthetic data, not confidential client exports.
- The system is a bounded local agent, not an autonomous production publisher.

## Demo video requirements

The FL-09 demo should be 3–5 minutes, voice narrated, and recorded as one live end-to-end run rather than slides.

Show:

1. the repository and this README;
2. the synthetic sample files;
3. the exact run command;
4. the live terminal tool flow;
5. the generated JSON and Markdown outputs;
6. one design decision: landing-page alignment instead of query alignment;
7. one limitation: recommendations require human review and do not prove impact automatically.

A ready narration outline is stored in `agent/DEMO_SCRIPT.md`.

## Human review boundary

Every output is a decision-support artifact. A human must verify the evidence, choose whether a recommendation is appropriate, and measure the result after implementation.
