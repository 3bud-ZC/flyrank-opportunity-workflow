# Send the Link — Launch, Demo & Story

## The launch

FlyRank Opportunity Intelligence Studio is now available through a permanent public review path:

- Capstone page: https://portfolio.abud.fun/capstone/
- Live demo: https://3bud-zc.github.io/flyrank-opportunity-workflow/
- Source: https://github.com/3bud-ZC/flyrank-opportunity-workflow
- Demo video: https://drive.google.com/file/d/1r4UBxmlSc0gAr8hjLZTfTA5j2GjQ15r3/view

## The story

The project began with a repeated analysis problem. Google Search Console and Google Analytics 4 exports contain useful evidence, but the manual path from raw rows to a defensible content priority is slow and easy to overstate.

The first milestone was not an autonomous agent. It was a fixed workflow that could validate data, normalize landing pages, align the two sources safely, and preserve evidence that did not match. That made the output reproducible.

The second milestone added explainability. Every opportunity score needed supporting metrics, rationale, warnings, and a visible human-review state. The system could suggest where to investigate, but it could not publish content or approve a business decision.

The final milestone connected the product to a real personal brand. The capstone now has a custom-domain review page, a public repository, an HTTPS live demo, a narrated run, automated tests, exportable outputs, and an explicit confidentiality boundary.

## What changed through review

- A temporary VPS address was replaced by durable GitHub Pages and a permanent portfolio domain.
- Query-level source joining was rejected because GA4 does not contain the same query key.
- Blank and anonymized queries were preserved instead of treated as corrupt data.
- Unmatched pages were retained instead of silently deleted.
- The final output stops at human review instead of claiming autonomous action.
- The reviewer path was reduced to four clear links: product, demo, source, and documentation.

## Current outcome

A reviewer can now open one page, understand the problem, run a safe synthetic demo, inspect how the result was produced, watch the end-to-end execution, and verify that the system keeps a human in control.

## Known limitations

- Public examples are synthetic and do not demonstrate live client impact.
- Scoring weights are prioritization aids, not business guarantees.
- Search intent and tracking quality still require human judgment.
- The workflow does not edit websites, publish content, or create irreversible actions.

## Next version

The next case will use a second realistic industry dataset or an approved private dataset, while preserving the same test suite, evidence structure, privacy boundary, and review gate.
