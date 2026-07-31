# FL-09 Demo Video Script

Target length: **3–5 minutes**  
Format: **one unedited live screen recording with voice narration**

## 0:00–0:30 — Introduce the job

> This is FlyRank Opportunity Scout, a local-first bounded agent. Its job is to turn approved Google Search Console and GA4 exports into a ranked content-opportunity brief without uploading confidential client data or making production changes.

Show:

- repository root;
- `agent/README.md`;
- `agent/sample_data`.

## 0:30–1:00 — Explain the inputs and confidentiality rule

> The public files are synthetic but follow the expected schemas. A real client export must stay in approved local storage. The agent only reads the input directory I provide and writes reports to the selected output directory.

Show the three sample CSV files.

## 1:00–1:30 — Run the evaluation suite

Run:

```bash
python -m unittest discover -s agent/tests -v
```

Narrate:

> The five cases cover a successful run, a missing dataset, a blank or anonymized query, malformed GA4 JSON, and unmatched landing pages. The goal is not only to show the happy path; it is to verify how the system stops or preserves uncertain evidence.

Pause briefly on `Ran 5 tests` and `OK`.

## 1:30–2:30 — Run the agent live

Delete or rename the previous output directory if it already exists, then run:

```bash
python agent/flyrank_agent.py --input agent/sample_data --output agent/output
```

Narrate the visible steps:

> The agent inspects the file schemas, selects the approved parsers, validates the inputs, aggregates the GSC evidence, flattens the approved GA4 fields, and aligns the sources through the normalized landing-page path.

## 2:30–3:15 — Explain one design decision

> The important design decision is that I do not join GA4 sessions directly to a search query. GSC and GA4 describe different stages of the journey. I aggregate each source first, then align them through the landing page. GSC-only and GA4-only pages stay visible instead of being dropped or falsely matched.

Open the generated JSON or Markdown report and point to a ranked item and its evidence.

## 3:15–4:00 — Explain one limitation and guardrail

> The score is deterministic and transparent, but it does not prove that the recommendation will create business impact. The agent cannot publish, edit, redirect, or deploy anything. A human must review the evidence, decide whether to act, and measure the result after implementation.

Show the human-review note in the output.

## 4:00–4:30 — Close

> The final output is an auditable JSON report and a readable Markdown brief. The repository includes the source, synthetic data, architecture, evaluation results, known limitations, and the exact commands needed to reproduce this run.

## Recording checklist

- [ ] Voice is clear and continuous.
- [ ] Screen shows the real repository, not slides.
- [ ] Full test command and result are visible.
- [ ] Full agent command and output are visible.
- [ ] Both generated files are opened.
- [ ] Landing-page join decision is explained.
- [ ] Human-review limitation is explained.
- [ ] Total duration is between 3 and 5 minutes.
- [ ] Upload is public or unlisted and opens without requesting access.
