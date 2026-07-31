from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

GSC_SITE_REQUIRED = {
    "date", "query", "country", "device", "impressions", "clicks", "ctr", "position"
}
GSC_URL_REQUIRED = {
    "date", "query", "landing_page", "impressions", "clicks", "ctr", "position",
    "product_snippet", "merchant_listing",
}
GA4_REQUIRED = {
    "event_date", "event_name", "page_location", "session_id", "engaged_session",
    "purchase_revenue", "device", "geo", "traffic_source", "ecommerce",
}

INTENT_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("comparison", (" vs ", " versus ", "compare", "difference")),
    ("replacement", ("alternative", "instead of", "replacement")),
    ("risk-safety", ("safe", "side effect", "risk", "danger")),
    ("use-case", ("for sleep", "for stress", "for sore", "for recovery", "for muscles")),
    ("decision-stage", ("best", "buy", "price", "review", "near me")),
]


class AgentFailure(RuntimeError):
    """Raised when a guardrail requires a safe stop."""


@dataclass
class ClassifiedFile:
    path: Path
    kind: str


@dataclass
class Opportunity:
    landing_page: str
    opportunity_type: str
    primary_query: str
    intent: str
    intent_confidence: float
    impressions: int
    clicks: int
    ctr: float
    position: float
    sessions: int
    engaged_sessions: int
    conversions: int
    revenue: float
    score: float
    confidence: str
    evidence: list[str]
    recommendation: str


class LocalTools:
    """Allowlisted file and report tools available to the agent."""

    def __init__(self, input_dir: Path, output_dir: Path) -> None:
        self.input_dir = input_dir.resolve()
        self.output_dir = output_dir.resolve()
        self.events: list[str] = []

    def log(self, message: str) -> None:
        self.events.append(message)
        print(f"[tool] {message}")

    def inspect_and_classify(self) -> dict[str, Path]:
        if not self.input_dir.is_dir():
            raise AgentFailure(f"Input directory does not exist: {self.input_dir}")

        files = sorted(path for path in self.input_dir.iterdir() if path.is_file())
        if not files:
            raise AgentFailure("No input files were found.")
        rejected = [path.name for path in files if path.suffix.lower() != ".csv"]
        if rejected:
            raise AgentFailure(f"Only CSV inputs are allowed. Rejected: {', '.join(rejected)}")

        self.log(f"Inspecting allowlisted folder: {self.input_dir}")
        classified: list[ClassifiedFile] = []
        for path in files:
            with path.open("r", encoding="utf-8-sig", newline="") as handle:
                reader = csv.reader(handle)
                try:
                    headers = {cell.strip() for cell in next(reader)}
                except StopIteration as exc:
                    raise AgentFailure(f"Empty CSV file: {path.name}") from exc

            if GSC_URL_REQUIRED.issubset(headers):
                kind = "gsc_url"
            elif GSC_SITE_REQUIRED.issubset(headers):
                kind = "gsc_site"
            elif GA4_REQUIRED.issubset(headers):
                kind = "ga4_events"
            else:
                kind = "unknown"
            self.log(f"Classified {path.name} as {kind}")
            classified.append(ClassifiedFile(path, kind))

        unknown = [item.path.name for item in classified if item.kind == "unknown"]
        if unknown:
            raise AgentFailure(f"Unknown input schema: {', '.join(unknown)}")

        selected: dict[str, Path] = {}
        for expected in ("gsc_site", "gsc_url", "ga4_events"):
            matches = [item.path for item in classified if item.kind == expected]
            if len(matches) != 1:
                raise AgentFailure(f"Expected exactly one {expected} file; found {len(matches)}.")
            selected[expected] = matches[0]
        self.log("Selected one approved parser for each required dataset.")
        return selected

    def read_csv(self, path: Path) -> list[dict[str, str]]:
        resolved = path.resolve()
        if resolved.parent != self.input_dir:
            raise AgentFailure(f"Path is outside the allowlisted folder: {path}")
        self.log(f"Reading {path.name}")
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            return [dict(row) for row in csv.DictReader(handle)]

    def write_json(self, name: str, payload: Any) -> Path:
        target = self._prepare_output() / name
        target.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        self.log(f"Wrote {target.name}")
        return target

    def write_text(self, name: str, content: str) -> Path:
        target = self._prepare_output() / name
        target.write_text(content, encoding="utf-8")
        self.log(f"Wrote {target.name}")
        return target

    def _prepare_output(self) -> Path:
        if self.output_dir == self.input_dir or self.input_dir in self.output_dir.parents:
            raise AgentFailure("Output must be separate from the source input folder.")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        return self.output_dir


class FlyRankOpportunityScout:
    """A bounded agent that selects local tools and produces a reviewable brief."""

    def __init__(self, tools: LocalTools, top_n: int = 5) -> None:
        self.tools = tools
        self.top_n = max(1, top_n)
        self.warnings: list[str] = []
        self.assumptions: list[str] = []

    def run(self) -> dict[str, Any]:
        print("FlyRank Opportunity Scout")
        print("Goal: produce a ranked, evidence-based content opportunity brief.")
        print("Mode: local-only; no network calls; source files remain read-only.\n")

        selected = self.tools.inspect_and_classify()
        gsc_site = self.tools.read_csv(selected["gsc_site"])
        gsc_url = self.tools.read_csv(selected["gsc_url"])
        ga4 = self.tools.read_csv(selected["ga4_events"])
        if not gsc_site or not gsc_url or not ga4:
            raise AgentFailure("All three datasets must contain at least one data row.")

        health = self._health(gsc_site, gsc_url, ga4)
        ga4_flat, invalid_json = self._flatten_ga4(ga4)
        if invalid_json:
            self.warnings.append(
                f"{invalid_json} malformed GA4 JSON value(s) were quarantined from nested-field analysis."
            )

        gsc_pages = self._aggregate_gsc(gsc_url)
        ga4_pages = self._aggregate_ga4(ga4_flat)
        opportunities = self._score(gsc_pages, ga4_pages)
        ranked = sorted(opportunities, key=lambda item: item.score, reverse=True)[: self.top_n]

        result = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "agent": "FlyRank Opportunity Scout",
            "dataset_health": health,
            "warnings": self.warnings,
            "assumptions": self.assumptions,
            "opportunities": [asdict(item) for item in ranked],
            "tool_log": self.tools.events,
        }
        json_path = self.tools.write_json("opportunity_report.json", result)
        markdown_path = self.tools.write_text("opportunity_brief.md", self._markdown(result))
        result["outputs"] = [str(json_path), str(markdown_path)]

        print("\nRun completed")
        print(
            f"Rows: {health['gsc_site_rows']} GSC site, {health['gsc_url_rows']} GSC URL, "
            f"{health['ga4_event_rows']} GA4 events"
        )
        for index, item in enumerate(ranked, 1):
            print(
                f"{index}. {item.landing_page} | {item.score:.1f}/100 | "
                f"{item.opportunity_type} | {item.confidence} confidence"
            )
        print("\nHuman review is required before any content change.")
        return result

    def _health(self, site: list[dict[str, str]], url: list[dict[str, str]], ga4: list[dict[str, str]]) -> dict[str, Any]:
        blank_site = sum(not row.get("query", "").strip() for row in site)
        blank_url = sum(not row.get("query", "").strip() for row in url)
        if blank_site or blank_url:
            self.assumptions.append(
                "Blank GSC queries are privacy-driven anonymized demand, retained in page totals and excluded from intent labeling."
            )
        return {
            "gsc_site_rows": len(site),
            "gsc_url_rows": len(url),
            "ga4_event_rows": len(ga4),
            "gsc_site_blank_query_rate": round(blank_site / len(site), 4),
            "gsc_url_blank_query_rate": round(blank_url / len(url), 4),
        }

    def _flatten_ga4(self, rows: list[dict[str, str]]) -> tuple[list[dict[str, Any]], int]:
        invalid = 0
        flattened: list[dict[str, Any]] = []
        for row_number, row in enumerate(rows, 2):
            item: dict[str, Any] = dict(row)
            for field in ("device", "geo", "traffic_source", "ecommerce"):
                raw = row.get(field, "").strip()
                try:
                    parsed = json.loads(raw) if raw else {}
                    if not isinstance(parsed, dict):
                        raise ValueError("JSON value is not an object")
                    item[f"{field}_json"] = parsed
                except (json.JSONDecodeError, ValueError):
                    invalid += 1
                    item[f"{field}_json"] = {"_quarantined": True, "_source_row": row_number}
            flattened.append(item)
        self.tools.log(f"Flattened GA4 JSON fields; quarantined values: {invalid}")
        return flattened, invalid

    def _aggregate_gsc(self, rows: list[dict[str, str]]) -> dict[str, dict[str, Any]]:
        pages: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"impressions": 0, "clicks": 0, "weighted_position": 0.0, "queries": defaultdict(int)}
        )
        for row in rows:
            page = normalize_path(row.get("landing_page", ""))
            if not page:
                raise AgentFailure("A GSC URL row is missing landing_page.")
            impressions = parse_int(row.get("impressions"), "impressions")
            clicks = parse_int(row.get("clicks"), "clicks")
            position = parse_float(row.get("position"), "position")
            query = row.get("query", "").strip() or "(anonymized)"
            entry = pages[page]
            entry["impressions"] += impressions
            entry["clicks"] += clicks
            entry["weighted_position"] += position * max(impressions, 1)
            entry["queries"][query] += impressions

        for entry in pages.values():
            entry["ctr"] = entry["clicks"] / entry["impressions"] if entry["impressions"] else 0.0
            entry["position"] = entry["weighted_position"] / max(entry["impressions"], 1)
            entry["queries"] = dict(entry["queries"])
        self.tools.log(f"Aggregated GSC demand for {len(pages)} landing pages.")
        return dict(pages)

    def _aggregate_ga4(self, rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
        pages: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"sessions": set(), "engaged": set(), "conversions": 0, "revenue": 0.0}
        )
        for row in rows:
            page = normalize_path(str(row.get("page_location", "")))
            if not page:
                continue
            session = str(row.get("session_id", "")).strip()
            if session:
                pages[page]["sessions"].add(session)
                if truthy(row.get("engaged_session")):
                    pages[page]["engaged"].add(session)
            if str(row.get("event_name", "")).strip() == "purchase":
                pages[page]["conversions"] += 1
                pages[page]["revenue"] += parse_float(str(row.get("purchase_revenue", "0") or "0"), "purchase_revenue")

        result = {
            page: {
                "sessions": len(entry["sessions"]),
                "engaged_sessions": len(entry["engaged"]),
                "conversions": entry["conversions"],
                "revenue": round(entry["revenue"], 2),
            }
            for page, entry in pages.items()
        }
        self.tools.log(f"Aggregated GA4 engagement for {len(result)} landing pages.")
        return result

    def _score(self, gsc_pages: dict[str, dict[str, Any]], ga4_pages: dict[str, dict[str, Any]]) -> list[Opportunity]:
        max_impressions = max((item["impressions"] for item in gsc_pages.values()), default=1)
        results: list[Opportunity] = []
        for page in sorted(set(gsc_pages) | set(ga4_pages)):
            gsc = gsc_pages.get(page, {"impressions": 0, "clicks": 0, "ctr": 0.0, "position": 0.0, "queries": {}})
            ga4 = ga4_pages.get(page, {"sessions": 0, "engaged_sessions": 0, "conversions": 0, "revenue": 0.0})
            impressions, clicks = int(gsc["impressions"]), int(gsc["clicks"])
            ctr, position = float(gsc["ctr"]), float(gsc["position"])
            sessions, engaged = int(ga4["sessions"]), int(ga4["engaged_sessions"])
            conversions, revenue = int(ga4["conversions"]), float(ga4["revenue"])
            engagement_rate = engaged / sessions if sessions else 0.0
            query = next(
                (name for name, _ in sorted(gsc.get("queries", {}).items(), key=lambda item: item[1], reverse=True) if name != "(anonymized)"),
                "(anonymized)",
            )
            intent, intent_confidence = classify_intent(query)

            demand = math.log1p(impressions) / math.log1p(max_impressions) * 25 if impressions else 0
            ranking = ranking_score(position)
            ctr_gap = max(0.0, min(20.0, (0.035 - ctr) / 0.035 * 20)) if impressions else 0
            engagement_gap = max(0.0, min(15.0, (0.65 - engagement_rate) / 0.65 * 15)) if sessions else 7.5
            alignment = 10.0 if intent != "anonymized" else 4.0
            business = 10.0 if any(token in page for token in ("product", "service", "solution")) else 6.0
            score = round(demand + ranking + ctr_gap + engagement_gap + alignment + business, 1)

            opportunity_type = choose_type(impressions, ctr, position, sessions, engagement_rate, conversions)
            confidence = "high"
            if impressions < 100 or sessions < 20:
                confidence = "low"
            elif page not in gsc_pages or page not in ga4_pages:
                confidence = "medium"

            evidence = [
                f"{impressions:,} impressions and {clicks:,} clicks",
                f"{ctr * 100:.2f}% CTR at average position {position:.1f}",
                f"{sessions:,} sessions with {engagement_rate * 100:.1f}% engaged-session rate",
            ]
            if revenue:
                evidence.append(f"{conversions} purchase event(s), revenue signal {revenue:.2f}")
            if page not in gsc_pages:
                evidence.append("GA4-only page: no false query-level match was created.")
            if page not in ga4_pages:
                evidence.append("GSC-only page: engagement evidence is incomplete.")

            results.append(Opportunity(
                landing_page=page,
                opportunity_type=opportunity_type,
                primary_query=query,
                intent=intent,
                intent_confidence=intent_confidence,
                impressions=impressions,
                clicks=clicks,
                ctr=round(ctr, 4),
                position=round(position, 2),
                sessions=sessions,
                engaged_sessions=engaged,
                conversions=conversions,
                revenue=revenue,
                score=score,
                confidence=confidence,
                evidence=evidence,
                recommendation=recommend(opportunity_type, confidence),
            ))
        self.tools.log(f"Scored {len(results)} landing-page opportunities.")
        return results

    def _markdown(self, result: dict[str, Any]) -> str:
        health = result["dataset_health"]
        lines = [
            "# FlyRank Opportunity Brief", "", "## Dataset health",
            f"- GSC site rows: {health['gsc_site_rows']}",
            f"- GSC URL rows: {health['gsc_url_rows']}",
            f"- GA4 event rows: {health['ga4_event_rows']}",
            f"- GSC site anonymized-query rate: {health['gsc_site_blank_query_rate']:.1%}",
            f"- GSC URL anonymized-query rate: {health['gsc_url_blank_query_rate']:.1%}",
            "", "## Ranked actions",
        ]
        for index, item in enumerate(result["opportunities"], 1):
            lines += [
                "", f"### {index}. {item['landing_page']} — {item['score']}/100",
                f"- Opportunity: {item['opportunity_type']}",
                f"- Primary query: {item['primary_query']}",
                f"- Intent: {item['intent']} ({item['intent_confidence']:.0%} confidence)",
                f"- Evidence confidence: {item['confidence']}",
                f"- Recommendation: {item['recommendation']}", "- Supporting evidence:",
            ]
            lines += [f"  - {evidence}" for evidence in item["evidence"]]
        lines += ["", "## Warnings and human review"]
        lines += [f"- {warning}" for warning in (result["warnings"] or ["No blocking warning was detected."])]
        lines += [
            "- Confirm reporting windows before comparing GSC and GA4.",
            "- Treat the score as prioritization support, not a causal impact prediction.",
            "- Review intent, page quality, brand context, and business priority before action.",
            "", "## Assumptions",
        ]
        lines += [f"- {assumption}" for assumption in (result["assumptions"] or ["No additional assumption was required."])]
        return "\n".join(lines) + "\n"


def normalize_path(value: str) -> str:
    raw = value.strip()
    if not raw:
        return ""
    parsed = urlparse(raw)
    path = parsed.path if parsed.scheme or parsed.netloc else raw
    if not path.startswith("/"):
        path = "/" + path
    return path.rstrip("/") or "/"


def parse_int(value: str | None, field: str) -> int:
    try:
        return int(float((value or "0").strip()))
    except ValueError as exc:
        raise AgentFailure(f"Invalid numeric value for {field}: {value!r}") from exc


def parse_float(value: str | None, field: str) -> float:
    try:
        return float((value or "0").strip())
    except ValueError as exc:
        raise AgentFailure(f"Invalid numeric value for {field}: {value!r}") from exc


def truthy(value: Any) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def classify_intent(query: str) -> tuple[str, float]:
    normalized = f" {query.lower().strip()} "
    if query == "(anonymized)" or not query.strip():
        return "anonymized", 1.0
    for label, terms in INTENT_RULES:
        if any(term in normalized for term in terms):
            return label, 0.88
    return "discovery-stage", 0.55


def ranking_score(position: float) -> float:
    if 3 <= position <= 15:
        return max(8.0, 20.0 - abs(position - 8) * 1.2)
    if 0 < position < 3:
        return 4.0
    return 6.0 if position > 15 else 0.0


def choose_type(impressions: int, ctr: float, position: float, sessions: int, engagement: float, conversions: int) -> str:
    if conversions > 0 and ctr >= 0.03 and engagement >= 0.65:
        return "protected strong performer"
    if impressions >= 500 and ctr < 0.02 and 3 <= position <= 15:
        return "CTR unlock"
    if 3 <= position <= 15:
        return "striking distance"
    if sessions >= 50 and engagement < 0.45:
        return "intent mismatch review"
    if impressions > 0 and sessions == 0:
        return "measurement or content gap"
    return "monitor and collect evidence"


def recommend(kind: str, confidence: str) -> str:
    actions = {
        "protected strong performer": "Monitor the page and avoid an unnecessary rewrite.",
        "CTR unlock": "Review title, meta description, and SERP presentation while preserving intent.",
        "striking distance": "Strengthen the page around demonstrated query intent and internal links.",
        "intent mismatch review": "Compare page content with ranking intent before refreshing or splitting it.",
        "measurement or content gap": "Check analytics coverage and whether a dedicated page is required.",
        "monitor and collect evidence": "Collect a longer reporting window before prioritizing work.",
    }
    suffix = " Treat this as provisional because the evidence sample is small." if confidence == "low" else ""
    return actions[kind] + suffix


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run FlyRank Opportunity Scout.")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--top", type=int, default=5)
    args = parser.parse_args(argv)
    try:
        FlyRankOpportunityScout(LocalTools(args.input, args.output), args.top).run()
        return 0
    except AgentFailure as exc:
        print(f"\nAgent stopped safely: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
